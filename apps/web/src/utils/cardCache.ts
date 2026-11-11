import { useQueryClient } from "@tanstack/react-query";

import type {
  ActivitiesResponseDtoOutput,
  CardDetailDtoOutput,
  getCard,
  GetCardActivitiesParams,
} from "@kan/api-client/hooks";
import {
  getCardActivities,
  getGetCardActivitiesQueryKey,
  getGetCardQueryKey,
} from "@kan/api-client/hooks";

export type CardDetail = CardDetailDtoOutput;
export type CardActivities = ActivitiesResponseDtoOutput;

type CardResponse = Awaited<ReturnType<typeof getCard>>;
interface CardInput {
  cardPublicId: string;
}

const matchUrl = (test: (url: string) => boolean) => ({
  predicate: (query: { queryKey: readonly unknown[] }) =>
    typeof query.queryKey[0] === "string" && test(query.queryKey[0]),
});

const cardDetail = (input?: CardInput) =>
  matchUrl((url) =>
    input
      ? url === `/cards/${input.cardPublicId}`
      : /^\/cards\/[^/]+$/.test(url),
  );

const cardActivities = (input: CardInput) =>
  matchUrl((url) => url === `/cards/${input.cardPublicId}/activities`);

/**
 * Card cache helpers with the same shape as tRPC's `utils.card`, reading and
 * writing the unwrapped card data.
 */
export function useCardCache() {
  const queryClient = useQueryClient();

  return {
    byId: {
      getData: ({ cardPublicId }: CardInput) =>
        queryClient.getQueryData<CardResponse>(getGetCardQueryKey(cardPublicId))
          ?.data,

      setData: (
        { cardPublicId }: CardInput,
        next:
          | CardDetail
          | undefined
          | ((old: CardDetail | undefined) => CardDetail | undefined),
      ) =>
        queryClient.setQueryData<CardResponse>(
          getGetCardQueryKey(cardPublicId),
          (old) => {
            if (!old) return old;
            const data = typeof next === "function" ? next(old.data) : next;
            return data === undefined ? old : { ...old, data };
          },
        ),

      cancel: (input?: CardInput) =>
        queryClient.cancelQueries(cardDetail(input)),

      invalidate: (input?: CardInput) =>
        queryClient.invalidateQueries(cardDetail(input)),

      refetch: (input?: CardInput) =>
        queryClient.refetchQueries(cardDetail(input)),
    },

    getActivities: {
      invalidate: (input: CardInput) =>
        queryClient.invalidateQueries(cardActivities(input)),

      fetch: async ({
        cardPublicId,
        ...params
      }: CardInput & GetCardActivitiesParams) =>
        (
          await queryClient.fetchQuery({
            queryKey: getGetCardActivitiesQueryKey(cardPublicId, params),
            queryFn: () => getCardActivities(cardPublicId, params),
          })
        ).data,
    },
  };
}

export type CardCache = ReturnType<typeof useCardCache>;
