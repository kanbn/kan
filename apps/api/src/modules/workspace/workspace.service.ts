import { Injectable } from "@nestjs/common";
import { TRPCError } from "@trpc/server";

import type { WorkspacePlan } from "@kan/db/schema";
import { createAvatarUrlResolver } from "@kan/api/utils/avatarUrls";
import { assertPermission, isWorkspaceAdmin } from "@kan/api/utils/permissions";
import * as boardMemberRepo from "@kan/db/repository/boardMember.repo";
import * as subscriptionRepo from "@kan/db/repository/subscription.repo";
import * as workspaceRepo from "@kan/db/repository/workspace.repo";
import * as workspaceSlugRepo from "@kan/db/repository/workspaceSlug.repo";
import { generateUID } from "@kan/shared/utils";

import { assertFound } from "../../common/assert-found.util.js";
import { db } from "../../common/session.util.js";

const isCloudEnv = () => process.env.NEXT_PUBLIC_KAN_ENV === "cloud";

@Injectable()
export class WorkspaceService {
  async all(input: { userId: string }) {
    const result = await workspaceRepo.getAllByUserId(db, input.userId);

    return result.map((membership) => ({
      ...membership,
      workspace: {
        ...membership.workspace,
        deletedAt: membership.workspace.deletedAt?.toISOString() ?? null,
      },
    }));
  }

  async checkSlugAvailability(input: {
    workspaceSlug: string;
    workspacePublicId?: string;
    userId: string;
  }) {
    const slug = input.workspaceSlug.toLowerCase();
    const workspaceSlug = await workspaceSlugRepo.getWorkspaceSlug(db, slug);

    const currentWorkspace = input.workspacePublicId
      ? await workspaceRepo.getByPublicId(db, input.workspacePublicId)
      : undefined;

    const isWorkspaceSlugAvailable =
      await workspaceRepo.isWorkspaceSlugAvailable(
        db,
        slug,
        currentWorkspace?.id,
      );

    const isAvailable =
      isWorkspaceSlugAvailable && workspaceSlug?.type !== "reserved";
    const isReserved = workspaceSlug?.type === "reserved";

    if (isCloudEnv()) {
      await workspaceSlugRepo.createWorkspaceSlugCheck(db, {
        slug,
        userId: input.userId,
        available: isAvailable,
        reserved: isReserved,
      });
    }

    return { isAvailable, isReserved };
  }

