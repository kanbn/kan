import "~/styles/globals.css";

import type { AppType } from "next/app";
import { Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { env } from "next-runtime-env";

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
        <script
          defer
          src="https://cloud.umami.is/script.js"
          data-website-id={env("NEXT_PUBLIC_UMAMI_ID")}
        />
      )}
      <script src="/__ENV.js" />
      <main className="font-sans">
        <ThemeProvider>
          <ModalProvider>
            <PopupProvider>
              <Component {...pageProps} />
            </PopupProvider>
          </ModalProvider>
        </ThemeProvider>
      </main>
    </>
  );
};

export default api.withTRPC(MyApp);
