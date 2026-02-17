import Link from "next/link";
import { useRouter } from "next/router";
import {
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
} from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useEffect, useState } from "react";
import {
  HiChevronDown,
  HiOutlineBanknotes,
  HiOutlineBolt,
  HiOutlineCodeBracketSquare,
  HiOutlineRectangleGroup,
  HiOutlineShieldCheck,
  HiOutlineUser,
} from "react-icons/hi2";
import { usePermissions } from "~/hooks/usePermissions";
import { useWorkspace } from "~/providers/workspace";

interface SettingsLayoutProps {
  children: React.ReactNode;
  currentTab: string;
}

export function SettingsLayout({ children, currentTab }: SettingsLayoutProps) {
  const router = useRouter();
  const { workspace } = useWorkspace();
  const { canViewWorkspace, canEditWorkspace } = usePermissions();
  const [selectedTabIndex, setSelectedTabIndex] = useState(0);

  const isAdmin = workspace.role === "admin";

  const settingsTabs = [
    {
      key: "account",
      icon: <HiOutlineUser />,
      label: t`Account`,
      condition: true,
    },
    {
      key: "workspace",
      icon: <HiOutlineRectangleGroup />,
      label: t`Workspace`,
      condition: canViewWorkspace,
    },
    {
      key: "permissions",
      icon: <HiOutlineShieldCheck />,
      label: t`Permissions`,
      condition: isAdmin,
    },
    {
      key: "billing",
      label: t`Billing`,
      icon: <HiOutlineBanknotes />,
      condition: env("NEXT_PUBLIC_KAN_ENV") === "cloud" && isAdmin,
    },
    {
      key: "api",
      icon: <HiOutlineCodeBracketSquare />,
      label: t`API`,
      condition: true,
    },
    {
      key: "webhooks",
      icon: <HiOutlineBolt />,
      label: t`Webhooks`,
      condition: isAdmin,
    },
    {
      key: "integrations",
      icon: <HiOutlineCodeBracketSquare />,
      label: t`Integrations`,
      condition: canEditWorkspace,
    },
  ];

  const availableTabs = settingsTabs.filter((tab) => tab.condition);

  // Update selected tab when currentTab prop changes
  useEffect(() => {
    const tabIndex = availableTabs.findIndex((tab) => tab.key === currentTab);
    if (tabIndex !== -1) {
      setSelectedTabIndex(tabIndex);
    }
  }, [currentTab, availableTabs]);

  const isTabActive = (tabKey: string) => {
    return currentTab === tabKey;
  };

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      <div className="h-full max-h-[calc(100vdh-3rem)] overflow-y-auto md:max-h-[calc(100vdh-4rem)]">
        <div className="m-auto max-w-[1100px] px-5 py-6 md:px-28 md:py-12">
          <div className="mb-8 flex w-full justify-between">
            <h1 className="font-bold tracking-tight text-neutral-900 dark:text-dark-1000 sm:text-[1.2rem]">
              {t`Settings`}
            </h1>
          </div>

          <div className="focus:outline-none">
            <div className="sm:hidden">
              {/* Mobile dropdown */}
              <Listbox
                value={selectedTabIndex}
                onChange={(index) => {
                  const tabKey = availableTabs[index]?.key;
                  if (tabKey) {
                    void router.push(`/settings/${tabKey}`);
                  }
                }}
              >
                <div className="relative mb-4">
                  <ListboxButton className="w-full appearance-none rounded-lg border-0 bg-light-50 py-2 pl-3 pr-10 text-left text-sm text-light-1000 shadow-sm ring-1 ring-inset ring-light-300 focus:ring-2 focus:ring-inset focus:ring-light-400 dark:bg-dark-50 dark:text-dark-1000 dark:ring-dark-300 dark:focus:ring-dark-500">
                    {availableTabs[selectedTabIndex]?.label ?? "Select a tab"}
                    <HiChevronDown
                      aria-hidden="true"
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-light-900 dark:text-dark-900"
                    />
                  </ListboxButton>
                  <ListboxOptions className="absolute z-10 mt-1 w-full rounded-lg bg-light-50 py-1 text-sm shadow-lg ring-1 ring-inset ring-light-300 dark:bg-dark-50 dark:ring-dark-300">
                    {availableTabs.map((tab) => (
                      <ListboxOption
                        key={tab.key}
                        value={availableTabs.indexOf(tab)}
                        className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-light-1000 dark:text-dark-1000"
                      >
                        {tab.label}
                      </ListboxOption>
                    ))}
                  </ListboxOptions>
                </div>
              </Listbox>
            </div>
            <div className="hidden sm:block">
              <div className="border-b border-gray-200 dark:border-white/10">
                <nav
                  aria-label="Tabs"
                  className="-mb-px flex space-x-8 focus:outline-none"
                >
                  {availableTabs.map((tab) => (
                    <Link
                      key={tab.key}
                      href={`/settings/${tab.key}`}
                      className={`whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors focus:outline-none ${
                        isTabActive(tab.key)
                          ? "border-light-1000 text-light-1000 dark:border-dark-1000 dark:text-dark-1000"
                          : "border-transparent text-light-900 hover:border-light-950 hover:text-light-950 dark:text-dark-900 dark:hover:border-white/20 dark:hover:text-dark-950"
                      }`}
                    >
                      {tab.label}
                    </Link>
                  ))}
                </nav>
              </div>
            </div>
            <div className="focus:outline-none">{children}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
