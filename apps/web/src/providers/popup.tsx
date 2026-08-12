import { createContext, useCallback, useContext, useState } from "react";

interface PopupContextType {
  isOpen: boolean;
  showPopup: (params: {
    header: string;
    message: string;
    icon: string;
  }) => void;
  hidePopup: () => void;
  popupHeader: string;
  popupMessage: string;
  popupIcon: string;
}

interface Props {
  children: React.ReactNode;
}

const PopupContext = createContext<PopupContextType | undefined>(undefined);

export const PopupProvider: React.FC<Props> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [popupHeader, setPopupHeader] = useState("");
  const [popupMessage, setPopupMessage] = useState("");
  const [popupIcon, setPopupIcon] = useState("");

  const showPopup = useCallback(
    ({
      header,
      message,
      icon,
    }: {
      header: string;
      message: string;
      icon: string;
    }) => {
      setIsOpen(true);
      setPopupHeader(header);
      setPopupMessage(message);
      setPopupIcon(icon);
    },
    [],
  );

  const hidePopup = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <PopupContext.Provider
      value={{
        isOpen,
        showPopup,
        hidePopup,
        popupHeader,
        popupMessage,
        popupIcon,
      }}
    >
      {children}
    </PopupContext.Provider>
  );
};

export const usePopup = () => {
  const context = useContext(PopupContext);
  if (context === undefined) {
    throw new Error("usePopup must be used within a PopupProvider");
  }
  return context;
};
