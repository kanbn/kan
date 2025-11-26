import Link from "next/link";
import { useRouter } from "next/router";
import { Button } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { HiBolt } from "react-icons/hi2";
import {
  TbLayoutSidebarLeftCollapse,
  TbLayoutSidebarLeftExpand,
} from "react-icons/tb";
import { twMerge } from "tailwind-merge";

import type { Subscription } from "@kan/shared/utils";
import { hasActiveSubscription } from "@kan/shared/utils";

import type { KeyboardShortcut } from "~/providers/keyboard-shortcuts";
import boardsIconDark from "~/assets/boards-dark.json";
import boardsIconLight from "~/assets/boards-light.json";
import membersIconDark from "~/assets/members-dark.json";
import membersIconLight from "~/assets/members-light.json";
import settingsIconDark from "~/assets/settings-dark.json";
import settingsIconLight from "~/assets/settings-light.json";
import templatesIconDark from "~/assets/templates-dark.json";
import templatesIconLight from "~/assets/templates-light.json";
import ButtonComponent from "~/components/Button";
import ReactiveButton from "~/components/ReactiveButton";
import UserMenu from "~/components/UserMenu";
import WorkspaceMenu from "~/components/WorkspaceMenu";
import { useModal } from "~/providers/modal";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

interface SideNavigationProps {
  user: UserType;
  isLoading: boolean;
  onCloseSideNav?: () => void;
}

interface UserType {
  email?: string | null | undefined;
  image?: string | null | undefined;
}

export default function SideNavigation({
  user,
  isLoading,
  onCloseSideNav,
}: SideNavigationProps) {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInitialised, setIsInitialised] = useState(false);
  const { openModal } = useModal();

  const { data: workspaceData } = api.workspace.byId.useQuery({
    workspacePublicId: workspace.publicId,
  });

  const subscriptions = workspaceData?.subscriptions as
    | Subscription[]
    | undefined;

  useEffect(() => {
    const savedState = localStorage.getItem("kan_sidebar-collapsed");
    if (savedState !== null) {
      setIsCollapsed(Boolean(JSON.parse(savedState)));
    }
    setIsInitialised(true);
  }, []);

  useEffect(() => {
    if (isInitialised) {
      localStorage.setItem(
        "kan_sidebar-collapsed",
        JSON.stringify(isCollapsed),
      );
    }
  }, [isCollapsed, isInitialised]);

  const { pathname } = router;

  const { resolvedTheme } = useTheme();

  const isCloudEnv = env("NEXT_PUBLIC_KAN_ENV") === "cloud";

  const isDarkMode = resolvedTheme === "dark";

  const navigation: {
    name: string;
    href: string;
    icon: object;
    keyboardShortcut: KeyboardShortcut;
  }[] = [
    {
      name: t`Boards`,
      href: "/boards",
      icon: isDarkMode ? boardsIconDark : boardsIconLight,
      keyboardShortcut: {
        type: "SEQUENCE",
        strokes: [{ key: "G" }, { key: "B" }],
        action: () => router.push("/boards"),
        group: "NAVIGATION",
        description: t`Go to boards`,
      },
    },
    {
      name: t`Templates`,
      href: "/templates",
      icon: isDarkMode ? templatesIconDark : templatesIconLight,
      keyboardShortcut: {
        type: "SEQUENCE",
        strokes: [{ key: "G" }, { key: "T" }],
        action: () => router.push("/templates"),
        group: "NAVIGATION",
        description: t`Go to templates`,
      },
    },
    {
      name: t`Members`,
      href: "/members",
      icon: isDarkMode ? membersIconDark : membersIconLight,
      keyboardShortcut: {
        type: "SEQUENCE",
        strokes: [{ key: "G" }, { key: "M" }],
        action: () => router.push("/members"),
        group: "NAVIGATION",
        description: t`Go to members`,
      },
    },
    {
      name: t`Settings`,
      href: "/settings",
      icon: isDarkMode ? settingsIconDark : settingsIconLight,
      keyboardShortcut: {
        type: "SEQUENCE",
        strokes: [{ key: "G" }, { key: "S" }],
        action: () => router.push("/settings"),
        group: "NAVIGATION",
        description: t`Go to settings`,
      },
    },
  ];

  const toggleCollapse = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      <nav
        className={twMerge(
          "flex h-full w-64 flex-col justify-between border-r border-light-300 bg-light-100 p-3 dark:border-dark-300 dark:bg-dark-100 md:border-r-0 md:py-0 md:pl-0",
          isCollapsed && "md:w-auto",
        )}
      >
        <div>
          <div className="hidden h-[45px] items-center justify-between pb-3 md:flex">
            {!isCollapsed && (
              <Link href="/" className="block">
                <h1 className="pl-2 text-[16px] font-bold tracking-tight text-neutral-900 dark:text-dark-1000">
                  kan.bn
                </h1>
              </Link>
            )}
            <Button
              onClick={toggleCollapse}
              className={twMerge(
                "flex h-8 items-center justify-center rounded-md hover:bg-light-200 dark:hover:bg-dark-200",
                isCollapsed ? "w-full" : "w-8",
              )}
            >
              {isCollapsed ? (
                <TbLayoutSidebarLeftExpand
                  size={18}
                  className="text-light-900 dark:text-dark-900"
                />
              ) : (
                <TbLayoutSidebarLeftCollapse
                  size={18}
                  className="text-light-900 dark:text-dark-900"
                />
              )}
            </Button>
          </div>
          <div className="mx-1 mb-4 hidden w-auto border-b border-light-300 dark:border-dark-400 md:block" />

          <WorkspaceMenu isCollapsed={isCollapsed} />
          <ul role="list" className="space-y-1">
            {navigation.map((item) => (
              <li key={item.name}>
                <ReactiveButton
                  href={item.href}
                  current={pathname.includes(item.href)}
                  name={item.name}
                  json={item.icon}
                  isCollapsed={isCollapsed}
                  onCloseSideNav={onCloseSideNav}
                  keyboardShortcut={item.keyboardShortcut}
                />
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2">
          <UserMenu
            email={user.email ?? ""}
            imageUrl={user.image ?? undefined}
            isLoading={isLoading}
            isCollapsed={isCollapsed}
            onCloseSideNav={onCloseSideNav}
          />
          {isCloudEnv &&
            !hasActiveSubscription(subscriptions, "pro") &&
            !hasActiveSubscription(subscriptions, "team") && (
              <div className={twMerge(isCollapsed && "flex justify-center")}>
                {isCollapsed ? (
                  <ButtonComponent
                    iconLeft={<HiBolt />}
                    variant="secondary"
                    href="/settings/workspace?upgrade=pro"
                    aria-label="Upgrade to Pro"
                    title="Upgrade to Pro"
                    iconOnly
                    onClick={() => openModal("UPGRADE_TO_PRO")}
                  />
                ) : (
                  <ButtonComponent
                    iconLeft={<HiBolt />}
                    fullWidth
                    variant="secondary"
                    href="/settings/workspace?upgrade=pro"
                    onClick={() => openModal("UPGRADE_TO_PRO")}
                  >
                    {t`Upgrade to Pro`}
                  </ButtonComponent>
                )}
              </div>
            )}
        </div>
      </nav>
    </>
  );
}
