import { authClient } from "@kan/auth/client";

import Footer from "./Footer";
import Header from "./Header";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data: session } = authClient.useSession();

  const isLoggedIn = !!session?.user;

  return (
    <div className="marketing mx-auto flex h-full min-h-screen min-w-[375px] flex-col items-center overflow-x-clip bg-light-100 dark:bg-dark-50">
      <Header isLoggedIn={isLoggedIn} />
      <div className="z-10 mx-auto h-full w-full max-w-[1100px]">
        {children}
      </div>
      <Footer />
    </div>
  );
}
