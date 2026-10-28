import { describe, expect, it } from "vitest";

import { normalizeDescription, stripHtml } from "./sanitize";

describe("stripHtml", () => {
  it("removes tags and trims surrounding whitespace", () => {
    expect(stripHtml("<p>Hello <b>world</b></p>")).toBe("Hello world");
  });

  it("returns an empty string for tag-only content", () => {
    expect(stripHtml("<p></p>")).toBe("");
  });
});

describe("normalizeDescription", () => {
  it("returns null for null, undefined, and empty string", () => {
    expect(normalizeDescription(null)).toBeNull();
    expect(normalizeDescription(undefined)).toBeNull();
    expect(normalizeDescription("")).toBeNull();
  });

  it("returns null for whitespace-only content", () => {
    expect(normalizeDescription(" ")).toBeNull();
    expect(normalizeDescription("\n\t")).toBeNull();
  });

  it("returns null for HTML that strips down to nothing", () => {
    expect(normalizeDescription("<p></p>")).toBeNull();
    expect(normalizeDescription("<br>")).toBeNull();
    expect(normalizeDescription("<p></p><p></p><p></p>")).toBeNull();
    expect(normalizeDescription("<h1></h1>")).toBeNull();
    expect(normalizeDescription("<blockquote><p></p></blockquote>")).toBeNull();
    expect(normalizeDescription("<pre><code></code></pre>")).toBeNull();
  });

  it("returns null for empty content that carries an unrelated data- attribute", () => {
    expect(
      normalizeDescription(
        '<ul class="tight" data-tight="true"><li><p></p></li></ul>',
      ),
    ).toBeNull();
  });

  it("preserves real text content unchanged", () => {
    const html = "<p>This card needs a detailed description.</p>";
    expect(normalizeDescription(html)).toBe(html);
  });

  it("preserves a YouTube embed even with no visible text", () => {
    const html =
      '<div data-youtube="" data-video-id="1qJEZVr6eXE" data-show-embed="true"></div>';
    expect(normalizeDescription(html)).toBe(html);
  });

  it("preserves a pasted image even with no visible text", () => {
    const html = '<img src="data:image/png;base64,iVBORw0KG..." alt="">';
    expect(normalizeDescription(html)).toBe(html);
  });

  it.each([
    "<iframe></iframe>",
    "<video></video>",
    "<audio></audio>",
    "<object></object>",
    "<embed>",
    "<svg></svg>",
  ])("preserves %s even with no visible text", (html) => {
    expect(normalizeDescription(html)).toBe(html);
  });
});
