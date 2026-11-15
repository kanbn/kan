import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as userRepo from "@kan/db/repository/user.repo";
import * as sharedUtils from "@kan/shared/utils";

import * as sessionUtil from "../../../common/session.util.js";
import { UserService } from "../user.service.js";

const dbUser = {
  id: "user_1",
  email: "henry@kan.bn",
  name: "Henry",
  image: "avatars/user_1.png",
  stripeCustomerId: null,
  hasPassword: false,
  hasMagicLinkAccount: true,
  apiKeys: [{ id: 3, prefix: "kan_", key: "secret-key-material" }],
};

let service: UserService;

beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(sharedUtils, "generateAvatarUrl").mockResolvedValue(
    "https://signed/avatar.png",
  );
  service = new UserService();
});

describe("UserService.getUser", () => {
  it("returns the profile with a signed avatar URL and never the raw API key", async () => {
    vi.spyOn(userRepo, "getById").mockResolvedValue(dbUser);

    const result = await service.getUser({ userId: "user_1" });

    expect(result).toEqual({
      id: "user_1",
      email: "henry@kan.bn",
      name: "Henry",
      image: "https://signed/avatar.png",
      stripeCustomerId: null,
      hasPassword: false,
      hasMagicLinkAccount: true,
      apiKey: { id: 3, prefix: "kan_" },
    });
    expect(JSON.stringify(result)).not.toContain("secret-key-material");
  });

  it("throws NOT_FOUND when the user does not exist", async () => {
    vi.spyOn(userRepo, "getById").mockResolvedValue(undefined);

    await expect(service.getUser({ userId: "user_1" })).rejects.toMatchObject({
      status: 404,
    });
  });
});

describe("UserService.update", () => {
  it("returns only name and signed image, not stripeCustomerId", async () => {
    vi.spyOn(userRepo, "update").mockResolvedValue({
      name: "New",
      image: "avatars/user_1.png",
      stripeCustomerId: "cus_123",
    });

    const result = await service.update({ userId: "user_1", name: "New" });

    expect(result).toEqual({ name: "New", image: "https://signed/avatar.png" });
  });
});

describe("UserService.setPassword", () => {
  it("sets the password via better-auth with the caller's headers", async () => {
    vi.spyOn(userRepo, "getById").mockResolvedValue(dbUser);
    const setPassword = vi
      .spyOn(sessionUtil, "setUserPassword")
      .mockResolvedValue(undefined as never);
    const headers = new Headers({ cookie: "session=abc" });

    const result = await service.setPassword({
      userId: "user_1",
      newPassword: "hunter2hunter2",
      headers,
    });

    expect(result).toEqual({ success: true });
    expect(setPassword).toHaveBeenCalledWith(headers, "hunter2hunter2");
  });

  it("throws BAD_REQUEST when the user already has a password", async () => {
    vi.spyOn(userRepo, "getById").mockResolvedValue({
      ...dbUser,
      hasPassword: true,
    });
    const setPassword = vi.spyOn(sessionUtil, "setUserPassword");

    await expect(
      service.setPassword({
        userId: "user_1",
        newPassword: "hunter2hunter2",
        headers: new Headers(),
      }),
    ).rejects.toMatchObject({ status: 400 });
    expect(setPassword).not.toHaveBeenCalled();
  });

  it("throws INTERNAL_SERVER_ERROR when better-auth fails", async () => {
    vi.spyOn(userRepo, "getById").mockResolvedValue(dbUser);
    vi.spyOn(sessionUtil, "setUserPassword").mockRejectedValue(
      new Error("boom"),
    );

    await expect(
      service.setPassword({
        userId: "user_1",
        newPassword: "hunter2hunter2",
        headers: new Headers(),
      }),
    ).rejects.toMatchObject({ status: 500 });
  });
});

describe("UserService.uploadAvatar", () => {
  const upload = (contentType: string, data: Buffer, maxBytes = 10) =>
    service.uploadAvatar({
      userId: "user_1",
      body: Readable.from([data]),
      filename: "me pic.png",
      contentType,
      maxBytes,
    });

  beforeEach(() => vi.stubEnv("NEXT_PUBLIC_AVATAR_BUCKET_NAME", "avatars"));
  afterEach(() => vi.unstubAllEnvs());

  it("stores the image under the user's prefix and saves the key", async () => {
    const put = vi.spyOn(sharedUtils, "uploadObject").mockResolvedValue();
    const update = vi
      .spyOn(userRepo, "update")
      .mockResolvedValue(undefined);

    await upload("image/png", Buffer.from("abc"));

    expect(put).toHaveBeenCalledWith(
      "avatars",
      "user_1/me_pic.png",
      Buffer.from("abc"),
      "image/png",
      3,
    );
    expect(update).toHaveBeenCalledWith(expect.anything(), "user_1", {
      image: "user_1/me_pic.png",
    });
  });

  it("rejects non-image types and oversized bodies", async () => {
    const put = vi.spyOn(sharedUtils, "uploadObject").mockResolvedValue();

    await expect(upload("text/html", Buffer.from("a"))).rejects.toMatchObject({
      status: 400,
    });
    await expect(upload("image/png", Buffer.alloc(11))).rejects.toMatchObject({
      status: 413,
    });
    expect(put).not.toHaveBeenCalled();
  });
});
