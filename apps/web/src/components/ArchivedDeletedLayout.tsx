import Link from "next/link";
import { useRouter } from "next/router";
import {
    Listbox,
    ListboxButton,
    ListboxOption,
    ListboxOptions,
} from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import {
    HiChevronDown,
    HiOutlineArchiveBoxXMark,
    HiOutlineTrash,
    HiArrowLeft,
} from "react-icons/hi2";

interface ArchivedDeletedLayoutProps {
    children: React.ReactNode;
    currentTab: string;
    boardPublicId: string;
}

export function ArchivedDeletedLayout({
    children,
    currentTab,
    boardPublicId,
}: ArchivedDeletedLayoutProps) {
    const router = useRouter();
    const [selectedTabIndex, setSelectedTabIndex] = useState(0);

    const tabs = [
        {
            key: "archived",
            icon: <HiOutlineArchiveBoxXMark />,
            label: t`Archived cards`,
        },
        {
            key: "deleted",
            icon: <HiOutlineTrash />,
            label: t`Deleted cards`,
        },
    ];

    // Update selected tab when currentTab prop changes
    useEffect(() => {
        const tabIndex = tabs.findIndex((tab) => tab.key === currentTab);
        if (tabIndex !== -1) {
            setSelectedTabIndex(tabIndex);
        }
    }, [currentTab, tabs]);

    const isTabActive = (tabKey: string) => {
        return currentTab === tabKey;
    };

    return (
        <div className="flex h-full w-full flex-col overflow-hidden">
            <div className="h-full max-h-[calc(100vdh-3rem)] overflow-y-auto md:max-h-[calc(100vdh-4rem)]">
                <div className="m-auto max-w-[1100px] px-5 py-6 md:px-28 md:py-12">
                    <div className="mb-8 flex w-full flex-col">
                        <Link
                            href={`/boards/${boardPublicId}`}
                            className="mb-4 flex w-fit items-center text-sm font-medium text-light-800 hover:text-light-1000 dark:text-dark-800 dark:hover:text-dark-1000"
                        >
                            <HiArrowLeft className="mr-2 h-4 w-4" />
                            {t`Back to board`}
                        </Link>
                    </div>

                    <div className="focus:outline-none">
                        <div className="sm:hidden">
                            {/* Mobile dropdown */}
                            <Listbox
                                value={selectedTabIndex}
                                onChange={(index) => {
                                    const tabKey = tabs[index]?.key;
                                    if (tabKey) {
                                        void router.push(`/boards/${boardPublicId}/${tabKey}`);
                                    }
                                }}
                            >
                                <div className="relative mb-4">
                                    <ListboxButton className="w-full appearance-none rounded-lg border-0 bg-light-50 py-2 pl-3 pr-10 text-left text-sm text-light-1000 shadow-sm ring-1 ring-inset ring-light-300 focus:ring-2 focus:ring-inset focus:ring-light-400 dark:bg-dark-50 dark:text-dark-1000 dark:ring-dark-300 dark:focus:ring-dark-500">
                                        <span className="flex items-center">
                                            <span className="mr-2">
                                                {tabs[selectedTabIndex]?.icon}
                                            </span>
                                            {tabs[selectedTabIndex]?.label ?? "Select a tab"}
                                        </span>
                                        <HiChevronDown
                                            aria-hidden="true"
                                            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-light-900 dark:text-dark-900"
                                        />
                                    </ListboxButton>
                                    <ListboxOptions className="absolute z-10 mt-1 w-full rounded-lg bg-light-50 py-1 text-sm shadow-lg ring-1 ring-inset ring-light-300 dark:bg-dark-50 dark:ring-dark-300">
                                        {tabs.map((tab) => (
                                            <ListboxOption
                                                key={tab.key}
                                                value={tabs.indexOf(tab)}
                                                className="relative cursor-pointer select-none py-2 pl-3 pr-9 text-light-1000 dark:text-dark-1000"
                                            >
                                                <span className="flex items-center">
                                                    <span className="mr-2 text-light-800 dark:text-dark-800">
                                                        {tab.icon}
                                                    </span>
                                                    {tab.label}
                                                </span>
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
                                    {tabs.map((tab) => (
                                        <Link
                                            key={tab.key}
                                            href={`/boards/${boardPublicId}/${tab.key}`}
                                            className={`flex items-center whitespace-nowrap border-b-2 px-1 py-4 text-sm font-medium transition-colors focus:outline-none ${isTabActive(tab.key)
                                                    ? "border-light-1000 text-light-1000 dark:border-dark-1000 dark:text-dark-1000"
                                                    : "border-transparent text-light-900 hover:border-light-950 hover:text-light-950 dark:text-dark-900 dark:hover:border-white/20 dark:hover:text-dark-950"
                                                }`}
                                        >
                                            <span
                                                className={`mr-2 ${isTabActive(tab.key)
                                                        ? "text-light-1000 dark:text-dark-1000"
                                                        : "text-light-800 dark:text-dark-800 group-hover:text-light-950 dark:group-hover:text-dark-950"
                                                    }`}
                                            >
                                                {tab.icon}
                                            </span>
                                            {tab.label}
                                        </Link>
                                    ))}
                                </nav>
                            </div>
                        </div>
                        <div className="focus:outline-none pt-4">{children}</div>
                    </div>
                </div>
            </div>
        </div>
    );
}
