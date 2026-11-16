#!/usr/bin/env node
// Daily Slack digest of cards due tomorrow and overdue cards.
//
// Reads every board the API key can see through the public REST API and
// posts one message per run to a Slack-compatible incoming webhook.
// Cards in done or cancelled lists are skipped.
//
// Env:
//   KAN_API_KEY        Kan API key (required)
//   KAN_BASE_URL       default https://kanban.projetonucleo.com
//   SLACK_WEBHOOK_URL  incoming webhook; without it (or with --dry-run) the
//                      message is printed instead of posted
//   SLACK_BOT_TOKEN    optional: tags responsible people (users.lookupByEmail)
//   SLACK_API_URL      default https://slack.projetonucleo.com/api
//   TIME_ZONE          default America/Sao_Paulo

const BASE = (process.env.KAN_BASE_URL ?? "https://kanban.projetonucleo.com").replace(/\/$/, "");
const KEY = process.env.KAN_API_KEY;
const HOOK = process.env.SLACK_WEBHOOK_URL;
const BOT = process.env.SLACK_BOT_TOKEN;
const SLACK_API = (process.env.SLACK_API_URL ?? "https://slack.projetonucleo.com/api").replace(/\/$/, "");
const TZ = process.env.TIME_ZONE ?? "America/Sao_Paulo";
const DRY = process.argv.includes("--dry-run") || !HOOK;

if (!KEY) {
  console.error("KAN_API_KEY is required");
  process.exit(1);
}

