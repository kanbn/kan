import { t } from "@lingui/core/macro";
import { useEffect, useRef } from "react";
import {
  HiLink,
  HiOutlineCalendar,
  HiOutlineDocumentDuplicate,
  HiOutlineTag,
  HiOutlineTrash,
  HiOutlineUserGroup,
  HiOutlineArrowRightCircle,
} from "react-icons/hi2";

export type CardContextMenuAction =
  | "members"
  | "move"
  | "labels"
  | "dueDate"
  | "copyLink"
  | "duplicate"
  | "delete";

interface CardContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onAction: (action: CardContextMenuAction) => void;
  canEdit: boolean;
}

const MENU_ITEMS: {
  action: CardContextMenuAction;
  label: string;
  icon: React.ReactNode;
  requiresEdit: boolean;
}[] = [
  {
    action: "members",
    label: t`Manage members`,
    icon: <HiOutlineUserGroup className="h-4 w-4 shrink-0" />,
    requiresEdit: true,
  },
  {
    action: "move",
    label: t`Move to another list`,
    icon: <HiOutlineArrowRightCircle className="h-4 w-4 shrink-0" />,
    requiresEdit: true,
  },
  {
    action: "labels",
    label: t`Add / edit label`,
    icon: <HiOutlineTag className="h-4 w-4 shrink-0" />,
    requiresEdit: true,
  },
  {
    action: "dueDate",
    label: t`Set due date`,
    icon: <HiOutlineCalendar className="h-4 w-4 shrink-0" />,
    requiresEdit: true,
  },
  {
    action: "copyLink",
    label: t`Copy link to card`,
    icon: <HiLink className="h-4 w-4 shrink-0" />,
    requiresEdit: false,
  },
  {
    action: "duplicate",
    label: t`Duplicate card`,
    icon: <HiOutlineDocumentDuplicate className="h-4 w-4 shrink-0" />,
    requiresEdit: true,
  },
  {
    action: "delete",
    label: t`Delete card`,
    icon: <HiOutlineTrash className="h-4 w-4 shrink-0" />,
    requiresEdit: true,
  },
];

export function CardContextMenu({
  x,
  y,
  onClose,
  onAction,
  canEdit,
}: CardContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  const items = MENU_ITEMS.filter((item) => !item.requiresEdit || canEdit);

  return (
    <div
      ref={menuRef}
      className="fixed z-[200] min-w-[200px] rounded-md border border-light-200 bg-white py-1 shadow-lg dark:border-dark-400 dark:bg-dark-200"
      style={{ left: x, top: y }}
    >
      {items.map(({ action, label, icon }) => (
        <button
          key={action}
          type="button"
          onClick={() => {
            onAction(action);
            onClose();
          }}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-neutral-900 hover:bg-light-200 dark:text-dark-1000 dark:hover:bg-dark-400"
        >
          {icon}
          {label}
        </button>
      ))}
    </div>
  );
}
