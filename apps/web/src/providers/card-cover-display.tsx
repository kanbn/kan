import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useState } from "react";

import type { CardCoverDisplay } from "~/utils/cardCoverDisplay";
import { parseCardCoverDisplay } from "~/utils/cardCoverDisplay";

const STORAGE_KEY = "kan_card-cover-display";

interface CardCoverDisplayContextValue {
  display: CardCoverDisplay;
  isReady: boolean;
  setDisplay: (display: CardCoverDisplay) => void;
}

const CardCoverDisplayContext =
  createContext<CardCoverDisplayContextValue | null>(null);

export function CardCoverDisplayProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [display, setDisplayState] = useState<CardCoverDisplay>("prominent");
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setDisplayState(parseCardCoverDisplay(localStorage.getItem(STORAGE_KEY)));
    setIsReady(true);
  }, []);

  const setDisplay = (nextDisplay: CardCoverDisplay) => {
    localStorage.setItem(STORAGE_KEY, nextDisplay);
    setDisplayState(nextDisplay);
  };

  return (
    <CardCoverDisplayContext.Provider value={{ display, isReady, setDisplay }}>
      {children}
    </CardCoverDisplayContext.Provider>
  );
}

export function useCardCoverDisplay() {
  const context = useContext(CardCoverDisplayContext);
  if (!context) {
    throw new Error(
      "useCardCoverDisplay must be used within a CardCoverDisplayProvider",
    );
  }
  return context;
}
