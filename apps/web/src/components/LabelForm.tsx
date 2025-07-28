import { Listbox, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Fragment, useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiChevronUpDown, HiXMark } from "react-icons/hi2";

import { colours } from "@kan/shared/constants";

import Button from "~/components/Button";
import Input from "~/components/Input";
import Toggle from "~/components/Toggle";
import { useModal } from "~/providers/modal";
import { api } from "~/utils/api";

interface LabelFormInput {
  name: string;
  colour: Colour;
  isCreateAnotherEnabled?: boolean;
}

interface Colour {
  name: string;
  code: string;
}

export function LabelForm({
  boardPublicId,
  refetch,
  isEdit,
}: {
  boardPublicId: string;
  refetch: () => void;
  isEdit?: boolean;
}) {
  const { closeModal, entityId, openModal } = useModal();

  const label = api.label.byPublicId.useQuery(
    {
      labelPublicId: entityId,
    },
    {
      enabled: isEdit && !!entityId,
    },
  );

  const { control, register, reset, handleSubmit, setValue, watch } =
    useForm<LabelFormInput>({
      values: {
        name: isEdit && label.data?.name ? label.data.name : "",
        colour: (isEdit && label.data?.colourCode
          ? colours.find((c) => c.code === label.data?.colourCode)
          : colours[0]) as Colour,
        isCreateAnotherEnabled: false,
      },
    });

  const isCreateAnotherEnabled = watch("isCreateAnotherEnabled");

  const createLabel = api.label.create.useMutation({
    onSuccess: () => {
      const currentColourIndex = colours.findIndex(
        (c) => c.code === watch("colour").code,
      );
      try {
        refetch();
        if (!isCreateAnotherEnabled) closeModal();
        reset({
          name: "",
          colour: colours[(currentColourIndex + 1) % colours.length],
          isCreateAnotherEnabled,
        });
      } catch (e) {
        console.log(e);
      }
    },
  });

  const updateLabel = api.label.update.useMutation({
    onSuccess: () => {
      refetch();
      closeModal();
      reset({
        name: "",
        colour: colours[0],
      });
    },
  });

  const onSubmit = (values: LabelFormInput) => {
    if (!values.colour.code) return;

    if (isEdit) {
      updateLabel.mutate({
        labelPublicId: label.data?.publicId ?? "",
        name: values.name,
        colourCode: values.colour.code,
      });
    } else {
      createLabel.mutate({
        name: values.name,
        colourCode: values.colour.code,
        boardPublicId,
      });
    }
  };

  useEffect(() => {
    const nameElement: HTMLElement | null =
      document.querySelector<HTMLElement>("#label-name");
    if (nameElement) nameElement.focus();
  }, []);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4 text-neutral-900 dark:text-dark-1000">
          <h2 className="text-sm font-medium">
            {isEdit ? t`Edit label` : t`New label`}
          </h2>
          <button
            type="button"
            className="rounded p-1 hover:bg-light-300 focus:outline-none dark:hover:bg-dark-300"
            onClick={(e) => {
              e.preventDefault();
              closeModal();
            }}
          >
            <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
          </button>
        </div>

        <Input
          id="label-name"
          placeholder={t`Name`}
          {...register("name")}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              await handleSubmit(onSubmit)();
            }
          }}
        />
        <Controller
          name="colour"
          control={control}
          render={({ field }) => (
            <Listbox {...field}>
              {({ open }) => (
                <>
                  <div className="relative mt-4">
                    <Listbox.Button className="block w-full rounded-md border-0 bg-white/5 px-4 py-1.5 shadow-sm ring-1 ring-inset ring-light-600 focus:ring-2 focus:ring-inset focus:ring-light-600 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700 dark:focus:ring-dark-700 sm:text-sm sm:leading-6">
                      <span className="flex items-center">
                        <span
                          style={{ backgroundColor: field.value.code }}
                          className={`inline-block h-2 w-2 flex-shrink-0 rounded-full`}
                        />
                        <span className="ml-3 block truncate">
                          {field.value.name}
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
                      <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-light-50 py-2 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none dark:bg-dark-300 sm:text-sm">
                        {colours.map((colour, index) => (
                          <Listbox.Option
                            key={`colours_${index}`}
                            className="relative cursor-default select-none px-2 text-neutral-900 dark:text-dark-1000"
                            value={colour}
                          >
                            {() => (
                              <>
                                <div className="flex items-center rounded-[5px] p-2 hover:bg-light-200 dark:hover:bg-dark-400">
                                  <span
                                    style={{ backgroundColor: colour.code }}
                                    className="ml-2 inline-block h-2 w-2 flex-shrink-0 rounded-full"
                                    aria-hidden="true"
                                  />
                                  <span className="ml-3 block truncate font-normal">
                                    {colour.name}
                                  </span>
                                </div>
                              </>
                            )}
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
        {!isEdit && (
          <Toggle
            label={t`Create another`}
            isChecked={!!isCreateAnotherEnabled}
            onChange={() =>
              setValue("isCreateAnotherEnabled", !isCreateAnotherEnabled)
            }
          />
        )}

        <div className="space-x-2">
          {isEdit && (
            <Button
              variant="secondary"
              onClick={() => openModal("DELETE_LABEL", entityId)}
            >
              {t`Delete`}
            </Button>
          )}
          <Button
            type="submit"
            isLoading={updateLabel.isPending || createLabel.isPending}
            disabled={
              !watch("name")
            }
          >
            {isEdit ? t`Update label` : t`Create label`}
          </Button>
        </div>
      </div>
    </form>
  );
}
