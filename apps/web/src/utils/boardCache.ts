import { useQueryClient } from "@tanstack/react-query";

import type {
  BoardDetailDtoOutput,
  getBoard,
  GetBoardParams,
} from "@kan/api-client/hooks";
import { getGetBoardQueryKey } from "@kan/api-client/hooks";

export type BoardDetail = BoardDetailDtoOutput;
export type BoardQueryParams = GetBoardParams & { boardPublicId: string };

type BoardResponse = Awaited<ReturnType<typeof getBoard>>;

export const boardQueryKey = ({ boardPublicId, ...params }: BoardQueryParams) =>
  getGetBoardQueryKey(boardPublicId, params);

// Every cached variant (filters, card view) of one board, or of all boards.
const boardPrefix = (boardPublicId?: string) => ({
  predicate: (query: { queryKey: readonly unknown[] }) => {
    const [url] = query.queryKey;
    if (typeof url !== "string") return false;
    return boardPublicId
      ? url === `/boards/${boardPublicId}`
      : /^\/boards\/[^/]+$/.test(url);
  },
});

const boardLists = {
  predicate: (query: { queryKey: readonly unknown[] }) =>
    typeof query.queryKey[0] === "string" &&
    /^\/workspaces\/[^/]+\/boards$/.test(query.queryKey[0]),
};

/**
 * Board detail cache helpers with the same shape as tRPC's
 * `utils.board.byId`, reading and writing the unwrapped board data.
 */
export function useBoardCache() {
  const queryClient = useQueryClient();

  return {
    getData: (params: BoardQueryParams) =>
      queryClient.getQueryData<BoardResponse>(boardQueryKey(params))?.data,

    setData: (
      params: BoardQueryParams,
      next:
        | BoardDetail
        | undefined
        | ((old: BoardDetail | undefined) => BoardDetail | undefined),
    ) =>
      queryClient.setQueryData<BoardResponse>(boardQueryKey(params), (old) => {
        if (!old) return old;
        const data = typeof next === "function" ? next(old.data) : next;
        return data === undefined ? old : { ...old, data };
      }),

    cancel: (boardPublicId?: string) =>
      queryClient.cancelQueries(boardPrefix(boardPublicId)),

    invalidate: (boardPublicId?: string) =>
      queryClient.invalidateQueries(boardPrefix(boardPublicId)),

    refetch: (boardPublicId?: string) =>
      queryClient.refetchQueries(boardPrefix(boardPublicId)),

    invalidateLists: () => queryClient.invalidateQueries(boardLists),

    refetchLists: () => queryClient.refetchQueries(boardLists),
  };
}
