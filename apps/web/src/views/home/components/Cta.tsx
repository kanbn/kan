import Link from "next/link";
import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";

import Button from "~/components/Button";

const Cta = ({ theme }: { theme: string }) => {
  const [currentWorkspaceSlug, setCurrentWorkspaceSlug] = useState("acme");
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const workspaceSlugs = [
      "acme",
      "henry",
      "cal",
      "documenso",
      "jack",
      "openstatus",
      "florrie",
      "supabase",
    ];

    const interval = setInterval(() => {
      setIsVisible(false);
      setTimeout(() => {
        setCurrentWorkspaceSlug((prev) => {
          const currentIndex = workspaceSlugs.indexOf(prev);
          const nextIndex = (currentIndex + 1) % workspaceSlugs.length;
          const nextSlug = workspaceSlugs[nextIndex];
          if (!nextSlug) return prev;
          return nextSlug;
        });
        setIsVisible(true);
      }, 500);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative isolate overflow-hidden">
      <div className="px-6 py-24 sm:px-6 sm:py-32 lg:px-8">
        <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
          <div
            className={`mb-8 flex items-center gap-2 rounded-2xl border bg-light-50 px-4 py-2 text-center text-sm font-bold text-light-1000 transition-all duration-500 dark:border-dark-300 dark:bg-dark-50 dark:text-dark-950 lg:text-[16px] ${
              isVisible
                ? "translate-y-0 opacity-100"
                : "-translate-y-4 opacity-0"
            }`}
          >
            <p>Costao Lavanderia/{currentWorkspaceSlug}</p>
          </div>
          <h2 className="text-balance text-4xl font-bold tracking-tight text-light-1000 dark:text-dark-1000 sm:text-4xl">
            {t`Get started for free today`}
          </h2>
          <p className="text-md/8 mx-auto mt-6 max-w-[375px] text-pretty text-light-900 dark:text-dark-900">
            {t`Unlimited boards, unlimited lists, unlimited cards. No credit card required.`}
          </p>
          <Link href="/signup">
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Button size="lg">{t`Get started`}</Button>
            </div>
          </Link>
        </div>
      </div>
      <svg
        viewBox="0 0 1024 1024"
        aria-hidden="true"
        className="absolute left-1/2 top-[65%] -z-10 size-[60rem] -translate-x-1/2 [mask-image:radial-gradient(closest-side,white,transparent)] lg:size-[64rem]"
      >
        <circle
          r={512}
          cx={512}
          cy={512}
          fill="url(#8d958450-c69f-4251-94bc-4e091a323369)"
          fillOpacity="0.7"
        />
        <defs>
          <radialGradient id="8d958450-c69f-4251-94bc-4e091a323369">
            <stop
              stopColor={theme === "light" ? "hsl(0deg 0% 52.2%)" : "#505050"}
            />
            <stop
              offset={1}
              stopColor={theme === "light" ? "hsl(0deg 0% 43.5%)" : "#707070"}
            />
          </radialGradient>
        </defs>
      </svg>
    </div>
  );
};

export default Cta;
