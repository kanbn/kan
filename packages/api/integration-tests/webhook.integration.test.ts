import { describe, it, expect, beforeEach } from "vitest";

import * as webhookRepo from "@kan/db/repository/webhook.repo";
import { createTestDb, seedTestData, type TestDbClient } from "./test-db";

describe("webhook repository integration tests", () => {
  let db: TestDbClient;
  let testUser: { id: string; name: string | null };
  let testWorkspace: { id: number; publicId: string };

  beforeEach(async () => {
    db = await createTestDb();
    const seeded = await seedTestData(db);
    testUser = seeded.user;
    testWorkspace = seeded.workspace;
  });

  describe("create", () => {
    it("creates a webhook with all fields", async () => {
      const webhook = await webhookRepo.create(db, {
        workspaceId: testWorkspace.id,
        name: "My Webhook",
        url: "https://example.com/webhook",
        secret: "my-secret",
        events: ["card.created", "card.updated"],
        createdBy: testUser.id,
      });

      expect(webhook).not.toBeNull();
      expect(webhook!.name).toBe("My Webhook");
      expect(webhook!.url).toBe("https://example.com/webhook");
      expect(webhook!.events).toEqual(["card.created", "card.updated"]);
      expect(webhook!.active).toBe(true);
      expect(webhook!.publicId).toMatch(/^[a-zA-Z0-9]{12}$/);
    });

    it("creates a webhook without secret", async () => {
      const webhook = await webhookRepo.create(db, {
        workspaceId: testWorkspace.id,
        name: "No Secret Webhook",
        url: "https://example.com/webhook",
        events: ["card.deleted"],
        createdBy: testUser.id,
      });

      expect(webhook).not.toBeNull();
      expect(webhook!.name).toBe("No Secret Webhook");
    });
  });

  describe("getByPublicId", () => {
    it("retrieves a webhook by public ID", async () => {
      const created = await webhookRepo.create(db, {
        workspaceId: testWorkspace.id,
        name: "Test Webhook",
        url: "https://example.com/webhook",
        events: ["card.created"],
        createdBy: testUser.id,
      });

      const retrieved = await webhookRepo.getByPublicId(db, created!.publicId);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.publicId).toBe(created!.publicId);
      expect(retrieved!.name).toBe("Test Webhook");
    });

    it("returns null for non-existent public ID", async () => {
      const retrieved = await webhookRepo.getByPublicId(db, "nonexistent12");

      expect(retrieved).toBeNull();
    });
  });

  describe("getAllByWorkspaceId", () => {
    it("returns all webhooks for a workspace", async () => {
      await webhookRepo.create(db, {
        workspaceId: testWorkspace.id,
        name: "Webhook 1",
        url: "https://example.com/webhook1",
        events: ["card.created"],
        createdBy: testUser.id,
      });

      await webhookRepo.create(db, {
        workspaceId: testWorkspace.id,
        name: "Webhook 2",
        url: "https://example.com/webhook2",
        events: ["card.updated"],
        createdBy: testUser.id,
      });

      const webhooks = await webhookRepo.getAllByWorkspaceId(db, testWorkspace.id);

      expect(webhooks).toHaveLength(2);
      expect(webhooks.map((w) => w.name)).toContain("Webhook 1");
      expect(webhooks.map((w) => w.name)).toContain("Webhook 2");
    });

    it("returns empty array for workspace with no webhooks", async () => {
      const webhooks = await webhookRepo.getAllByWorkspaceId(db, testWorkspace.id);

      expect(webhooks).toEqual([]);
    });
  });

  describe("getActiveByWorkspaceId", () => {
    it("returns only active webhooks", async () => {
      const active = await webhookRepo.create(db, {
        workspaceId: testWorkspace.id,
        name: "Active Webhook",
        url: "https://example.com/active",
        events: ["card.created"],
        createdBy: testUser.id,
      });

      const inactive = await webhookRepo.create(db, {
        workspaceId: testWorkspace.id,
        name: "Inactive Webhook",
        url: "https://example.com/inactive",
        events: ["card.created"],
        createdBy: testUser.id,
      });

      // Deactivate one webhook
      await webhookRepo.update(db, inactive!.publicId, { active: false });

      const activeWebhooks = await webhookRepo.getActiveByWorkspaceId(db, testWorkspace.id);

      expect(activeWebhooks).toHaveLength(1);
      // getActiveByWorkspaceId returns only publicId, url, secret, events
      expect(activeWebhooks[0]!.url).toBe("https://example.com/active");
      expect(activeWebhooks[0]!.publicId).toBe(active!.publicId);
    });
  });

  describe("update", () => {
    it("updates webhook name", async () => {
      const created = await webhookRepo.create(db, {
        workspaceId: testWorkspace.id,
        name: "Original Name",
        url: "https://example.com/webhook",
        events: ["card.created"],
        createdBy: testUser.id,
      });

      const updated = await webhookRepo.update(db, created!.publicId, {
        name: "Updated Name",
      });

      expect(updated).not.toBeNull();
      expect(updated!.name).toBe("Updated Name");
      expect(updated!.url).toBe("https://example.com/webhook"); // Unchanged
    });

    it("updates webhook events", async () => {
      const created = await webhookRepo.create(db, {
        workspaceId: testWorkspace.id,
        name: "Test Webhook",
        url: "https://example.com/webhook",
        events: ["card.created"],
        createdBy: testUser.id,
      });

      const updated = await webhookRepo.update(db, created!.publicId, {
        events: ["card.created", "card.updated", "card.deleted"],
      });

      expect(updated!.events).toEqual(["card.created", "card.updated", "card.deleted"]);
    });

    it("updates webhook active status", async () => {
      const created = await webhookRepo.create(db, {
        workspaceId: testWorkspace.id,
        name: "Test Webhook",
        url: "https://example.com/webhook",
        events: ["card.created"],
        createdBy: testUser.id,
      });

      expect(created!.active).toBe(true);

      const updated = await webhookRepo.update(db, created!.publicId, {
        active: false,
      });

      expect(updated!.active).toBe(false);
    });

    it("sets updatedAt timestamp on update", async () => {
      const created = await webhookRepo.create(db, {
        workspaceId: testWorkspace.id,
        name: "Test Webhook",
        url: "https://example.com/webhook",
        events: ["card.created"],
        createdBy: testUser.id,
      });

      // create() doesn't return updatedAt, verify via getByPublicId
      const initial = await webhookRepo.getByPublicId(db, created!.publicId);
      expect(initial!.updatedAt).toBeNull();

      const updated = await webhookRepo.update(db, created!.publicId, {
        name: "Updated",
      });

      expect(updated!.updatedAt).not.toBeNull();
      expect(updated!.updatedAt).toBeInstanceOf(Date);
    });

    it("returns null for non-existent webhook", async () => {
      const updated = await webhookRepo.update(db, "nonexistent12", {
        name: "Updated",
      });

      expect(updated).toBeNull();
    });
  });

  describe("hardDelete", () => {
    it("deletes a webhook permanently", async () => {
      const created = await webhookRepo.create(db, {
        workspaceId: testWorkspace.id,
        name: "To Be Deleted",
        url: "https://example.com/webhook",
        events: ["card.created"],
        createdBy: testUser.id,
      });

      await webhookRepo.hardDelete(db, created!.publicId);

      const retrieved = await webhookRepo.getByPublicId(db, created!.publicId);
      expect(retrieved).toBeNull();
    });

    it("does not throw for non-existent webhook", async () => {
      await expect(
        webhookRepo.hardDelete(db, "nonexistent12"),
      ).resolves.not.toThrow();
    });
  });
});
