import { createCard, updateCard } from "@kan/api-client/hooks";

// Card create/update keep tRPC's flat input (with Date due dates) so the
// optimistic updates that read mutation variables stay unchanged.

const toIso = (date: Date | null | undefined) =>
  date === undefined ? undefined : (date?.toISOString() ?? null);

export interface UpdateCardInput {
  cardPublicId: string;
  title?: string;
  description?: string;
  index?: number;
  listPublicId?: string;
  dueDate?: Date | null;
}

export const updateCardFromInput = async ({
  cardPublicId,
  dueDate,
  ...fields
}: UpdateCardInput) =>
  (await updateCard(cardPublicId, { ...fields, dueDate: toIso(dueDate) })).data;

export interface CreateCardInput {
  title: string;
  description: string;
  listPublicId: string;
  labelPublicIds: string[];
  memberPublicIds: string[];
  position: "start" | "end";
  dueDate?: Date | null;
}

export const createCardFromInput = async ({
  dueDate,
  ...fields
}: CreateCardInput) =>
  (await createCard({ ...fields, dueDate: toIso(dueDate) })).data;