const api = async (path) => {
  const res = await fetch(`${BASE}/api/v1${path}`, {
    headers: { Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`GET ${path} -> ${res.status}`);
  return res.json();
};

// Calendar day (YYYY-MM-DD) of a date in the configured time zone.
const dayKey = (date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
const shortDate = (date) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(date);
const daysBetween = (fromKey, toKey) =>
  Math.round((Date.parse(toKey) - Date.parse(fromKey)) / 86_400_000);

const escape = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const closedList = (name) =>
  /conclu|done|complete|finaliz|entregue|cancel/.test(
    name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase(),
  );

const mentionCache = new Map();
async function who(member) {
  const name = escape(member.user?.name?.trim() || member.user?.email || member.email);
  const email = member.user?.email ?? member.email;
  if (!BOT || !email) return `@${name}`;
  if (!mentionCache.has(email)) {
    try {
      const res = await fetch(`${SLACK_API}/users.lookupByEmail?email=${encodeURIComponent(email)}`, {
        headers: { Authorization: `Bearer ${BOT}` },
      });
      const body = await res.json();
      mentionCache.set(email, body.ok && body.user?.id ? body.user.id : null);
    } catch {
      mentionCache.set(email, null);
    }
  }
  const id = mentionCache.get(email);
  return id ? `<@${id}>` : `@${name}`;
}

const today = dayKey(new Date());
const tomorrow = dayKey(new Date(Date.now() + 86_400_000));

const dueTomorrow = [];
const overdue = [];

const workspaces = await api("/workspaces");
for (const entry of workspaces) {
  const workspace = entry.workspace ?? entry;
  const boards = await api(`/workspaces/${workspace.publicId}/boards`);
  for (const summary of boards) {
    const board = await api(`/boards/${summary.publicId}`);
    for (const list of board.lists ?? []) {
      if (closedList(list.name)) continue;
      for (const card of list.cards ?? []) {
        if (!card.dueDate) continue;
        const due = new Date(card.dueDate);
        const key = dayKey(due);
        const item = { card, list, board, workspace, due, key };
        if (key === tomorrow) dueTomorrow.push(item);
        else if (key < today) overdue.push(item);
      }
    }
  }
}

if (!dueTomorrow.length && !overdue.length) {
  console.log("Nada vencendo amanhã nem vencido.");
  process.exit(0);
}

// --- Message (Slack Block Kit + coloured attachments) ---------------------
// No cap: every card is listed, so no "+ N" line is needed.
const MAX_PER_SECTION = Infinity;
// Same tones as the design: deep red for overdue, amber-brown for tomorrow.
const COLOURS = { overdue: "#991B1B", tomorrow: "#92400E" };

const people = async (card) =>
  card.members?.length
    ? (await Promise.all(card.members.map(who))).join(" ")
    : "_sem responsável_";

// One coloured attachment per card, in the classic attachment format
// (title + text) that Slack-compatible clients such as SnackCraft render.
async function cardAttachment(item, when, colour) {
  const { card, list, board } = item;
  // Bold, not inline code: SnackCraft paints code spans red.
  const boardTag = `*${escape(board.name.toUpperCase())}*`;
  const details = [escape(list.name), await people(card), when].filter(Boolean);
  return {
    color: colour,
    fallback: card.title,
    title: card.title,
    title_link: `${BASE}/cards/${card.publicId}`,
    text: `${boardTag}  ${details.join("  ·  ")}`,
    mrkdwn_in: ["text"],
  };
}

const sectionTitle = (text, colour) => ({
  color: colour,
  fallback: text,
  text,
  mrkdwn_in: ["text"],
});
const more = (count, noun, colour) => ({
  color: colour,
  fallback: `+ ${count} ${noun}`,
  text: `_+ ${count} ${noun} — veja no Kanban_`,
  mrkdwn_in: ["text"],
});

overdue.sort((a, b) => a.due - b.due);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const summary = [
  overdue.length && plural(overdue.length, "vencido", "vencidos"),
  dueTomorrow.length &&
    plural(dueTomorrow.length, "vence amanhã", "vencem amanhã"),
]
  .filter(Boolean)
  .join(" · ");

const attachments = [];
if (overdue.length) {
  attachments.push(
    sectionTitle(`⚠️ *Vencidos (${overdue.length})*`, COLOURS.overdue),
  );
  for (const item of overdue.slice(0, MAX_PER_SECTION)) {
    const days = daysBetween(item.key, today);
    attachments.push(
      await cardAttachment(
        item,
        `venceu ${shortDate(item.due)} (${plural(days, "dia", "dias")} de atraso)`,
        COLOURS.overdue,
      ),
    );
  }
  if (overdue.length > MAX_PER_SECTION)
    attachments.push(
      more(overdue.length - MAX_PER_SECTION, "vencidos", COLOURS.overdue),
    );
}
if (dueTomorrow.length) {
  attachments.push(
    sectionTitle(
      `⏰ *Vencem amanhã, ${shortDate(new Date(Date.now() + 86_400_000))} (${dueTomorrow.length})*`,
      COLOURS.tomorrow,
    ),
  );
  for (const item of dueTomorrow.slice(0, MAX_PER_SECTION))
    attachments.push(await cardAttachment(item, "", COLOURS.tomorrow));
  if (dueTomorrow.length > MAX_PER_SECTION)
    attachments.push(
      more(dueTomorrow.length - MAX_PER_SECTION, "vencem amanhã", COLOURS.tomorrow),
    );
}

const title = `Prazos do kanban · ${shortDate(new Date())}`;

// Default layout: coloured side bar per card, title as the link and the
// details in the attachment footer (small type). Section titles become the
// pretext of their first card, so they sit above the bars like the design.
const plain = (s) => s.replace(/\*([^*]+)\*/g, "$1").replace(/_([^_]+)_/g, "$1");
const asFooterAttachments = (items) => {
  const out = [];
  let pretext = null;
  for (const a of items) {
    if (a.title) {
      out.push({
        color: a.color,
        fallback: a.fallback,
        title: a.title,
        title_link: a.title_link,
        footer: plain(a.text.replace(/^\*([^*]+)\*/, "[$1]")),
        ...(pretext && { pretext, mrkdwn_in: ["pretext"] }),
      });
      pretext = null;
    } else if (a.text.startsWith("_")) {
      out.push({ color: a.color, fallback: a.fallback, footer: plain(a.text) });
    } else {
      pretext = a.text;
    }
  }
  return out;
};

// LAYOUT=blocks: top-level Block Kit blocks (small type, no side bars).
// LAYOUT=attachments: bars with the details as regular (larger) text.
const asBlocks = (items) =>
  items.flatMap((a) => {
    if (a.title)
      return [
        {
          type: "section",
          text: { type: "mrkdwn", text: `*<${a.title_link}|${escape(a.title)}>*` },
        },
        {
          type: "context",
          elements: [
            // Board tag stays bold: SnackCraft paints code spans red.
            { type: "mrkdwn", text: a.text },
          ],
        },
      ];
    if (a.text.startsWith("_"))
      return [{ type: "context", elements: [{ type: "mrkdwn", text: a.text }] }];
    return [{ type: "section", text: { type: "mrkdwn", text: a.text } }];
  });

const message =
  (process.env.LAYOUT ?? "footer") === "footer"
    ? {
        text: `${title} — ${summary}`,
        blocks: [{ type: "header", text: { type: "plain_text", text: title } }],
        attachments: asFooterAttachments(attachments),
      }
    : process.env.LAYOUT === "blocks"
    ? {
        text: `${title} — ${summary}`,
        blocks: [
          { type: "header", text: { type: "plain_text", text: title } },
          { type: "context", elements: [{ type: "mrkdwn", text: summary }] },
          ...asBlocks(attachments),
        ],
      }
    : {
        text: `${title} — ${summary}`, // notification / fallback text
        blocks: [
          { type: "header", text: { type: "plain_text", text: title } },
          { type: "context", elements: [{ type: "mrkdwn", text: summary }] },
        ],
        attachments,
      };

if (DRY) {
  console.log(JSON.stringify(message, null, 2));
  process.exit(0);
}

const res = await fetch(HOOK, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(message),
});
console.log(`Slack: ${res.status}`);
if (!res.ok) process.exit(1);
