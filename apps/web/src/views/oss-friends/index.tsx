import Link from "next/link";
import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";

import Button from "~/components/Button";
import { PageHead } from "~/components/PageHead";
import Layout from "../home/components/Layout";

interface OSSFriend {
  name: string;
  description: string;
  href: string;
}

interface OSSFriendsResponse {
  data: OSSFriend[];
}

export default function OSSFriendsView() {
  const [ossFriends, setOSSFriends] = useState<OSSFriend[]>([]);
  const fetchOSSFriends = async (): Promise<OSSFriend[]> => {
    try {
      const response = await fetch("/api/oss-friends");

      if (!response.ok) {
        throw new Error("Failed to fetch OSS friends");
      }
      const { data } = (await response.json()) as OSSFriendsResponse;

      return data;
    } catch (error) {
      console.error("Error fetching OSS friends:", error);
      return [];
    }
  };

  useEffect(() => {
    async function fetchData() {
      const data = await fetchOSSFriends();
      setOSSFriends(data);
    }
    void fetchData();
  }, []);

  return (
    <Layout>
      <PageHead title={`${t`OSS Friends`} | kan.bn`} />

      <div className="flex h-full w-full flex-col lg:pt-[5rem]">
        <div className="w-full pb-10 pt-32">
          <div className="flex flex-col items-center justify-center px-4 pb-10">
            <p className="mt-4 text-center text-3xl font-bold text-light-1000 dark:text-dark-1000 lg:text-3xl">
              {t`Open Source Friends`}
            </p>
            <p className="text:md lg:text-md mt-4 max-w-[500px] text-center text-light-950 dark:text-dark-900">
              {t`Check out some of our favorite open source projects.`}
            </p>
          </div>
        </div>
        <div className="mx-auto w-full max-w-7xl px-4 pb-24">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {ossFriends.map((friend, idx) => {
              return (
                <div
                  key={`oss-friend-${idx}`}
                  className="group relative rounded-2xl border border-light-200 bg-light-50 p-6 transition-all duration-200 hover:shadow-sm dark:border-dark-200 dark:bg-dark-50"
                >
                  <div className="mb-4 flex flex-col gap-2">
                    <Link
                      href={friend.href}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <h3 className="text-lg font-semibold text-light-1000 dark:text-dark-1000">
                        {friend.name}
                      </h3>
                    </Link>

                    <p className="text-sm leading-relaxed text-light-900 dark:text-dark-900">
                      {friend.description}
                    </p>
                  </div>
                  <Button
                    href={friend.href}
                    variant="secondary"
                    rel="noopener noreferrer"
                    size="sm"
                  >
                    {t`Learn more`}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Layout>
  );
}
