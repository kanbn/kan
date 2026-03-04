import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type FontSize = "small" | "medium" | "large";

const fontSizeMap: Record<FontSize, string> = {
  small: "14px",
  medium: "16px",
  large: "18px",
};

interface FontSizeContextProps {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
}

const FontSizeContext = createContext<FontSizeContextProps | undefined>(
  undefined,
);

export const FontSizeProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [fontSize, setFontSizeState] = useState<FontSize>("small");

  const setFontSize = (size: FontSize) => {
    document.documentElement.style.fontSize = fontSizeMap[size];
    localStorage.setItem("fontSize", size);
    setFontSizeState(size);
  };

  useEffect(() => {
    const stored = localStorage.getItem("fontSize") as FontSize | null;
    const size = stored && fontSizeMap[stored] ? stored : "small";
    document.documentElement.style.fontSize = fontSizeMap[size];
    setFontSizeState(size);
  }, []);

  return (
    <FontSizeContext.Provider value={{ fontSize, setFontSize }}>
      {children}
    </FontSizeContext.Provider>
  );
};

export const useFontSize = (): FontSizeContextProps => {
  const context = useContext(FontSizeContext);
  if (!context) {
    throw new Error("useFontSize must be used within a FontSizeProvider");
  }
  return context;
};
