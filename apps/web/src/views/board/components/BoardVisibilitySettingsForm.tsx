import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { usePermissions } from "~/hooks/usePermissions";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface QueryParams {
  boardPublicId: string;
}

export function BoardVisibilitySettingsForm({
  boardPublicId,
  visibility,
  isAdmin,
  queryParams,
}: {
  boardPublicId: string;
  visibility: string;
  isAdmin: boolean;
  queryParams: QueryParams;
}) {
  const { showPopup } = usePopup();
  const { canEditBoard } = usePermissions();
  const utils = api.useUtils();

  const schema = z.object({
    visibility: z.enum(["private", "public"]),
  });

  type FormValues = z.infer<typeof schema>;

  const { register } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: {
      visibility: visibility as "private" | "public",
    },
    mode: "onChange",
  });

  // const color = watch("backgroundColor");

  const updateBoardVisibility = api.board.update.useMutation({
    onSuccess: () => {
      showPopup({
        header: t`Board visibility updated`,
        message: t`The visibility of your board has been set to ${visibility == "public" ? "private" : "public"}.`,
        icon: "success",
      });
    },
    onError: () => {
      showPopup({
        header: t`Unable to update board visibility`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
    onSettled: async () => {
      // closeModal();
      await utils.board.byId.invalidate(queryParams);
    },
  });

  const setVisibility = (visibility: string) => {
    updateBoardVisibility.mutate({
      boardPublicId,
      visibility: visibility as "private" | "public",
    });
  };

  const canEdit = canEditBoard || isAdmin;

  return (
    <>
      {canEdit && (
        <form>
          <div className="mb-3 text-sm text-light-900 dark:text-dark-900">
            {t`Board Visibility`}
          </div>
          <select
            id="board-visibility"
            className="bg-light-100 pr-8 text-sm"
            onChange={(e) => {
              setVisibility(e.target.value);
            }}
          >
            <option value="private">{t`Private`}</option>
            <option value="public">{t`Public`}</option>
          </select>
        </form>
      )}
    </>
  );
}
