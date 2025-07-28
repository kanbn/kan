import { useEffect } from "react";
import { useModal } from "~/providers/modal";

interface UseModalFormStateOptions<T> {
  modalType: string;
  initialValues: T;
  resetOnClose?: boolean;
}

export function useModalFormState<T extends Record<string, any>>({
  modalType,
  initialValues,
  resetOnClose = false,
}: UseModalFormStateOptions<T>) {
  const { modalContentType, isOpen, getModalState, setModalState, clearModalState } = useModal();
  
  const isCurrentModal = modalContentType === modalType;
  const savedState = getModalState(modalType) as T | undefined;
  
  // get current form state (using the saved values if available, otherwise the initial values)
  const formState = savedState || initialValues;

  const saveFormState = (state: Partial<T>) => {
    if (!isCurrentModal) return;
    
    const currentState = getModalState(modalType) || initialValues;
    const newState = { ...currentState, ...state };
    setModalState(modalType, newState);
  };

  const clearFormState = () => {
    clearModalState(modalType);
  };

  useEffect(() => {
    if (resetOnClose && !isOpen && savedState) {
      clearModalState(modalType);
    }
  }, [isOpen, resetOnClose, savedState, modalType, clearModalState]);

  return {
    formState,
    saveFormState,
    clearFormState,
    isCurrentModal,
    hasSavedState: !!savedState,
  };
} 