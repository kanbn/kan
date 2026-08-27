import type { ReactNode } from "react";
import { I18nProvider } from "@lingui/react";
import { env } from "next-runtime-env";
import { createContext, useContext, useEffect, useState } from "react";

import type { Locale } from "~/locales";
import { defaultLocale, locales } from "~/locales";
import { activateLocale, i18n, initializeI18n } from "~/utils/i18n";

interface LinguiContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  availableLocales: Locale[];
}

const LinguiContext = createContext<LinguiContextType | undefined>(undefined);

export function useLinguiContext() {
  const context = useContext(LinguiContext);
  if (!context) {
    throw new Error("useLinguiContext must be used within a LinguiProvider");
  }
  return context;
}

interface LinguiProviderProps {
  children: ReactNode;
  initialLocale?: Locale;
}

function detectBrowserLocale(availableLocales: readonly string[]): Locale {
  if (typeof navigator === "undefined") {
    return defaultLocale;
  }

  const browserLanguages = navigator.languages || [navigator.language];

  for (const browserLang of browserLanguages) {
    const langCode = browserLang.split("-")[0];

    if (langCode && availableLocales.includes(langCode.toLowerCase())) {
      return langCode.toLowerCase() as Locale;
    }
  }

  return defaultLocale;
}

export function LinguiProviderWrapper({
  children,
  initialLocale = defaultLocale,
}: LinguiProviderProps) {
  const [locale, setLocale] = useState<Locale>(defaultLocale);
  const [isHydrated, setIsHydrated] = useState(false);

  initializeI18n();

  useEffect(() => {
    const savedLocale = localStorage.getItem("locale") as Locale;

    if (savedLocale && locales.includes(savedLocale)) {
      setLocale(savedLocale);
    } else {
      const configuredDefault = env("NEXT_PUBLIC_DEFAULT_LOCALE") as
        | Locale
        | undefined;
      if (configuredDefault && locales.includes(configuredDefault)) {
        setLocale(configuredDefault);
      } else {
        const detectedLocale = detectBrowserLocale(locales);
        setLocale(detectedLocale);
      }
    }
    setIsHydrated(true);
  }, [initialLocale]);

  useEffect(() => {
    if (isHydrated && locale !== defaultLocale) {
      activateLocale(locale).then(() => {
        localStorage.setItem("locale", locale);
      });
    } else if (isHydrated) {
      localStorage.setItem("locale", locale);
    }
  }, [locale, isHydrated]);

  return (
    <LinguiContext.Provider
      value={{ locale, setLocale, availableLocales: [...locales] }}
    >
      <I18nProvider i18n={i18n} key={locale}>
        {children}
      </I18nProvider>
    </LinguiContext.Provider>
  );
}
