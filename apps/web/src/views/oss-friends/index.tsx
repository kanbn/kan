import Link from "next/link";
import { t } from "@lingui/core/macro";
import { HiArrowUpRight } from "react-icons/hi2";

import { PageHead } from "~/components/PageHead";
import Layout from "../home/components/Layout";

export interface OSSFriend {
  name: string;
  description: string;
  href: string;
}

export default function OSSFriendsView({
  ossFriends,
}: {
  ossFriends: OSSFriend[];
}) {
  return (
    <Layout>
      <PageHead title={`${t`Open source friends`} | kan.bn`} />

      <div className="px-4 pt-36 pb-24">
        <h1 className="text-2xl font-semibold tracking-[-0.03em] text-light-1000 lg:text-3xl dark:text-dark-1000">
          {t`Open source friends`}
        </h1>
        <p className="mt-3 text-sm text-light-900 dark:text-dark-800">
          {t`Some of our favourite open source projects.`}
        </p>

        <div className="mt-12 grid grid-cols-1 gap-px overflow-hidden rounded-3xl border border-light-300 bg-light-300 sm:grid-cols-2 lg:grid-cols-3 dark:border-dark-200 dark:bg-dark-200">
          {ossFriends.map((friend) => (
            <Link
              key={friend.href}
              href={friend.href}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex flex-col gap-2 bg-light-50 p-6 transition-colors hover:bg-light-100 dark:bg-dark-50 dark:hover:bg-dark-100"
            >
              <span className="flex items-center justify-between font-medium tracking-tight text-light-1000 dark:text-dark-1000">
                {friend.name}
                <HiArrowUpRight className="h-3.5 w-3.5 text-light-900 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 dark:text-dark-800" />
              </span>
              <span className="text-sm text-pretty text-light-900 dark:text-dark-800">
                {friend.description}
              </span>
            </Link>
          ))}
          {Array.from({ length: (3 - (ossFriends.length % 3)) % 3 }, (_, i) => (
            <div
              key={`lg-filler-${i}`}
              className="hidden bg-light-50 lg:block dark:bg-dark-50"
            />
          ))}
          {ossFriends.length % 2 === 1 && (
            <div className="hidden bg-light-50 sm:block lg:hidden dark:bg-dark-50" />
          )}
        </div>
      </div>
    </Layout>
  );
}
