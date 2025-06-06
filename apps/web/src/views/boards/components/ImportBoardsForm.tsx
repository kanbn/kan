import Link from "next/link";
import { Listbox, Transition } from "@headlessui/react";
import { Fragment, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { FaTrello } from "react-icons/fa";
import {
  HiChevronUpDown,
  HiOutlineQuestionMarkCircle,
  HiXMark,
} from "react-icons/hi2";

import Button from "~/components/Button";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";

const sources = [{ source: "Trello" }];

const SelectSource = ({ handleNextStep }: { handleNextStep: () => void }) => {
  const { control, handleSubmit } = useForm({
    defaultValues: {
      source: "Trello",
    },
  });

  const onSubmit = () => {
    handleNextStep();
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5">
        <Controller
          name="source"
          control={control}
          render={({ field }) => (
            <Listbox {...field}>
              {({ open }) => (
                <>
                  <div className="relative">
                    <Listbox.Button className="focus-ring-light-700 block w-full rounded-md border-0 bg-dark-300 bg-white/5 px-4 py-1.5 text-neutral-900 shadow-sm ring-1 ring-inset ring-light-600 focus:ring-2 focus:ring-inset dark:text-dark-1000 dark:ring-dark-700 dark:focus:ring-dark-700 sm:text-sm sm:leading-6">
                      <span className="flex items-center">
                        <FaTrello />
                        <span className="ml-2 block truncate">
                          {field.value}
                        </span>
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <HiChevronUpDown
                          className="h-5 w-5 text-gray-400"
                          aria-hidden="true"
                        />
                      </span>
                    </Listbox.Button>

                    <Transition
                      show={open}
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                    >
                      <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-light-50 py-1 text-base text-neutral-900 shadow-lg ring-1 ring-light-600 ring-opacity-5 focus:outline-none dark:bg-dark-300 dark:text-dark-1000 sm:text-sm">
                        {sources.map(({ source }, index) => (
                          <Listbox.Option
                            key={`source_${index}`}
                            className="relative cursor-default select-none px-1"
                            value={source}
                          >
                            <div className="flex items-center rounded-[5px] p-1 hover:bg-light-200 dark:hover:bg-dark-400">
                              <FaTrello className="ml-1" />
                              <span className="ml-2 block truncate font-normal">
                                {source}
                              </span>
                            </div>
                          </Listbox.Option>
                        ))}
                      </Listbox.Options>
                    </Transition>
                  </div>
                </>
              )}
            </Listbox>
          )}
        />
      </div>

      <div className="mt-12 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <div>
          <Button type="submit">Select source</Button>
        </div>
      </div>
    </form>
  );
};

const ImportTrello: React.FC = () => {
  const utils = api.useUtils();
  const { closeModal } = useModal();
  const { workspace } = useWorkspace();
  const { showPopup } = usePopup();

  const refetchBoards = () => utils.board.all.refetch();

  const { data: boards } = api.trello.getBoards.useQuery();

  const { register: registerBoards, handleSubmit: handleSubmitBoards } =
    useForm({
      defaultValues: Object.fromEntries(
        boards?.map((board) => [board.id, true]) ?? [],
      ),
    });

  const importBoards = api.trello.importBoards.useMutation({
    onSuccess: async () => {
      showPopup({
        header: "Import complete",
        message: "Your boards have been imported.",
        icon: "success",
      });
      try {
        await refetchBoards();
        closeModal();
      } catch (e) {
        console.log(e);
      }
    },
    onError: () => {
      showPopup({
        header: "Import failed",
        message: "Please try again later, or contact customer support.",
        icon: "error",
      });
    },
  });

  const onSubmitBoards = (values: Record<string, boolean>) => {
    const boardIds = Object.keys(values).filter((key) => values[key] === true);

    importBoards.mutate({
      boardIds,
      workspacePublicId: workspace.publicId,
    });
  };

  if (boards?.length)
    return (
      <form onSubmit={handleSubmitBoards(onSubmitBoards)}>
        <div className="h-[105px] overflow-scroll px-5">
          {boards.map((board) => (
            <div key={board.id}>
              <label
                className="flex cursor-pointer items-center rounded-[5px] p-2 hover:bg-light-100 dark:hover:bg-dark-300"
                htmlFor={board.id}
              >
                <input
                  id={board.id}
                  type="checkbox"
                  className="h-[14px] w-[14px] rounded bg-transparent ring-0 focus:outline-none focus:ring-0 focus:ring-offset-0"
                  {...registerBoards(board.id)}
                />
                <span className="ml-3 text-sm text-neutral-900 dark:text-dark-1000">
                  {board.name}
                </span>
              </label>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
          <div>
            <Button type="submit" isLoading={importBoards.isPending}>
              Import boards
            </Button>
          </div>
        </div>
      </form>
    );

  return (
    <div>Trello account not connected ...</div>
  );
};

export function ImportBoardsForm() {
  const { closeModal } = useModal();
  const [step, setStep] = useState(1);

  return (
    <div>
      <div className="flex w-full items-center justify-between px-5 pb-4 pt-5">
        <div className="flex items-center">
          <h2 className="text-sm font-medium text-neutral-900 dark:text-dark-1000">
            New import
          </h2>
          <Link
            href="https://docs.kan.bn/imports/trello"
            target="_blank"
            className="ml-2 text-neutral-500 hover:text-neutral-700 dark:text-dark-900 dark:hover:text-dark-700"
          >
            <HiOutlineQuestionMarkCircle className="h-4.5 w-4.5" />
          </Link>
        </div>

        <button
          type="button"
          className="rounded p-1 hover:bg-light-200 dark:hover:bg-dark-300"
          onClick={() => closeModal()}
        >
          <HiXMark size={18} className="text-dark-900" />
        </button>
      </div>

      {step === 1 && <SelectSource handleNextStep={() => setStep(step + 1)} />}
      {step === 2 && <ImportTrello />}
    </div>
  );
}
