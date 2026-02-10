import { describe, it, expect } from "vitest";

// Pure utility functions duplicated for testing — canonical source is packages/api/src/utils/mentions.ts
function extractMentionedMemberIds(commentHtml: string): string[] {
  const mentionRegex = /data-type="mention"\s+data-id="([^"]+)"/g;
  const ids: string[] = [];
  let match;
  while ((match = mentionRegex.exec(commentHtml)) !== null) {
    if (match[1]) {
      ids.push(match[1]);
    }
  }
  return [...new Set(ids)];
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "").trim();
}

describe("extractMentionedMemberIds", () => {
  it("extracts a single member ID from mention span", () => {
    const html =
      '<p>Hello <span data-type="mention" data-id="abc123def456" data-label="Alice">@Alice</span></p>';
    expect(extractMentionedMemberIds(html)).toEqual(["abc123def456"]);
  });

  it("extracts multiple different member IDs", () => {
    const html =
      '<p><span data-type="mention" data-id="abc123" data-label="Alice">@Alice</span> and <span data-type="mention" data-id="def456" data-label="Bob">@Bob</span></p>';
    expect(extractMentionedMemberIds(html)).toEqual(["abc123", "def456"]);
  });

  it("deduplicates repeated mentions of the same member", () => {
    const html =
      '<span data-type="mention" data-id="abc123" data-label="Alice">@Alice</span> hello <span data-type="mention" data-id="abc123" data-label="Alice">@Alice</span>';
    expect(extractMentionedMemberIds(html)).toEqual(["abc123"]);
  });

  it("returns empty array for plain text with no mentions", () => {
    expect(extractMentionedMemberIds("<p>Hello world</p>")).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(extractMentionedMemberIds("")).toEqual([]);
  });

  it("handles mention spans with extra whitespace in attributes", () => {
    const html =
      '<span data-type="mention"  data-id="abc123" data-label="Alice">@Alice</span>';
    expect(extractMentionedMemberIds(html)).toEqual(["abc123"]);
  });
});

describe("stripHtml", () => {
  it("strips HTML tags from a string", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("handles mention spans", () => {
    const html =
      '<p>Hey <span data-type="mention" data-id="abc" data-label="Alice">@Alice</span> check this</p>';
    expect(stripHtml(html)).toBe("Hey @Alice check this");
  });

  it("returns empty string for empty input", () => {
    expect(stripHtml("")).toBe("");
  });

  it("returns plain text unchanged", () => {
    expect(stripHtml("Hello world")).toBe("Hello world");
  });

  it("trims whitespace", () => {
    expect(stripHtml("  <p>Hello</p>  ")).toBe("Hello");
  });
});
