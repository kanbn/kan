import Link from "next/link";

import { authClient } from "@kan/auth/client";

import FeedbackButton from "./FeedbackButton";
import MobileBottomNav from "./MobileBottomNav";
import MobileTopNav, { MobileNavProvider } from "./MobileTopNav";
import SideNavigation from "./SideNavigation";

export default function Dashboard(props: { children: React.ReactNode }) {
  const { data: session, isPending: sessionLoading } = authClient.useSession();

  return (
    <>
      <style jsx global>{`
        html {
          height: 100vh;
          overflow: hidden;
        }
      `}</style>
      <div className="hidden h-screen min-w-[800px] flex-col items-center bg-light-100 dark:bg-dark-50 md:flex">
        <div className="m-auto flex h-16 min-h-16 w-full justify-between border-b border-light-600 px-5 py-2 align-middle dark:border-dark-400">
          <div className="my-auto flex w-full items-center justify-between">
            <Link href="/">
              <h1 className="text-lg font-bold tracking-tight text-neutral-900 dark:text-dark-1000">
                kan.bn
              </h1>
            </Link>
            <FeedbackButton />
          </div>
        </div>

        <div className="hidden h-full w-full md:flex">
          <SideNavigation
            user={{ email: session?.user?.email, image: session?.user?.image }}
            isLoading={sessionLoading}
          />
          <div className="w-full overflow-hidden">{props.children}</div>
        </div>
      </div>

      <div className="block h-[100dvh] w-full md:hidden">
        <MobileNavProvider>
          <MobileTopNav />
        </MobileNavProvider>
        {props.children}
        <MobileBottomNav />
      </div>
    </>
  );
}
