const mailpitBaseUrl = `http://127.0.0.1:${process.env.MAILPIT_HTTP_PORT ?? "8025"}`;

interface MailpitMessageSummary {
  ID: string;
}

interface MailpitSearchResponse {
  messages: MailpitMessageSummary[];
}

interface MailpitMessage {
  HTML: string;
}

async function searchMessages(email: string): Promise<MailpitMessageSummary[]> {
  const response = await fetch(
    `${mailpitBaseUrl}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`,
  );

  if (!response.ok) {
    throw new Error(`Mailpit search failed with status ${response.status}`);
  }

  const { messages } = (await response.json()) as MailpitSearchResponse;
  return messages;
}

async function waitForMessageHtml(email: string): Promise<string> {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    const messages = await searchMessages(email);
    const latest = messages[0];

    if (latest) {
      const messageResponse = await fetch(
        `${mailpitBaseUrl}/api/v1/message/${latest.ID}`,
      );
      const message = (await messageResponse.json()) as MailpitMessage;
      return message.HTML;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  throw new Error(`No Mailpit message arrived for ${email} within 15s`);
}

export async function getMagicLinkUrl(email: string): Promise<string> {
  const html = await waitForMessageHtml(email);
  const match = /href="([^"]*\/magic-link\/verify[^"]*)"/.exec(html);

  if (!match?.[1]) {
    throw new Error(`Could not find a magic-link URL in the email to ${email}`);
  }

  return match[1].replace(/&amp;/g, "&");
}

export async function clearMailpitInbox() {
  await fetch(`${mailpitBaseUrl}/api/v1/messages`, { method: "DELETE" });
}

export async function getMailpitMessageCount(email: string): Promise<number> {
  return (await searchMessages(email)).length;
}

export async function waitForMailpitMessageCount(
  email: string,
  expectedCount: number,
) {
  const deadline = Date.now() + 15_000;

  while (Date.now() < deadline) {
    const count = await getMailpitMessageCount(email);
    if (count === expectedCount) return;
    if (count > expectedCount) {
      throw new Error(
        `Expected ${expectedCount} messages for ${email}, but found ${count}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Expected ${expectedCount} messages for ${email} within 15s`);
}

export async function expectMailpitMessageCountToRemain(
  email: string,
  expectedCount: number,
  durationMs = 1_500,
) {
  const deadline = Date.now() + durationMs;

  while (Date.now() < deadline) {
    const count = await getMailpitMessageCount(email);
    if (count !== expectedCount) {
      throw new Error(
        `Expected ${expectedCount} messages for ${email}, but found ${count}`,
      );
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}
