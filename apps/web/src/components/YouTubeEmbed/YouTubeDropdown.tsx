import { t } from "@lingui/core/macro";
import {
  HiEllipsisHorizontal,
  HiLink,
  HiPencil,
  HiTrash,
} from "react-icons/hi2";

import { useModal } from "~/providers/modal";
import Dropdown from "../Dropdown";

interface YouTubeDropdownProps {
  url: string;
  title: string;
  onConvertToLink: () => void;
  onDelete: () => void;
  onUpdate: (url: string, title: string) => void;
}

const YouTubeDropdown = ({
  url,
  title,
  onConvertToLink,
  onDelete,
  onUpdate,
}: YouTubeDropdownProps) => {
  const { openModal, setModalState } = useModal();

  const handleEdit = () => {
    setModalState("EDIT_YOUTUBE", {
      url,
      title,
      onSave: onUpdate,
    });
    openModal("EDIT_YOUTUBE");
  };

  return (
    <Dropdown
      items={[
        {
          label: t`Edit`,
          action: handleEdit,
          icon: <HiPencil className="h-5 w-5 text-dark-900" />,
        },
        {
          label: t`Convert to link`,
          action: onConvertToLink,
          icon: <HiLink className="h-5 w-5 text-dark-900" />,
        },
        {
          label: t`Delete`,
          action: onDelete,
          icon: <HiTrash className="h-5 w-5 text-dark-900" />,
        },
      ]}
    >
      <HiEllipsisHorizontal className="h-5 w-5 text-dark-900" />
    </Dropdown>
  );
};

export default YouTubeDropdown;
