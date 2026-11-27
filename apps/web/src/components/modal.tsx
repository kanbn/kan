import { Dialog, Transition } from "@headlessui/react";
import { Fragment } from "react";
import { twMerge } from "tailwind-merge";

import { useModal } from "~/providers/modal";

interface Props {
  children: React.ReactNode;
  modalSize?: "sm" | "md" | "lg";
  positionFromTop?: "sm" | "md" | "lg";
  isVisible?: boolean;
  closeOnClickOutside?: boolean;
  centered?: boolean;
  className?: string;
}

const Modal: React.FC<Props> = ({
  children,
  modalSize = "sm",
  positionFromTop = "md",
  isVisible,
  closeOnClickOutside,
  centered = false,
  className,
}) => {
  const {
    isOpen,
    closeModal,
    closeOnClickOutside: modalCloseOnClickOutside,
  } = useModal();

  const shouldShow = isVisible ?? isOpen;
  const shouldCloseOnClickOutside =
    closeOnClickOutside ?? modalCloseOnClickOutside;

  const modalSizeMap = {
    sm: "max-w-[400px]",
    md: "max-w-[550px]",
    lg: "max-w-[800px]",
  };

  const positionFromTopMap = {
    sm: "mt-[12vh]",
    md: "mt-[18vh]",
    lg: "mt-[50vh]",
  };

  return (
    <Transition.Root show={shouldShow} as={Fragment}>
      <Dialog
        as="div"
        className="relative z-50"
        onClose={shouldCloseOnClickOutside ? closeModal : () => null}
      >
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-150"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/25 transition-opacity dark:bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 z-50 w-screen overflow-y-auto">
          <div
            className={`flex min-h-full justify-center p-4 text-center sm:p-0 ${centered ? "items-center" : "items-start sm:items-start"}`}
          >
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-150"
              enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-[0.98]"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-100"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-[0.98]"
            >
              <Dialog.Panel
                className={twMerge(
                  `relative ${centered ? "" : positionFromTopMap[positionFromTop]} w-full transform rounded-xl bg-white text-left shadow-3xl-light ring-1 ring-black/5 transition-all dark:bg-dark-100 dark:shadow-3xl-dark dark:ring-white/10 ${modalSizeMap[modalSize]}`,
                  className,
                )}
              >
                {children}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition.Root>
  );
};

export default Modal;
