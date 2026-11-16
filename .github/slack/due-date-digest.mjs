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
  if (!BOT || !email) return `*${name}*`;
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
  return id ? `<@${id}>` : `*${name}*`;
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

async function line(item, extra) {
  const { card, list, board } = item;
  const link = `<${BASE}/cards/${card.publicId}|${escape(card.title)}>`;
  const people = card.members?.length
    ? (await Promise.all(card.members.map(who))).join(", ")
    : "_sem responsável_";
  return `• ${link} — ${escape(board.name)} › ${escape(list.name)} — ${extra} — ${people}`;
}

const parts = [];
if (dueTomorrow.length) {
  parts.push(`:alarm_clock: *Vencem amanhã (${shortDate(new Date(Date.now() + 86_400_000))})* — ${dueTomorrow.length}`);
  for (const item of dueTomorrow) parts.push(await line(item, "vence amanhã"));
}
if (overdue.length) {
  if (parts.length) parts.push("");
  parts.push(`:rotating_light: *Vencidos* — ${overdue.length}`);
  overdue.sort((a, b) => a.due - b.due);
  for (const item of overdue) {
    const days = daysBetween(item.key, today);
    parts.push(await line(item, `venceu ${shortDate(item.due)} (há ${days} dia${days === 1 ? "" : "s"})`));
  }
}
const text = parts.join("\n");

if (DRY) {
  console.log(text);
  process.exit(0);
}

const res = await fetch(HOOK, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ text }),
});
console.log(`Slack: ${res.status}`);
if (!res.ok) process.exit(1);
