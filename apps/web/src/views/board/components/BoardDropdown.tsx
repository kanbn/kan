import { t } from "@lingui/core/macro";
import {
  HiCog,
  HiEllipsisHorizontal,
  HiLink,
  HiOutlineTrash,
} from "react-icons/hi2";

import Dropdown from "~/components/Dropdown";
import { useModal } from "~/providers/modal";

export default function BoardDropdown({ isLoading }: { isLoading: boolean }) {
  const { openModal } = useModal();

  return (
    <Dropdown
      disabled={isLoading}
      items={[
        {
          label: t`Custom Fields`,
          action: () => openModal("CUSTOM_FIELDS"),
          icon: <HiCog className="h-[16px] w-[16px] text-dark-900" />,
        },
        {
          label: t`Edit board URL`,
          action: () => openModal("UPDATE_BOARD_SLUG"),
          icon: <HiLink className="h-[16px] w-[16px] text-dark-900" />,
        },
        {
          label: t`Delete board`,
          action: () => openModal("DELETE_BOARD"),
          icon: <HiOutlineTrash className="h-[16px] w-[16px] text-dark-900" />,
        },
      ]}
    >
      <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
    </Dropdown>
  );
}
