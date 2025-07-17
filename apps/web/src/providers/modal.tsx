import { createContext, useContext, useState } from "react";

type ModalContextType = {
  isOpen: boolean;
  openModal: (
    contentType: string,
    entityId?: string,
    entityLabel?: string,
  ) => void;
  closeModal: () => void;
  modalContentType: string;
  entityId: string;
  entityLabel: string;
};

interface Props {
  children: React.ReactNode;
}

interface ModalState {
  contentType: string;
  entityId?: string;
  entityLabel?: string;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<Props> = ({ children }) => {
  const [modalStack, setModalStack] = useState<ModalState[]>([]);

  const isOpen = modalStack.length > 0;
  const currentModal = modalStack[modalStack.length - 1];
  const modalContentType = currentModal?.contentType || "";
  const entityId = currentModal?.entityId || "";
  const entityLabel = currentModal?.entityLabel || "";

  const openModal = (
    contentType: string,
    entityId?: string,
    entityLabel?: string,
  ) => {
    const newModal: ModalState = { contentType, entityId, entityLabel };
    setModalStack(prev => [...prev, newModal]);
  };

  const closeModal = () => {
    setModalStack(prev => {
      if (prev.length <= 1) {
        return [];
      }
      return prev.slice(0, -1);
    });
  };

  return (
    <ModalContext.Provider
      value={{
        isOpen,
        openModal,
        closeModal,
        modalContentType,
        entityId,
        entityLabel,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = () => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};
