import Link from "next/link";
import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import { twMerge } from "tailwind-merge";

import Button from "~/components/Button";

const Header = ({ isLoggedIn }: { isLoggedIn: boolean }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const menuItems = [
    { label: t`Roadmap`, href: "/kan/roadmap", openInNewTab: true },
    { label: t`Features`, href: "/#features" },
    { label: t`Pricing`, href: "/pricing" },
    { label: t`Docs`, href: "https://docs.kan.bn", openInNewTab: true },
  ];

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
    document.body.style.overflow = !isMenuOpen ? "hidden" : "";
  };

  return (
    <>
      <div
        className={twMerge(
          "fixed z-50 m-auto flex w-full transition-all duration-500 lg:max-w-[1100px] lg:px-4 lg:pt-4",
        )}
      >
        <div
          className={twMerge(
            "m-auto flex h-[4rem] min-h-[4rem] w-full px-5 py-2 align-middle transition-all duration-500 lg:rounded-3xl lg:border lg:border-transparent",
            isScrolled &&
              "border-b border-light-300 bg-light-50/80 opacity-100 shadow-sm backdrop-blur-[10px] dark:border-dark-300 dark:bg-dark-50/90 lg:rounded-2xl lg:border",
            !isScrolled && "bg-transparent opacity-90",
          )}
        >
          <div className="flex w-full items-center justify-between lg:px-4">
            <div className="my-auto flex items-center justify-between">
              <Link href="/">
                <h1 className="w-[200px] text-lg font-bold tracking-tight text-neutral-900 dark:text-dark-1000">
                  kan.bn
                </h1>
              </Link>
            </div>
            {/* Desktop Menu */}
            <div className="hidden justify-center gap-10 dark:text-dark-1000 lg:flex">
              {menuItems.map((item) => (
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
            {/* Hamburger Menu Button */}
            <button
              onClick={toggleMenu}
              className="z-50 p-2 lg:hidden"
              aria-label={t`Toggle menu`}
            >
              <div
                className={twMerge(
                  "my-[5px] h-[2px] w-4 bg-current bg-light-1000 transition-all dark:bg-dark-1000",
                  isMenuOpen ? "translate-y-[7px] rotate-45" : "",
                )}
              />
              <div
                className={twMerge(
                  "my-[5px] ml-[4px] h-[2px] w-3 bg-current bg-light-1000 transition-all dark:bg-dark-1000",
                  isMenuOpen ? "opacity-0" : "",
                )}
              />
              <div
                className={twMerge(
                  "my-[5px] h-[2px] w-4 bg-current bg-light-1000 transition-all dark:bg-dark-1000",
                  isMenuOpen ? "-translate-y-[7px] -rotate-45" : "",
                )}
              />
            </button>
            <div className="hidden w-[200px] justify-end gap-2 lg:flex">
              {isLoggedIn ? (
                <Button href="/boards">{t`Go to app`}</Button>
              ) : (
                <>
                  <Button href="/login" variant="ghost">
                    {t`Sign in`}
                  </Button>
                  <Button href="/signup">{t`Get started`}</Button>
                </>
              )}
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
        <div className="absolute inset-0 bg-white dark:bg-dark-100">
          <div className="flex h-full flex-col items-center justify-center space-y-8">
            {menuItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                target={item.openInNewTab ? "_blank" : undefined}
                rel={item.openInNewTab ? "noopener noreferrer" : undefined}
                className="transform text-xl font-bold text-light-1000 transition-all duration-300 hover:scale-105 dark:text-dark-1000"
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-8 flex flex-col gap-4">
              {isLoggedIn ? (
                <Button href="/boards" onClick={toggleMenu}>
                  {t`Go to app`}
                </Button>
              ) : (
                <>
                  <Button href="/login" variant="ghost" onClick={toggleMenu}>
                    {t`Sign in`}
                  </Button>
                  <Button href="/signup" onClick={toggleMenu}>
                    {t`Get started`}
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Header;
