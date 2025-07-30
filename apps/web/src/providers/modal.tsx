import { createContext, useContext, useState } from "react";

interface ModalState {
  contentType: string;
  entityId?: string;
  entityLabel?: string;
}

interface Props {
  children: React.ReactNode;
}

type ModalContextType = {
  isOpen: boolean;
  openModal: (
    contentType: string,
    entityId?: string,
    entityLabel?: string,
  ) => void;
  closeModal: () => void;
  closeModals: (count: number) => void;
  clearAllModals: () => void;
  modalContentType: string;
  entityId: string;
  entityLabel: string;
  modalStates: Record<string, any>;
  setModalState: (modalType: string, state: any) => void;
  getModalState: (modalType: string) => any;
  clearModalState: (modalType: string) => void;
  clearAllModalStates: () => void;
};

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<Props> = ({ children }) => {
  const [modalStack, setModalStack] = useState<ModalState[]>([]);
  const [modalStates, setModalStates] = useState<Record<string, any>>({});

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

  const closeModals = (count: number) => {
    setModalStack(prev => {
      const newLength = Math.max(0, prev.length - count);
      return prev.slice(0, newLength);
    });
  };

  const clearAllModals = () => {
    setModalStack([]);
  };

  const setModalState = (modalType: string, state: any) => {
    setModalStates(prev => ({
      ...prev,
      [modalType]: state
    }));
  };

  const getModalState = (modalType: string) => {
    return modalStates[modalType];
  };

  const clearModalState = (modalType: string) => {
    setModalStates(prev => {
      const newStates = { ...prev };
      delete newStates[modalType];
      return newStates;
    });
  };

  const clearAllModalStates = () => {
    setModalStates({});
  };

  return (
    <ModalContext.Provider
      value={{
        isOpen,
        openModal,
        closeModal,
        closeModals,
        clearAllModals,
        modalContentType,
        entityId,
        entityLabel,
        modalStates,
        setModalState,
        getModalState,
        clearModalState,
        clearAllModalStates,
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
