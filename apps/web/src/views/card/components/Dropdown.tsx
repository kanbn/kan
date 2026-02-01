import { t } from "@lingui/core/macro";
import {
  HiEllipsisHorizontal,
  HiOutlineCheckCircle,
  HiOutlineTrash,
} from "react-icons/hi2";

import { authClient } from "@kan/auth/client";

import Dropdown from "~/components/Dropdown";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";

export default function CardDropdown({
  cardCreatedBy,
}: {
  cardCreatedBy?: string | null;
}) {
  const { openModal } = useModal();
  const { canEditCard, canDeleteCard } = usePermissions();
  const { data: session } = authClient.useSession();
  const isCreator = cardCreatedBy && session?.user.id === cardCreatedBy;

  const items = [
    ...(canEditCard
      ? [
          {
            label: t`Add checklist`,
            action: () => openModal("ADD_CHECKLIST"),
            icon: (
              <HiOutlineCheckCircle className="h-[16px] w-[16px] text-dark-900" />
            ),
          },
        ]
      : []),
    ...(canDeleteCard || isCreator
      ? [
          {
            label: t`Delete card`,
            action: () => openModal("DELETE_CARD"),
            icon: (
              <HiOutlineTrash className="h-[16px] w-[16px] text-dark-900" />
            ),
          },
        ]
      : []),
  ];

  if (items.length === 0) {
    return null;
  }

  return (
    <Dropdown items={items}>
      <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
    </Dropdown>
  );
}
