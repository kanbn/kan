import type { ReactNode } from "react";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import { addDays, format, isSameDay, startOfDay, startOfWeek } from "date-fns";
import { useRef, useState } from "react";
import {
  HiArrowTopRightOnSquare,
  HiCheck,
  HiChevronRight,
  HiHashtag,
  HiLink,
  HiMiniPlus,
  HiOutlineArrowRightCircle,
  HiOutlineCalendar,
  HiOutlineDocumentDuplicate,
  HiOutlineInboxStack,
  HiOutlineTag,
  HiOutlineTrash,
  HiOutlineUserGroup,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";

import type { CardInList } from "../boardUpdates";
import type { useCardQuickActions } from "../useCardQuickActions";
import type { BoardDetail } from "~/utils/boardCache";
import LabelIcon from "~/components/LabelIcon";
import { useCardArchive } from "~/hooks/useCardArchive";
import { useLocalisation } from "~/hooks/useLocalisation";
import { usePermissions } from "~/hooks/usePermissions";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { isPlaceholderPublicId } from "~/utils/helpers";
import { getCardMemberOptions } from "~/views/card/components/memberOptions";
import { findCardInList } from "../boardUpdates";

const iconClass = "h-3.5 w-3.5 shrink-0 text-light-900 dark:text-dark-900";
const itemClass =
  "flex cursor-pointer items-center gap-2 rounded-[5px] px-2.5 py-1.5 text-xs text-neutral-900 outline-hidden select-none data-disabled:cursor-default data-disabled:opacity-60 data-highlighted:bg-light-200 dark:text-dark-950 dark:data-highlighted:bg-dark-400";
const contentClass =
  "z-200 max-h-(--radix-context-menu-content-available-height) w-52 overflow-y-auto rounded-md border border-light-200 bg-white p-1 shadow-lg ring-1 ring-black/5 dark:border-dark-400 dark:bg-dark-300";
const separator = (
  <ContextMenu.Separator className="my-1 border-t border-light-200 dark:border-dark-400" />
);

function Submenu({
  icon,
  label,
  children,
}: {
  icon: ReactNode;
  label: string;
  children: ReactNode;
}) {
  return (
    <ContextMenu.Sub>
      <ContextMenu.SubTrigger
        className={twMerge(
          itemClass,
          "data-[state=open]:bg-light-200 dark:data-[state=open]:bg-dark-400",
        )}
      >
        {icon}
        {label}
        <HiChevronRight className="ml-auto h-3 w-3 text-light-900 dark:text-dark-900" />
      </ContextMenu.SubTrigger>
      <ContextMenu.Portal>
        <ContextMenu.SubContent
          className={twMerge(contentClass, "max-h-80")}
          collisionPadding={8}
          sideOffset={4}
        >
          {children}
        </ContextMenu.SubContent>
      </ContextMenu.Portal>
    </ContextMenu.Sub>
  );
}

function CheckItem({
  icon,
  label,
  checked,
  onToggle,
}: {
  icon?: ReactNode;
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <ContextMenu.CheckboxItem
      checked={checked}
      className={itemClass}
      // Stays open, to tick several.
      onSelect={(e) => {
        e.preventDefault();
        onToggle();
      }}
    >
      {icon}
      <span className="truncate">{label}</span>
      <ContextMenu.ItemIndicator className="ml-auto">
        <HiCheck className="h-3.5 w-3.5" />
      </ContextMenu.ItemIndicator>
    </ContextMenu.CheckboxItem>
  );
}

interface CardContextMenuProps {
  children: ReactNode;
  board: BoardDetail | undefined;
  actions: ReturnType<typeof useCardQuickActions>;
  getCardHref: (cardPublicId: string) => string;
  isTemplate: boolean;
  weekStartsOn: 0 | 1 | 6;
  onCreateLabel: (cardPublicId: string) => void;
  onMoved?: (listName: string) => void;
}

export function CardContextMenu({
  children,
  board,
  actions,
  getCardHref,
  isTemplate,
  weekStartsOn,
  onCreateLabel,
  onMoved,
}: CardContextMenuProps) {
  useLingui();
  const { canCreateCard, canEditCard, canDeleteCard, canEditBoard } =
    usePermissions();
  const { dateLocale } = useLocalisation();
  const { openModal } = useModal();
  const { showPopup } = usePopup();
  const { archive } = useCardArchive();
  const [cardPublicId, setCardPublicId] = useState("");
  const opensModal = useRef(false);

  // One menu serves every card, so note which one was pressed. Anywhere else
  // keeps the browser's own menu.
  const pickCard = (event: React.SyntheticEvent) => {
    const id = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-card-id]",
    )?.dataset.cardId;

    if (!id || isPlaceholderPublicId(id)) {
      event.stopPropagation();
      return;
    }
    opensModal.current = false;
    setCardPublicId(id);
  };

  // Kept while the menu is open if a filter hides the card, as unmounting the
  // menu without closing it would reopen it when the card comes back.
  const [lastSeen, setLastSeen] = useState<CardInList | null>(null);
  const current = board && findCardInList(board, cardPublicId);
  if (current && current.card !== lastSeen?.card) setLastSeen(current);
  const { card, list } =
    current ?? (lastSeen?.card.publicId === cardPublicId ? lastSeen : {});

  const ticketId =
    board && card?.cardNumber != null && board.workspace.cardPrefix
      ? `${board.workspace.cardPrefix}-${card.cardNumber}`
      : null;

  const openCardModal = (type: string) => {
    opensModal.current = true;
    openModal(type, cardPublicId);
  };

  const copy = async (
    text: string,
    success: { header: string; message: string },
    failure: string,
  ) => {
    try {
      await navigator.clipboard.writeText(text);
      showPopup({ ...success, icon: "success" });
    } catch {
      showPopup({
        header: failure,
        message: t`Please try again.`,
        icon: "error",
      });
    }
  };

  const today = startOfDay(new Date());
  const dueDates = [
    { label: t`Today`, date: today },
    { label: t`Tomorrow`, date: addDays(today, 1) },
    {
      label: t`Next week`,
      date: addDays(startOfWeek(today, { weekStartsOn }), 7),
    },
  ];

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div className="contents">
          <div
            className="contents"
            onContextMenu={pickCard}
            onPointerDown={(e) => e.pointerType !== "mouse" && pickCard(e)}
          >
            {children}
          </div>
        </div>
      </ContextMenu.Trigger>
      {board && card && list && (
        <ContextMenu.Portal>
          <ContextMenu.Content
            className={contentClass}
            collisionPadding={8}
            aria-label={card.title}
            // Keeps typing to find an item from firing the board's shortcuts.
            onKeyDown={(e) => e.stopPropagation()}
            onCloseAutoFocus={(e) => {
              e.preventDefault();
              if (opensModal.current) return;
              document
                .querySelector<HTMLElement>(`[data-card-id="${cardPublicId}"]`)
                ?.focus({ preventScroll: true });
            }}
          >
            <ContextMenu.Item asChild className={itemClass}>
              <a
                href={getCardHref(cardPublicId)}
                target="_blank"
                rel="noreferrer"
              >
                <HiArrowTopRightOnSquare className={iconClass} />
                {t`Open in new tab`}
              </a>
            </ContextMenu.Item>
            {separator}
            {canEditCard && (
              <>
                <Submenu
                  icon={<HiOutlineTag className={iconClass} />}
                  label={t`Labels`}
                >
                  {board.labels.map((label) => (
                    <CheckItem
                      key={label.publicId}
                      icon={<LabelIcon colourCode={label.colourCode} />}
                      label={label.name}
                      checked={card.labels.some(
                        ({ publicId }) => publicId === label.publicId,
                      )}
                      onToggle={() =>
                        actions.toggleLabel.mutate({ cardPublicId, label })
                      }
                    />
                  ))}
                  {canEditBoard && (
                    <ContextMenu.Item
                      className={itemClass}
                      onSelect={() => {
                        opensModal.current = true;
                        onCreateLabel(cardPublicId);
                      }}
                    >
                      <HiMiniPlus className={iconClass} />
                      {t`Create new label`}
                    </ContextMenu.Item>
                  )}
                </Submenu>
                {!isTemplate && (
                  <Submenu
                    icon={<HiOutlineUserGroup className={iconClass} />}
                    label={t`Members`}
                  >
                    {getCardMemberOptions(
                      board.workspace.members,
                      card.members.map(({ publicId }) => publicId),
                    ).map((option) => (
                      <CheckItem
                        key={option.key}
                        icon={option.leftIcon}
                        label={option.value}
                        checked={option.selected}
                        onToggle={() => {
                          const member = board.workspace.members.find(
                            ({ publicId }) => publicId === option.key,
                          );
                          if (member)
                            actions.toggleMember.mutate({
                              cardPublicId,
                              member,
                            });
                        }}
                      />
                    ))}
                  </Submenu>
                )}
                <Submenu
                  icon={<HiOutlineCalendar className={iconClass} />}
                  label={t`Due date`}
                >
                  {dueDates.map(({ label, date }) => (
                    <ContextMenu.Item
                      key={label}
                      className={itemClass}
                      disabled={
                        !!card.dueDate &&
                        isSameDay(new Date(card.dueDate), date)
                      }
                      onSelect={() =>
                        actions.setDueDate.mutate({
                          cardPublicId,
                          dueDate: date,
                        })
                      }
                    >
                      {label}
                      <span className="ml-auto text-[0.7rem] text-light-900 dark:text-dark-900">
                        {format(date, "EEE d MMM", { locale: dateLocale })}
                      </span>
                    </ContextMenu.Item>
                  ))}
                  <ContextMenu.Item
                    className={itemClass}
                    onSelect={() => openCardModal("CARD_DUE_DATE")}
                  >
                    {t`Pick a date...`}
                  </ContextMenu.Item>
                  {card.dueDate && (
                    <>
                      {separator}
                      <ContextMenu.Item
                        className={itemClass}
                        onSelect={() =>
                          actions.setDueDate.mutate({
                            cardPublicId,
                            dueDate: null,
                          })
                        }
                      >
                        {t`Remove due date`}
                      </ContextMenu.Item>
                    </>
                  )}
                </Submenu>
                <Submenu
                  icon={<HiOutlineArrowRightCircle className={iconClass} />}
                  label={t`Move to`}
                >
                  <ContextMenu.RadioGroup
                    value={list.publicId}
                    onValueChange={(listPublicId) => {
                      const target = board.allLists.find(
                        ({ publicId }) => publicId === listPublicId,
                      );
                      if (!target || listPublicId === list.publicId) return;
                      actions.moveToList.mutate(
                        { cardPublicId, listPublicId },
                        { onSuccess: () => onMoved?.(target.name) },
                      );
                    }}
                  >
                    {board.allLists
                      .filter(
                        ({ publicId }) => !isPlaceholderPublicId(publicId),
                      )
                      .map(({ publicId, name }) => (
                        <ContextMenu.RadioItem
                          key={publicId}
                          value={publicId}
                          className={itemClass}
                        >
                          <span className="truncate">{name}</span>
                          <ContextMenu.ItemIndicator className="ml-auto">
                            <HiCheck className="h-3.5 w-3.5" />
                          </ContextMenu.ItemIndicator>
                        </ContextMenu.RadioItem>
                      ))}
                  </ContextMenu.RadioGroup>
                </Submenu>
                {separator}
              </>
            )}
            <ContextMenu.Item
              className={itemClass}
              onSelect={() =>
                copy(
                  window.location.origin +
                    (getCardHref(cardPublicId).split("?")[0] ?? ""),
                  {
                    header: t`Link copied`,
                    message: t`Card URL copied to clipboard`,
                  },
                  t`Unable to copy link`,
                )
              }
            >
              <HiLink className={iconClass} />
              {t`Copy card link`}
            </ContextMenu.Item>
            {ticketId && (
              <ContextMenu.Item
                className={itemClass}
                onSelect={() =>
                  copy(
                    ticketId,
                    {
                      header: t`ID copied`,
                      message: t`Ticket ID copied to clipboard`,
                    },
                    t`Unable to copy ID`,
                  )
                }
              >
                <HiHashtag className={iconClass} />
                {t`Copy ticket ID`}
              </ContextMenu.Item>
            )}
            {canCreateCard && (
              <ContextMenu.Item
                className={itemClass}
                onSelect={() =>
                  actions.duplicate.mutate({
                    cardPublicId,
                    listPublicId: list.publicId,
                    index: card.index + 1,
                  })
                }
              >
                <HiOutlineDocumentDuplicate className={iconClass} />
                {t`Duplicate card`}
              </ContextMenu.Item>
            )}
            {canEditCard && !isTemplate && (
              <ContextMenu.Item
                className={itemClass}
                onSelect={() => archive.mutate({ cardPublicId })}
              >
                <HiOutlineInboxStack className={iconClass} />
                {t`Archive card`}
              </ContextMenu.Item>
            )}
            {canDeleteCard && (
              <ContextMenu.Item
                className={itemClass}
                onSelect={() => openCardModal("DELETE_CARD")}
              >
                <HiOutlineTrash className={iconClass} />
                {t`Delete card`}
              </ContextMenu.Item>
            )}
          </ContextMenu.Content>
        </ContextMenu.Portal>
      )}
    </ContextMenu.Root>
  );
}
