import { useRouter } from "next/router";
import { t } from "@lingui/core/macro";

import boardsIconDark from "~/assets/boards-dark.json";
import boardsIconLight from "~/assets/boards-light.json";
import membersIconDark from "~/assets/members-dark.json";
import membersIconLight from "~/assets/members-light.json";
import settingsIconDark from "~/assets/settings-dark.json";
import settingsIconLight from "~/assets/settings-light.json";
import ReactiveButton from "~/components/ReactiveButton";
import UserMenu from "~/components/UserMenu";
import WorkspaceMenu from "~/components/WorkspaceMenu";
import { useTheme } from "~/providers/theme";

interface SideNavigationProps {
  user: UserType;
  isLoading: boolean;
}

interface UserType {
  email?: string | null | undefined;
  image?: string | null | undefined;
}

export default function SideNavigation({
  user,
  isLoading,
}: SideNavigationProps) {
  const router = useRouter();

  const { pathname } = router;

  const { activeTheme } = useTheme();

  const isDarkMode = activeTheme === "dark";

  const navigation = [
    {
      name: t`Boards`,
      href: "/boards",
      icon: isDarkMode ? boardsIconDark : boardsIconLight,
    },
    {
      name: t`Members`,
      href: "/members",
      icon: isDarkMode ? membersIconDark : membersIconLight,
    },
    {
      name: t`Settings`,
      href: "/settings",
      icon: isDarkMode ? settingsIconDark : settingsIconLight,
    },
  ];

  return (
    <>
      <nav className="flex h-full w-64 flex-col justify-between border-r border-light-600 bg-light-50 px-3 pb-3 pt-5 dark:border-dark-400 dark:bg-dark-50">
        <div>
          <WorkspaceMenu />
          <ul role="list" className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <ReactiveButton
                  href={item.href}
                  current={pathname.includes(item.href)}
                  name={item.name}
                  json={item.icon}
                />
              </li>
            ))}
          </ul>
        </div>
        <UserMenu
          email={user.email ?? ""}
          imageUrl={user.image ?? undefined}
          isLoading={isLoading}
        />
      </nav>
    </>
  );
}