  async byId(input: { workspacePublicId: string; userId: string }) {
    const result = await assertFound(
      workspaceRepo.getByPublicIdWithMembers(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, result.id, "workspace:view");

    const userMember = result.members.find(
      (member) => member.user?.id === input.userId,
    );
    const isAdmin = userMember?.role === "admin";
    const shouldShowEmails = isAdmin || result.showEmailsToMembers === true;

    const resolveAvatarUrl = createAvatarUrlResolver();
    const membersWithAvatarUrls = await Promise.all(
      result.members.map(async (member) => {
        if (!member.user?.image) {
          return { ...member, createdAt: member.createdAt.toISOString() };
        }

        const avatarUrl = await resolveAvatarUrl(member.user.image);
        return {
          ...member,
          createdAt: member.createdAt.toISOString(),
          user: { ...member.user, image: avatarUrl },
        };
      }),
    );

    const subscriptions = result.subscriptions.map((sub) => ({
      ...sub,
      periodStart: sub.periodStart?.toISOString() ?? null,
      periodEnd: sub.periodEnd?.toISOString() ?? null,
    }));

    if (!shouldShowEmails) {
      const sanitizedMembers = membersWithAvatarUrls.map((member) => {
        const displayName =
          member.user?.name?.trim() ?? `anonymous_${member.publicId}`;
        const { email: _memberEmail, ...memberWithoutEmail } = member;
        const sanitizedUser = member.user
          ? (() => {
              const { email: _userEmail, ...userWithoutEmail } = member.user;
              return { ...userWithoutEmail, name: displayName };
            })()
          : { id: null, name: displayName, image: null };

        return { ...memberWithoutEmail, user: sanitizedUser };
      });

      return {
        ...result,
        members: sanitizedMembers,
        subscriptions,
      };
    }

    return {
      ...result,
      members: membersWithAvatarUrls,
      subscriptions,
    };
  }

  async bySlug(input: { workspaceSlug: string; userId: string }) {
    const result = await assertFound(
      workspaceRepo.getBySlugWithBoards(db, input.workspaceSlug),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, result.id, "workspace:view");

    return result;
  }

  async create(input: {
    name: string;
    description?: string;
    slug?: string;
    userId: string;
    userEmail: string;
  }) {
    if (input.slug && isCloudEnv())
      throw new TRPCError({
        message: "Custom URLs are only available for Pro workspaces",
        code: "BAD_REQUEST",
      });

    const workspacePublicId = generateUID();
    // An empty-string slug must also fall back to the generated public id,
    // so `??` (which only catches null/undefined) won't do here.
    // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
    const workspaceSlug = input.slug ? input.slug : workspacePublicId;

    if (input.slug) {
      const reservedOrPremiumWorkspaceSlug =
        await workspaceSlugRepo.getWorkspaceSlug(db, input.slug);
      const isWorkspaceSlugAvailable =
        await workspaceRepo.isWorkspaceSlugAvailable(db, input.slug);

      if (reservedOrPremiumWorkspaceSlug)
        throw new TRPCError({
          message: `Workspace slug '${input.slug}' is reserved or premium`,
          code: "BAD_REQUEST",
        });

      if (!isWorkspaceSlugAvailable)
        throw new TRPCError({
          message: `Workspace slug '${input.slug}' is already taken`,
          code: "BAD_REQUEST",
        });
    }

    const result = await workspaceRepo.create(db, {
      publicId: workspacePublicId,
      name: input.name,
      slug: workspaceSlug,
      createdBy: input.userId,
      createdByEmail: input.userEmail,
      ...(input.description && { description: input.description }),
    });

    if (!result.publicId || !result.name || !result.slug || !result.cardPrefix)
      throw new TRPCError({
        message: `Unable to create workspace`,
        code: "INTERNAL_SERVER_ERROR",
      });

    let unlinkedSlot: Awaited<
      ReturnType<typeof subscriptionRepo.getFirstUnlinkedSlotByLicenseKey>
    >;

    if (isCloudEnv()) {
      const memberships = await workspaceRepo.getAllByUserId(db, input.userId);
      const otherWorkspaceIds = memberships
        .map((m) => m.workspace.publicId)
        .filter((id) => id !== workspacePublicId);

      const partnerSub = otherWorkspaceIds.length
        ? await subscriptionRepo.getFirstActivePartnerSubByWorkspaceIds(
            db,
            otherWorkspaceIds,
          )
        : undefined;
      unlinkedSlot = partnerSub?.partnerLicenseKey
        ? await subscriptionRepo.getFirstUnlinkedSlotByLicenseKey(
            db,
            partnerSub.partnerLicenseKey,
          )
        : undefined;

      if (unlinkedSlot) {
        await Promise.all([
          subscriptionRepo.updateById(db, unlinkedSlot.id, {
            referenceId: workspacePublicId,
          }),
          workspaceRepo.update(db, workspacePublicId, {
            plan: unlinkedSlot.plan as WorkspacePlan,
          }),
        ]);
      }
    }

    return {
      publicId: result.publicId,
      name: result.name,
      slug: result.slug,
      description: result.description ?? null,
      plan: (unlinkedSlot?.plan ?? result.plan ?? "free") as WorkspacePlan,
      cardPrefix: result.cardPrefix,
    };
  }

  async update(input: {
    workspacePublicId: string;
    userId: string;
    name?: string;
    slug?: string;
    description?: string;
    showEmailsToMembers?: boolean;
    weekStartDay?: 0 | 1 | 6;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "workspace:edit");

    if (input.slug) {
      const reservedOrPremiumWorkspaceSlug =
        await workspaceSlugRepo.getWorkspaceSlug(db, input.slug);
      const isWorkspaceSlugAvailable =
        await workspaceRepo.isWorkspaceSlugAvailable(
          db,
          input.slug,
          workspace.id,
        );

      if (
        isCloudEnv() &&
        workspace.plan === "free" &&
        input.slug !== workspace.publicId
      )
        throw new TRPCError({
          message: `Workspace slug cannot be changed in cloud without upgrading to a paid plan`,
          code: "FORBIDDEN",
        });

      if (
        reservedOrPremiumWorkspaceSlug?.type === "reserved" ||
        !isWorkspaceSlugAvailable
      )
        throw new TRPCError({
          message: `Workspace slug already taken`,
          code: "CONFLICT",
        });
    }

    const result = await workspaceRepo.update(db, input.workspacePublicId, {
      name: input.name,
      slug: input.slug,
      description: input.description,
      showEmailsToMembers: input.showEmailsToMembers,
      weekStartDay: input.weekStartDay,
    });

    if (!result)
      throw new TRPCError({
        message: `Unable to delete workspace`,
        code: "INTERNAL_SERVER_ERROR",
      });

    return result;
  }

  async delete(input: { workspacePublicId: string; userId: string }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "workspace:delete");

    if (isCloudEnv()) {
      const subs = await subscriptionRepo.getByReferenceId(
        db,
        input.workspacePublicId,
      );
      await Promise.all(
        subs
          .filter((s) => !!s.partnerLicenseKey)
          .map((s) =>
            subscriptionRepo.updateById(db, s.id, { referenceId: null }),
          ),
      );
    }

    await workspaceRepo.hardDelete(db, input.workspacePublicId);

    return { success: true };
  }

  async search(input: {
    workspacePublicId: string;
    query: string;
    limit: number;
    userId: string;
  }) {
    const workspace = await assertFound(
      workspaceRepo.getByPublicId(db, input.workspacePublicId),
      `Workspace not found`,
    );

    await assertPermission(db, input.userId, workspace.id, "workspace:view");

    const memberBoardIds = (await isWorkspaceAdmin(
      db,
      input.userId,
      workspace.id,
    ))
      ? undefined
      : await boardMemberRepo.getMemberBoardIds(db, {
          workspaceId: workspace.id,
          userId: input.userId,
        });

    const result = await workspaceRepo.searchBoardsAndCards(
      db,
      workspace.id,
      input.query,
      input.limit,
      memberBoardIds,
    );

    return result.map((item) => ({
      ...item,
      updatedAt: item.updatedAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    }));
  }

  async hasAvailablePartnerSlot(input: { userId: string }) {
    const memberships = await workspaceRepo.getAllByUserId(db, input.userId);
    const workspaceIds = memberships.map((m) => m.workspace.publicId);

    if (!workspaceIds.length) return false;

    const partnerSub =
      await subscriptionRepo.getFirstActivePartnerSubByWorkspaceIds(
        db,
        workspaceIds,
      );
    if (!partnerSub?.partnerLicenseKey) return false;

    const unlinkedSlot =
      await subscriptionRepo.getFirstUnlinkedSlotByLicenseKey(
        db,
        partnerSub.partnerLicenseKey,
      );

    return !!unlinkedSlot;
  }
}
