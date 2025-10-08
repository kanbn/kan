import { t } from "@lingui/core/macro";
import {
  HiEllipsisHorizontal,
  HiLink,
  HiOutlineDocumentDuplicate,
  HiOutlineTrash,
} from "react-icons/hi2";

import Dropdown from "~/components/Dropdown";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

export default function BoardDropdown({
  isTemplate,
  isLoading,
  boardPublicId,
  workspacePublicId,
}: {
  isTemplate: boolean;
  isLoading: boolean;
  boardPublicId: string;
  workspacePublicId: string;
}) {
  const { openModal } = useModal();
  const { showPopup } = usePopup();
  const utils = api.useUtils();

  // const makeTemplate = api.template.create.useMutation({
  //   onSuccess: async () => {
  //     showPopup({
  //       header: t`Success`,
  //       message: t`Template created`,
  //       icon: "success",
  //     });
  //     await utils.template.getAll.invalidate();
  //   },
  //   onError: () =>
  //     showPopup({
  //       header: t`Error`,
  //       message: t`Failed to create template`,
  //       icon: "error",
  //     }),
  // });

  return (
    <Dropdown
      disabled={isLoading}
      items={[
        ...(isTemplate
          ? []
          : [
              {
                label: t`Make template`,
                action: () => {
                  makeTemplate.mutate({
                    boardPublicId,
                    workspacePublicId,
                  });
                },
                icon: (
                  <HiOutlineDocumentDuplicate className="h-[16px] w-[16px] text-dark-900" />
                ),
              },
              {
                label: t`Edit board URL`,
                action: () => openModal("UPDATE_BOARD_SLUG"),
                icon: <HiLink className="h-[16px] w-[16px] text-dark-900" />,
              },
            ]),

        {
          label: isTemplate ? t`Delete template` : t`Delete board`,
          action: () => openModal("DELETE_BOARD"),
          icon: <HiOutlineTrash className="h-[16px] w-[16px] text-dark-900" />,
        },
      ]}
    >
      <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
    </Dropdown>
  );
}
