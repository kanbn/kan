import "~/styles/globals.css";
import "~/utils/i18n";

import type { NextPage, Viewport } from "next";
import type { AppProps, AppType } from "next/app";
import type { ReactElement, ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { env } from "next-runtime-env";
import { ThemeProvider } from "next-themes";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

import { InstallPwaButton } from "~/components/InstallPwaButton";
import { SwUpdateToast } from "~/components/SwUpdateToast";
import { TimezoneCapture } from "~/components/TimezoneCapture";
import { FontSizeProvider } from "~/providers/font-size";
import { KeyboardShortcutProvider } from "~/providers/keyboard-shortcuts";
import { LinguiProviderWrapper } from "~/providers/lingui";
import { ModalProvider } from "~/providers/modal";
import { PopupProvider } from "~/providers/popup";
import { api } from "~/utils/api";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
});

export const metadata = {
  title: "Kan",
  description: "The open source Trello alternative",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

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

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      process.env.NODE_ENV === "production"
    ) {
      navigator.serviceWorker
        .register("/sw.js", {
          type: "module",
        })
        .then((reg) => console.log("Service Worker registered", reg))
        .catch((err) => console.error("SW register fail", err));
    }
  }, []);

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
      {env("NEXT_PUBLIC_UMAMI_ID") && (
        <Script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id={env("NEXT_PUBLIC_UMAMI_ID")}
        />
      )}
      <script src="/__ENV.js" />
      <main className="font-sans">
        <InstallPwaButton />
        <SwUpdateToast />
        <TimezoneCapture />
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
      </main>
    </>
  );
};

export default api.withTRPC(MyApp);
