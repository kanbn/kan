import "~/styles/globals.css";
import "~/utils/i18n";

import type { AppType } from "next/app";
import { Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import Script from "next/script";
import { env } from "next-runtime-env";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import { useEffect } from "react";

import { LinguiProviderWrapper } from "~/providers/lingui";
import { ModalProvider } from "~/providers/modal";
import { PopupProvider } from "~/providers/popup";
import { ThemeProvider } from "~/providers/theme";
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

const MyApp: AppType = ({ Component, pageProps }) => {
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
        <LinguiProviderWrapper>
          <ThemeProvider>
            <ModalProvider>
              <PopupProvider>
                {posthogKey ? (
                  <PostHogProvider client={posthog}>
                    <Component {...pageProps} />
                  </PostHogProvider>
                ) : (
                  <Component {...pageProps} />
                )}
              </PopupProvider>
            </ModalProvider>
          </ThemeProvider>
        </LinguiProviderWrapper>
      </main>
    </>
  );
};

export default api.withTRPC(MyApp);
