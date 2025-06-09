import Link from "next/link";

import boardsIconDark from "~/assets/boards-dark.json";
import boardsIconLight from "~/assets/boards-light.json";
import membersIconDark from "~/assets/members-dark.json";
import membersIconLight from "~/assets/members-light.json";
import settingsIconDark from "~/assets/settings-dark.json";
import settingsIconLight from "~/assets/settings-light.json";
import LottieIcon from "~/components/LottieIcon";
import { useTheme } from "~/providers/theme";

export default function MobileBottomNav() {
  const { activeTheme } = useTheme();

  const isDarkMode = activeTheme === "dark";

  const navigation = [
    {
      name: "Boards",
      href: "/boards",
      icon: isDarkMode ? boardsIconDark : boardsIconLight,
    },
    {
      name: "Members",
      href: "/members",
      icon: isDarkMode ? membersIconDark : membersIconLight,
    },
    {
      name: "Settings",
      href: "/settings",
      icon: isDarkMode ? settingsIconDark : settingsIconLight,
    },
  ];

  return (
    <div className="absolute bottom-0 z-50 grid w-full grid-cols-3 border-t border-light-600 dark:border-dark-400">
      {navigation.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className="flex flex-col items-center justify-center gap-y-1 p-1"
        >
          <LottieIcon index={0} json={item.icon} isPlaying={false} />
          <span className="text-xs font-medium text-light-900 dark:text-dark-900">
            {item.name}
          </span>
        </Link>
      ))}
    </div>
  );
}
