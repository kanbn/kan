// Minimal hand-rolled iCalendar (RFC 5545) serializer for the personal
// due-date feed. Avoids pulling in an ical library: the format we need is small
// (one all-day-ish VEVENT per card), but the three usual footguns — text
// escaping, 75-octet line folding, and CRLF line endings — are handled here.

export interface CalendarCard {
  publicId: string;
  title: string;
  dueDate: Date | null;
  boardPublicId: string;
  boardName: string;
  listName: string | null;
  labels: { name: string; colourCode: string | null }[];
}

const EVENT_DURATION_MS = 60 * 60 * 1000; // each due date becomes a 1-hour block

// Format a Date as a UTC iCalendar datetime: YYYYMMDDTHHMMSSZ
const toICalUTC = (date: Date): string => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
      date.getUTCDate(),
    )}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(
      date.getUTCSeconds(),
    )}Z`
  );
};

// Escape text per RFC 5545 §3.3.11: backslash, semicolon, comma, newline.
const escapeText = (value: string): string =>
  value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");

// Fold a content line to 75 octets, continuing with CRLF + single space.
const foldLine = (line: string): string => {
  if (line.length <= 75) return line;
  const chunks: string[] = [line.slice(0, 75)];
  let i = 75;
  while (i < line.length) {
    chunks.push(line.slice(i, i + 74));
    i += 74;
  }
  return chunks.join("\r\n ");
};

const property = (key: string, value: string): string =>
  foldLine(`${key}:${value}`);

export const renderICal = (
  cards: CalendarCard[],
  baseUrl: string,
  generatedAt: Date = new Date(),
): string => {
  const appUrl = baseUrl.replace(/\/$/, "");
  const now = toICalUTC(generatedAt);

  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//banana//calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    property("X-WR-CALNAME", "Banana"),
    property("X-PUBLISHED-TTL", "PT1H"),
  ];

  for (const card of cards) {
    if (!card.dueDate) continue;
    const start = card.dueDate;
    const end = new Date(start.getTime() + EVENT_DURATION_MS);

    const location = [card.boardName, card.listName]
      .filter(Boolean)
      .join(" › ");
    const description = `${location}\n${appUrl}/cards/${card.publicId}`;
    const categories = card.labels
      .map((label) => escapeText(label.name))
      .filter(Boolean)
      .join(",");

    lines.push("BEGIN:VEVENT");
    // Stable UID keyed on the card's publicId: lets calendar clients UPDATE an
    // event when a due date changes rather than creating a duplicate.
    lines.push(property("UID", `${card.publicId}@banana`));
    lines.push(property("DTSTAMP", now));
    lines.push(property("DTSTART", toICalUTC(start)));
    lines.push(property("DTEND", toICalUTC(end)));
    lines.push(property("SUMMARY", escapeText(card.title)));
    lines.push(property("DESCRIPTION", escapeText(description)));
    if (location) lines.push(property("LOCATION", escapeText(location)));
    if (categories) lines.push(property("CATEGORIES", categories));
    lines.push(property("STATUS", "CONFIRMED"));
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");

  return `${lines.join("\r\n")}\r\n`;
};
