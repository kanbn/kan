import { useCallback, useEffect, useRef } from "react";

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
  const {
    modalContentType,
    isOpen,
    getModalState,
    setModalState,
    clearModalState,
  } = useModal();

  const isCurrentModal = modalContentType === modalType;
  const savedState = getModalState(modalType) as T | undefined;

  // get current form state (using the saved values if available, otherwise the initial values)
  const formState = savedState || initialValues;

  // Keep refs so the callbacks below stay stable across re-renders.
  const modalTypeRef = useRef(modalType);
  const initialValuesRef = useRef(initialValues);
  const getModalStateRef = useRef(getModalState);
  modalTypeRef.current = modalType;
  initialValuesRef.current = initialValues;
  getModalStateRef.current = getModalState;

  const saveFormState = useCallback(
    (state: Partial<T>) => {
      const type = modalTypeRef.current;
      const currentState =
        getModalStateRef.current(type) ?? initialValuesRef.current;
      const newState = { ...currentState, ...state };
      setModalState(type, newState);
    },
    // setModalState is stable (useCallback with [] deps in ModalProvider)
    [setModalState],
  );

  const clearFormState = useCallback(() => {
    clearModalState(modalTypeRef.current);
  }, [clearModalState]);

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
