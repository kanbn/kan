import Link from "next/link";
import { t } from "@lingui/core/macro";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { HiXMark } from "react-icons/hi2";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

interface NewFeedbackFormInput {
  feedback: string;
}

export default function FeedbackModal() {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();

  const { handleSubmit, setValue, watch, reset } =
    useForm<NewFeedbackFormInput>({
      defaultValues: {
        feedback: "",
      },
    });

  const createFeedback = api.feedback.create.useMutation({
    onSuccess: async () => {
      reset();
      closeModal();
      showPopup({
        header: t`Feedback sent`,
        message: t`Thank you for your feedback!`,
        icon: "success",
      });
    },
    onError: async () => {
      showPopup({
        header: t`Unable to send feedback`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  const onSubmit = (values: NewFeedbackFormInput) => {
    createFeedback.mutate({
      feedback: values.feedback,
      url: window.location.href,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-dark-1000">
            {t`Feedback`}
          </h2>
          <button
            type="button"
            className="rounded p-1 hover:bg-light-200 focus:outline-none dark:hover:bg-dark-300"
            onClick={(e) => {
              e.preventDefault();
              closeModal();
            }}
          >
            <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
          </button>
        </div>

        <Input
          id="feedback"
          placeholder={t`Ideas to improve this page...`}
          onChange={(e) => setValue("feedback", e.target.value)}
          contentEditable
          value={watch("feedback")}
          className="min-h-[120px]"
          onKeyDown={async (e) => {
            e.stopPropagation();
            if (e.key === "Enter" && e.shiftKey) {
              e.preventDefault();
              await handleSubmit(onSubmit)();
            }
            if (e.key === "Escape") {
              closeModal();
            }
          }}
        />
      </div>
      <div className="mt-6 flex items-center justify-between border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <div className="text-xs text-neutral-600 dark:text-dark-800">
          <p>
            {t`Need help?`}{" "}
            <Link
              href="mailto:support@kan.bn"
              className="text-blue-600 underline dark:text-blue-300"
            >
              {t`Contact us`}
            </Link>
            {t`, or see our`}{" "}
            <Link
              href="https://docs.kan.bn"
              target="_blank"
              rel="noreferrer"
              className="text-blue-600 underline dark:text-blue-300"
            >
              {t`docs`}
            </Link>
            .
          </p>
        </div>
        <div>
          <Button type="submit" isLoading={createFeedback.isPending}>
            {t`Send feedback`}
          </Button>
        </div>
      </div>
    </form>
  );
}
