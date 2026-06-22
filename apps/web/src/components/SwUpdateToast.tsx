import { Transition } from "@headlessui/react";
import { HiOutlineArrowPath } from "react-icons/hi2";

import { useSwUpdate } from "~/hooks/useSwUpdate";

export const SwUpdateToast = () => {
  const { updateReady, applyUpdate } = useSwUpdate();

  return (
    <div
      aria-live="assertive"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-[100000] flex justify-end p-4"
    >
      <Transition
        show={updateReady}
        enter="ease-out duration-300"
        enterFrom="opacity-0 translate-y-4"
        enterTo="opacity-100 translate-y-0"
        leave="ease-in duration-200"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-4"
      >
        <div className="pointer-events-auto flex w-full max-w-[360px] items-center gap-3 rounded-xl border border-light-400 bg-light-50 p-4 shadow-lg dark:border-dark-300 dark:bg-dark-100">
          <HiOutlineArrowPath
            aria-hidden="true"
            className="h-5 w-5 flex-shrink-0 text-blue-500"
          />
          <div className="min-w-0 flex-1">
            <p className="text-[12px] font-bold text-neutral-900 dark:text-dark-950">
              A new version is available
            </p>
            <p className="mt-0.5 text-[12px] text-neutral-500 dark:text-dark-900">
              Refresh to get the latest update.
            </p>
          </div>
          <button
            type="button"
            onClick={applyUpdate}
            className="flex-shrink-0 rounded-md bg-black px-3 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#333] dark:bg-white dark:text-black dark:hover:bg-[#f0f0f0]"
          >
            Refresh
          </button>
        </div>
      </Transition>
    </div>
  );
};
