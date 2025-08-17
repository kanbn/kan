import PatternedBackground from "~/components/PatternedBackground";
import { useTheme } from "next-themes";
import Footer from "./Footer";
import Header from "./Header";
import { authClient } from "@kan/auth/client";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { theme } = useTheme();

  const { data: session } = authClient.useSession();

  const isLoggedIn = !!session?.user;

  const isDarkMode = theme === "dark";

  return (
    <>
      <style jsx global>{`
        html {
          scroll-behavior: smooth;
          background-color: ${!isDarkMode ? "hsl(0deg 0% 97.3%)" : "#161616"};
        }
      `}</style>
      <div className="mx-auto flex h-full min-h-screen min-w-[375px] flex-col items-center bg-light-100 dark:bg-dark-50">
        <PatternedBackground />
        <div className="z-10 mx-auto h-full w-full max-w-[1100px]">
          <Header isLoggedIn={isLoggedIn} />
          {children}
        </div>
        <Footer />
      </div>
    </>
  );
}
