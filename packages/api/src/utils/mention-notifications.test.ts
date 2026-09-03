import { describe, expect, it } from "vitest";

import { getNewMentionPublicIds } from "./mention-notifications";

const mention = (publicId: string) =>
  `<span data-type="mention" data-id="${publicId}" data-label="Member">@Member</span>`;

describe("getNewMentionPublicIds", () => {
  const firstMemberPublicId = "memberPublic1";
  const secondMemberPublicId = "memberPublic2";

  it("returns unique mentions for newly created content", () => {
    expect(
      getNewMentionPublicIds(
        null,
        `${mention(firstMemberPublicId)} ${mention(firstMemberPublicId)}`,
      ),
    ).toEqual([firstMemberPublicId]);
  });

  it("ignores mentions preserved while editing surrounding content", () => {
    expect(
      getNewMentionPublicIds(
        `Before ${mention(firstMemberPublicId)}`,
        `After ${mention(firstMemberPublicId)}`,
      ),
    ).toEqual([]);
  });

  it("returns only mentions added by an edit", () => {
    expect(
      getNewMentionPublicIds(
        mention(firstMemberPublicId),
        `${mention(firstMemberPublicId)} ${mention(secondMemberPublicId)}`,
      ),
    ).toEqual([secondMemberPublicId]);
  });

  it("treats a removed and later re-added mention as new", () => {
    expect(getNewMentionPublicIds(mention(firstMemberPublicId), "")).toEqual(
      [],
    );
    expect(getNewMentionPublicIds("", mention(firstMemberPublicId))).toEqual([
      firstMemberPublicId,
    ]);
  });
});
