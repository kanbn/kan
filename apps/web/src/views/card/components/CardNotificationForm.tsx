import { Listbox, Transition } from "@headlessui/react";
import { t } from "@lingui/core/macro";
import { Fragment } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiChevronUpDown, HiXMark } from "react-icons/hi2";

import Button from "~/components/Button";
import DateSelector from "~/components/DateSelector";
import Input from "~/components/Input";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import { invalidateCard } from "~/utils/cardInvalidation";

type Channel = "mattermost" | "google_calendar";
type TriggerType = "relative" | "absolute";

interface FormValues {
  channel: Channel;
  triggerType: TriggerType;
  offsetValue: string;
  triggerAt: Date | null;
  timeOfDay: string;
}

interface Option<T extends string> {
  value: T;
  label: string;
}

const CHANNEL_OPTIONS: Option<Channel>[] = [
  { value: "mattermost", label: "Mattermost" },
  { value: "google_calendar", label: "Google Calendar" },
];

const TRIGGER_OPTIONS: Option<TriggerType>[] = [
  { value: "relative", label: "Relative to due date" },
  { value: "absolute", label: "Specific date" },
];

function ListboxSelect<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}) {
  const selected = options.find((o) => o.value === value) ?? options[0];
  return (
    <Listbox value={value} onChange={onChange}>
      {({ open }) => (
        <div className="relative">
          <Listbox.Button className="block w-full rounded-md border-0 bg-white/5 px-4 py-1.5 text-left shadow-sm ring-1 ring-inset ring-light-600 focus:ring-2 focus:ring-inset focus:ring-light-600 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700 dark:focus:ring-dark-700 sm:text-sm sm:leading-6">
            <span className="block truncate">{selected?.label}</span>
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
              {options.map((opt) => (
                <Listbox.Option
                  key={opt.value}
                  value={opt.value}
                  className="relative cursor-default select-none px-2 text-neutral-900 dark:text-dark-1000"
                >
                  {() => (
                    <div className="flex items-center rounded-[5px] p-2 hover:bg-light-200 dark:hover:bg-dark-400">
                      <span className="ml-2 block truncate font-normal">
                        {opt.label}
                      </span>
                    </div>
                  )}
                </Listbox.Option>
              ))}
            </Listbox.Options>
          </Transition>
        </div>
      )}
    </Listbox>
  );
}

const inputLabelClass =
  "mb-1 block text-xs font-medium text-light-900 dark:text-dark-1000";

export function CardNotificationForm({
  cardPublicId,
}: {
  cardPublicId: string;
}) {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const { workspace } = useWorkspace();
  const utils = api.useUtils();

  const { control, register, handleSubmit, watch, setValue } =
    useForm<FormValues>({
      defaultValues: {
        channel: "mattermost",
        triggerType: "relative",
        offsetValue: "1",
        triggerAt: null,
        timeOfDay: "09:00",
      },
    });

  const triggerType = watch("triggerType");

  const showTimePicker = triggerType === "absolute";

  const createNotification = api.cardNotification.create.useMutation({
    onSuccess: async () => {
      await invalidateCard(utils, cardPublicId);
      await utils.cardNotification.list.invalidate({ cardPublicId });
      closeModal();
    },
    onError: () => {
      showPopup({
        header: t`Unable to add notification`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const onSubmit = (values: FormValues) => {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    createNotification.mutate({
      cardPublicId,
      channel: values.channel,
      triggerType: values.triggerType,
      offsetValue:
        values.triggerType === "relative"
          ? Number(values.offsetValue) || null
          : null,
      offsetUnit: values.triggerType === "relative" ? "days" : null,
      triggerAt: values.triggerType === "absolute" ? values.triggerAt : null,
      timeOfDay: values.timeOfDay,
      timezone,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="space-y-4 px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-1 text-neutral-900 dark:text-dark-1000">
          <h2 className="text-sm font-medium">{t`New notification`}</h2>
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

        <div>
          <label className={inputLabelClass}>{t`Channel`}</label>
          <Controller
            name="channel"
            control={control}
            render={({ field }) => (
              <ListboxSelect
                value={field.value}
                options={CHANNEL_OPTIONS}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div>
          <label className={inputLabelClass}>{t`When`}</label>
          <Controller
            name="triggerType"
            control={control}
            render={({ field }) => (
              <ListboxSelect
                value={field.value}
                options={TRIGGER_OPTIONS}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        {triggerType === "relative" ? (
          <div>
            <label className={inputLabelClass}>{t`Offset`}</label>
            <Input
              type="number"
              min={0}
              placeholder="1"
              {...register("offsetValue")}
            />
            <p className="mt-1 text-xs text-light-700 dark:text-dark-700">
              {t`0 days if it is on due date`}
            </p>
          </div>
        ) : (
          <div>
            <label className={inputLabelClass}>{t`Date`}</label>
            <DateSelector
              selectedDate={watch("triggerAt") ?? undefined}
              onDateSelect={(d) => setValue("triggerAt", d ?? null)}
              weekStartsOn={workspace.weekStartDay}
            />
          </div>
        )}

        {showTimePicker && (
          <div>
            <label className={inputLabelClass}>{t`Time`}</label>
            <input
              type="time"
              {...register("timeOfDay")}
              className="block w-full rounded-md border-0 bg-white/5 px-3 py-1.5 text-sm shadow-sm ring-1 ring-inset ring-light-600 focus:ring-2 focus:ring-inset focus:ring-light-600 dark:bg-dark-300 dark:text-dark-1000 dark:ring-dark-700 dark:focus:ring-dark-700 sm:leading-6"
            />
            <p className="mt-1 text-xs text-light-700 dark:text-dark-700">
              {t`Fires at this time in your local timezone.`}
            </p>
          </div>
        )}
      </div>

      <div className="mt-10 flex items-center justify-end space-x-4 border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <Button
          type="submit"
          isLoading={createNotification.isPending}
          disabled={
            triggerType === "absolute" ? !watch("triggerAt") : false
          }
        >
          {t`Add notification`}
        </Button>
      </div>
    </form>
  );
}
