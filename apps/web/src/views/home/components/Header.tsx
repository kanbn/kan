import Link from "next/link";
import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

import Button from "~/components/Button";

const Header = ({ isLoggedIn }: { isLoggedIn: boolean }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const desktopMenuItems = [
    {
      label: t`Roadmap`,
      href: "/kan/roadmap",
      openInNewTab: true,
    },
    { label: t`Features`, href: "/#features" },
    { label: t`Pricing`, href: "/pricing" },
    {
      label: t`Docs`,
      href: "https://docs.kan.bn",
      openInNewTab: true,
    },
  ];

  const mobileMenuItems = [
    {
      label: t`Roadmap`,
      href: "/kan/roadmap",
      openInNewTab: true,
      group: "Product",
    },
    { label: t`Features`, href: "/#features", group: "Product" },
    { label: t`Pricing`, href: "/pricing", group: "Product" },
    {
      label: t`Documentation`,
      href: "https://docs.kan.bn",
      openInNewTab: true,
      group: "Resources",
    },
    { label: t`FAQ`, href: "/#faq", group: "Resources" },
    { label: t`Contact`, href: "mailto:support@kan.bn", group: "Resources" },
  ];

  // Group mobile menu items by their group property
  const groupedMenuItems = mobileMenuItems.reduce(
    (acc, item) => {
      (acc[item.group] ??= []).push(item);
      return acc;
    },
    {} as Record<string, typeof mobileMenuItems>,
  );

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  useEffect(() => {
    document.documentElement.classList.toggle("overflow-hidden", isMenuOpen);
    document.body.classList.toggle("overflow-hidden", isMenuOpen);
    return () => {
      document.documentElement.classList.remove("overflow-hidden");
      document.body.classList.remove("overflow-hidden");
    };
  }, [isMenuOpen]);

  return (
    <>
      <div
        className={twMerge(
          "fixed z-50 flex w-full transition-all duration-500",
        )}
      >
        <div className="flex h-[4rem] min-h-[4rem] w-full border-b border-light-300 bg-light-50/80 px-5 py-2 align-middle opacity-100 shadow-sm backdrop-blur-[10px] transition-all duration-500 dark:border-dark-300 dark:bg-dark-50/90">
          <div className="mx-auto flex w-full max-w-[1100px] items-center justify-between lg:px-4">
            <div className="my-auto flex items-center justify-between">
              <Link href="/">
                <h1 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-dark-1000 lg:w-[200px]">
                  kan.bn
                </h1>
              </Link>
            </div>
            {/* Desktop Menu */}
            <div className="hidden justify-center gap-10 dark:text-dark-1000 lg:flex">
              {desktopMenuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  target={item.openInNewTab ? "_blank" : undefined}
                  rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                  className="text-sm font-bold"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center justify-end gap-4 lg:w-[200px]">
              <div className="justify-end gap-2">
                {isLoggedIn ? (
                  <Button href="/boards">{t`Go to app`}</Button>
                ) : (
                  <div className="flex items-center justify-end gap-2">
                    <Button href="/login" variant="ghost">
                      {t`Sign in`}
                    </Button>
                    <Button href="/signup">{t`Get started`}</Button>
                  </div>
                )}
              </div>
              {/* Hamburger Menu Button */}
              <button
                onClick={toggleMenu}
                className="relative z-50 p-2 lg:hidden"
                aria-label={t`Toggle menu`}
              >
                <div
                  className={twMerge(
                    "absolute left-1/2 top-1/2 h-[1px] w-4 -translate-x-1/2 -translate-y-[4px] bg-current bg-light-1000 transition-all duration-300 ease-in-out dark:bg-dark-1000",
                    isMenuOpen ? "translate-y-0 rotate-45" : "",
                  )}
                />
                <div
                  className={twMerge(
                    "absolute left-1/2 top-1/2 h-[1px] w-4 -translate-x-1/2 translate-y-[4px] bg-current bg-light-1000 transition-all duration-300 ease-in-out dark:bg-dark-1000",
                    isMenuOpen ? "translate-y-0 -rotate-45" : "",
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 transform transition-all duration-500 lg:hidden ${
          isMenuOpen
            ? "translate-x-0 opacity-100"
            : "pointer-events-none translate-x-0 opacity-0"
        }`}
      >
        <div className="absolute inset-0 bg-light-50/80 bg-white backdrop-blur-[15px] dark:bg-dark-50 dark:bg-dark-50/90">
          <div className="mt-[6rem] flex h-full flex-col space-y-8 px-5">
            {Object.entries(groupedMenuItems).map(([group, items]) => (
              <div key={group} className="flex flex-col space-y-4">
                <div className="text-sm font-bold text-light-900 dark:text-dark-900">
                  {group}
                </div>
                {items.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    target={item.openInNewTab ? "_blank" : undefined}
                    rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                    className="transform text-lg font-bold text-light-1000 dark:text-dark-1000"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
