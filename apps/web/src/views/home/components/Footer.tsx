import Link from "next/link";
import { t } from "@lingui/core/macro";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa";
import { HiComputerDesktop, HiMoon, HiSun } from "react-icons/hi2";

import { LanguageSelector } from "~/components/LanguageSelector";

const ThemeSwitcher = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const options = [
    { value: "system", label: t`System`, Icon: HiComputerDesktop },
    { value: "light", label: t`Light`, Icon: HiSun },
    { value: "dark", label: t`Dark`, Icon: HiMoon },
  ];

  return (
    <div className="inline-flex gap-0.5 rounded-lg p-0.5 ring-1 ring-light-300 dark:ring-dark-300">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          aria-label={label}
          aria-pressed={mounted && theme === value}
          className="rounded-md p-1.5 text-light-900 hover:text-light-1000 aria-pressed:bg-light-200 aria-pressed:text-light-1000 dark:text-dark-800 dark:hover:text-dark-1000 dark:aria-pressed:bg-dark-200 dark:aria-pressed:text-dark-1000"
        >
          <Icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );
};

const StatusMarker = () => (
  <Link
    href="https://kan.openstatus.dev"
    target="_blank"
    rel="noopener noreferrer"
    className="flex w-fit items-center gap-1.5 rounded-full border border-light-300 py-1 pr-2.5 pl-2 text-[11px] text-light-950 hover:bg-light-100 dark:border-dark-300 dark:text-dark-800 dark:hover:bg-dark-100"
  >
    <span className="relative h-1.5 w-1.5">
      <span className="absolute -inset-px animate-[ping_1s_infinite] rounded-full bg-green-500/30"></span>
      <span className="absolute inset-0 rounded-full bg-green-500"></span>
    </span>
    {t`All systems operational`}
  </Link>
);

const Footer = () => {
  const navigation = {
    documentation: [
      { name: t`Getting started`, href: "https://docs.kan.bn/introduction" },
      {
        name: t`Importing from Trello`,
        href: "https://docs.kan.bn/imports/trello",
      },
      {
        name: t`API Reference`,
        href: "https://docs.kan.bn/api-reference/introduction",
      },
      { name: t`MCP server`, href: "https://docs.kan.bn/mcp" },
      {
        name: t`Self-hosting`,
        href: "https://docs.kan.bn/guides/self-hosting/introduction",
      },
    ],
    company: [
      { name: t`Roadmap`, href: "/kan/roadmap" },
      { name: t`GitHub`, href: "https://github.com/kanbn/kan" },
      {
        name: t`Discussions`,
        href: "https://github.com/kanbn/kan/discussions",
      },
      { name: t`Contact`, href: "mailto:support@kan.bn" },
      { name: t`Open source friends`, href: "/oss-friends" },
    ],
    legal: [
      { name: t`Terms of service`, href: "/terms" },
      { name: t`Privacy policy`, href: "/privacy" },
      {
        name: t`License`,
        href: "https://github.com/kanbn/kan?tab=AGPL-3.0-1-ov-file#readme",
      },
    ],
    resources: [
      { name: t`Features`, href: "/#features" },
      { name: t`Pricing`, href: "/pricing" },
      { name: t`FAQs`, href: "/#faq" },
    ],
  };

  const columns = [
    { title: t`Documentation`, items: navigation.documentation },
    { title: t`Resources`, items: navigation.resources },
    { title: t`Company`, items: navigation.company },
    { title: t`Legal`, items: navigation.legal },
  ];

  return (
    <footer className="z-10 w-full border-t border-light-400 dark:border-dark-300">
      <div className="mx-auto max-w-[1100px] px-4 py-16">
        <div className="grid gap-12 lg:grid-cols-[2fr_repeat(4,1fr)]">
          <div>
            <div className="flex items-center gap-2">
              <Link
                href="https://github.com/kanbn/kan"
                target="_blank"
                aria-label="GitHub"
              >
                <FaGithub className="h-8 w-8 rounded-lg border border-light-300 p-1.5 text-light-1000 hover:bg-light-100 dark:border-dark-300 dark:text-dark-1000 dark:hover:bg-dark-100" />
              </Link>
              <ThemeSwitcher />
            </div>
            <div className="mt-4">
              <StatusMarker />
            </div>
            <div className="mt-3">
              <LanguageSelector compact />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4 lg:col-span-4">
            {columns.map((column) => (
              <div key={column.title}>
                <h3 className="text-xs font-medium text-light-1000 dark:text-dark-1000">
                  {column.title}
                </h3>
                <ul role="list" className="mt-3 space-y-2.5">
                  {column.items.map((item) => (
                    <li key={item.name}>
                      <a
                        href={item.href}
                        className="text-xs text-light-950 hover:text-light-1000 dark:text-dark-900 dark:hover:text-dark-1000"
                      >
                        {item.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <p className="mt-16 text-xs text-light-900 dark:text-dark-800">
          © {new Date().getFullYear()} Open Engineering
        </p>
      </div>
    </footer>
  );
};

export default Footer;
