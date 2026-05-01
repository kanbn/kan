import { t } from "@lingui/core/macro";
import { twMerge } from "tailwind-merge";

import type { Viewer } from "~/hooks/useBoardPresence";
import { getAvatarUrl, getInitialsFromName } from "~/utils/helpers";

const MAX_SHOWN = 5;

const ViewerAvatar = ({
  viewer,
  size,
}: {
  viewer: Viewer;
  size: number;
}) => {
  const initials = getInitialsFromName(viewer.userName);
  const avatarUrl = viewer.userImage ? getAvatarUrl(viewer.userImage) : "";

  return (
    <span
      title={viewer.userName}
      className="relative inline-flex shrink-0 items-center justify-center rounded-full ring-2 ring-light-50 dark:ring-dark-100"
      style={{ width: size, height: size }}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          className="h-full w-full rounded-full object-cover"
          alt={viewer.userName}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-light-1000 dark:bg-dark-400">
          <span className="text-[9px] font-medium leading-none text-white">
            {initials}
          </span>
        </span>
      )}

      {/* Green "online" dot */}
      <span className="absolute bottom-0 right-0 block h-1.5 w-1.5 rounded-full bg-green-500 ring-1 ring-light-50 dark:ring-dark-100" />
    </span>
  );
};

export const PresenceAvatars = ({
  viewers,
  className,
}: {
  viewers: Viewer[];
  className?: string;
}) => {
  if (viewers.length === 0) return null;

  const shown = viewers.slice(0, MAX_SHOWN);
  const overflow = viewers.length - MAX_SHOWN;

  return (
    <div
      className={twMerge("flex items-center", className)}
      title={t`Viewing now: ${viewers.map((v) => v.userName).join(", ")}`}
    >
      <div className="flex -space-x-1.5">
        {shown.map((viewer) => (
          <ViewerAvatar key={viewer.userId} viewer={viewer} size={24} />
        ))}
        {overflow > 0 && (
          <span
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-light-200 text-[9px] font-semibold text-light-900 ring-2 ring-light-50 dark:bg-dark-300 dark:text-dark-900 dark:ring-dark-100"
            title={t`${overflow} more viewers`}
          >
            +{overflow}
          </span>
        )}
      </div>
    </div>
  );
};
