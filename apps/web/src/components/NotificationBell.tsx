import { useRouter } from "next/router";
import { Popover, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { formatDistanceToNow } from "date-fns";
import { Fragment, useRef, useState } from "react";
import { HiAtSymbol, HiBell, HiChatBubbleLeft, HiCheckCircle, HiPencil, HiUserGroup, HiUserPlus } from "react-icons/hi2";
import { useTheme } from "next-themes";
import { twMerge } from "tailwind-merge";

import type { NotificationType } from "@kan/db/schema";

import bellDark from "~/assets/bell-dark.json";
import bellLight from "~/assets/bell-light.json";
import LottieIcon from "~/components/LottieIcon";
import { api } from "~/utils/api";

interface NotificationBellProps {
  isCollapsed?: boolean;
}

function getNotificationMessage(
  type: NotificationType,
  cardTitle?: string | null,
  workspaceName?: string | null,
): string {
  switch (type) {
    case "mention":
      return cardTitle
        ? `${t`You were mentioned in`} "${cardTitle}"`
        : t`You were mentioned in a card`;
    case "workspace.member.added":
      return workspaceName
        ? `${t`You were added to`} "${workspaceName}"`
        : t`You were added to a workspace`;
    case "workspace.member.removed":
      return workspaceName
        ? `${t`You were removed from`} "${workspaceName}"`
        : t`You were removed from a workspace`;
    case "workspace.role.changed":
      return workspaceName
        ? `${t`Your role changed in`} "${workspaceName}"`
        : t`Your role was changed`;
    case "card.member.assigned":
      return cardTitle
        ? `${t`You were assigned to`} "${cardTitle}"`
        : t`You were assigned to a card`;
    case "card.comment.added":
      return cardTitle
        ? `${t`New comment on`} "${cardTitle}"`
        : t`New comment on a card`;
    case "card.updated":
      return cardTitle
        ? `${t`Card updated`}: "${cardTitle}"`
        : t`A card was updated`;
    default:
      return t`New notification`;
  }
}

function NotificationTypeIcon({ type }: { type: NotificationType }) {
  const cls = "text-indigo-500 dark:text-indigo-400";
  switch (type) {
    case "mention":
      return <HiAtSymbol size={12} className={cls} />;
    case "card.comment.added":
      return <HiChatBubbleLeft size={12} className={cls} />;
    case "card.member.assigned":
      return <HiUserPlus size={12} className={cls} />;
    case "card.updated":
      return <HiPencil size={12} className={cls} />;
    case "workspace.member.added":
    case "workspace.member.removed":
    case "workspace.role.changed":
      return <HiUserGroup size={12} className={cls} />;
    default:
      return <HiBell size={12} className={cls} />;
  }
}

export default function NotificationBell({ isCollapsed = false }: NotificationBellProps) {
  const router = useRouter();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const utils = api.useUtils();
  const [isHovered, setIsHovered] = useState(false);
  const [lottieIndex, setLottieIndex] = useState(0);
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  const { data: unreadData } = api.notification.unreadCount.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const unreadCount = unreadData?.count ?? 0;

  const markAllRead = api.notification.markAllRead.useMutation({
    onSuccess: () => {
      void utils.notification.unreadCount.invalidate();
      void utils.notification.list.invalidate();
    },
  });

  const markRead = api.notification.markRead.useMutation({
    onSuccess: () => {
      void utils.notification.unreadCount.invalidate();
      void utils.notification.list.invalidate();
    },
  });

  return (
    <Popover className="relative w-full">
      {() => (
        <>
          <Popover.Button
            ref={buttonRef}
            className={twMerge(
              "flex w-full items-center rounded-md p-1.5 text-neutral-900 hover:bg-light-200 dark:text-dark-900 dark:hover:bg-dark-200 dark:hover:text-dark-1000",
              isCollapsed && "justify-center",
            )}
            title={isCollapsed ? t`Notifications` : undefined}
            onMouseEnter={() => { setIsHovered(true); setLottieIndex((i) => i + 1); }}
          >
            <div className="relative flex-shrink-0">
              {unreadCount > 0 && (
                <span className="absolute -left-1 -top-1 flex">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-500 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-600" />
                </span>
              )}
              <LottieIcon index={lottieIndex} json={isDarkMode ? bellDark : bellLight} isPlaying={isHovered} />
            </div>
            {!isCollapsed && (
              <span className="ml-2.5 flex-1 text-left text-sm font-medium">{t`Notifications`}</span>
            )}
          </Popover.Button>

          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Popover.Panel className="absolute bottom-full left-0 z-50 mb-2 w-80 rounded-lg border border-light-300 bg-white shadow-lg dark:border-dark-300 dark:bg-dark-100">
              <div className="flex items-center justify-between border-b border-light-300 px-4 py-3 dark:border-dark-300">
                <span className="text-sm font-semibold text-neutral-900 dark:text-dark-1000">
                  {t`Notifications`}
                </span>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllRead.mutate()}
                    className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
                  >
                    <HiCheckCircle size={14} />
                    {t`Mark all as read`}
                  </button>
                )}
              </div>
              <NotificationPanelContent markRead={markRead} router={router} />
            </Popover.Panel>
          </Transition>
        </>
      )}
    </Popover>
  );
}

function NotificationPanelContent({
  markRead,
  router,
}: {
  markRead: ReturnType<typeof api.notification.markRead.useMutation>;
  router: ReturnType<typeof useRouter>;
}) {
  const { data: notifications, isLoading } = api.notification.list.useQuery({
    limit: 20,
    offset: 0,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!notifications?.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <HiBell size={24} className="mb-2 text-light-600 dark:text-dark-600" />
        <p className="text-sm text-light-700 dark:text-dark-700">{t`No notifications yet`}</p>
      </div>
    );
  }

  const handleNotificationClick = (notification: (typeof notifications)[number]) => {
    if (!notification.readAt) {
      markRead.mutate({ notificationPublicId: notification.publicId });
    }
    if (notification.card?.publicId) {
      void router.push(`/cards/${notification.card.publicId}`);
    }
  };

  return (
    <ul className="max-h-96 overflow-y-auto py-1">
      {notifications.map((notification) => (
        <li key={notification.publicId}>
          <button
            onClick={() => handleNotificationClick(notification)}
            className={twMerge(
              "flex w-full items-start gap-3 border-l-2 px-4 py-3 text-left transition-colors hover:bg-light-200 dark:hover:bg-dark-300",
              !notification.readAt
                ? "border-l-indigo-600 bg-light-100 dark:bg-dark-200"
                : "border-l-transparent",
            )}
          >
            <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-light-200 dark:bg-dark-300">
              <NotificationTypeIcon type={notification.type} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-neutral-900 dark:text-dark-1000">
                {getNotificationMessage(
                  notification.type,
                  notification.card?.title,
                  notification.workspace?.name,
                )}
              </p>
              <p className="mt-0.5 text-xs text-light-800 dark:text-dark-800">
                {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
              </p>
            </div>
            {!notification.readAt && (
              <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-600" />
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}
