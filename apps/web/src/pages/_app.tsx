import "~/styles/globals.css";
import "~/utils/i18n";

import type { NextPage } from "next";
import type { AppProps, AppType } from "next/app";
import type { ReactElement, ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { env } from "next-runtime-env";
import { ThemeProvider } from "next-themes";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

import { FontSizeProvider } from "~/providers/font-size";
import { KeyboardShortcutProvider } from "~/providers/keyboard-shortcuts";
import { LinguiProviderWrapper } from "~/providers/lingui";
import { ModalProvider } from "~/providers/modal";
import { PopupProvider } from "~/providers/popup";

const queryClient = new QueryClient();

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode;
};

type AppPropsWithLayout = AppProps & {
  Component: NextPageWithLayout;
};

const MyApp: AppType = ({ Component, pageProps }: AppPropsWithLayout) => {
  const posthogKey = env("NEXT_PUBLIC_POSTHOG_KEY");

  useEffect(() => {
    if (posthogKey) {
      posthog.init(posthogKey, {
        api_host: env("NEXT_PUBLIC_POSTHOG_HOST"),
        person_profiles: "identified_only",
        defaults: "2025-05-24",
        loaded: (posthog) => {
          if (process.env.NODE_ENV === "development") posthog.debug();
        },
      });
    }
  }, [posthogKey]);

  const getLayout = Component.getLayout ?? ((page) => page);

  return (
    <>
      <style jsx global>{`
        html {
          font-family: ${jakarta.style.fontFamily};
        }
        body {
          position: relative;
        }
      `}</style>
      <script src="/__ENV.js" />
      <main className="font-sans">
        <QueryClientProvider client={queryClient}>
          <KeyboardShortcutProvider>
            <LinguiProviderWrapper>
              <FontSizeProvider>
                <ThemeProvider
                  attribute="class"
                  defaultTheme="system"
                  enableSystem
                >
                  <ModalProvider>
                    <PopupProvider>
                      {posthogKey ? (
                        <PostHogProvider client={posthog}>
                          {getLayout(<Component {...pageProps} />)}
                        </PostHogProvider>
                      ) : (
                        getLayout(<Component {...pageProps} />)
                      )}
                    </PopupProvider>
                  </ModalProvider>
                </ThemeProvider>
              </FontSizeProvider>
            </LinguiProviderWrapper>
          </KeyboardShortcutProvider>
        </QueryClientProvider>
      </main>
    </>
  );
};

export default MyApp;
