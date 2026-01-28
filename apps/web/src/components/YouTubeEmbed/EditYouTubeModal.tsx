import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { HiXMark } from "react-icons/hi2";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useModal } from "~/providers/modal";
import { fetchYouTubeMetadata, isYouTubeUrl } from "./utils";

interface EditYouTubeFormInput {
  url: string;
  title: string;
}

interface EditYouTubeModalState {
  url: string;
  title: string;
  onSave: (url: string, title: string) => void;
}

export function EditYouTubeModal() {
  const { closeModal, getModalState } = useModal();
  const [isValidating, setIsValidating] = useState(false);
  const [urlError, setUrlError] = useState<string | null>(null);

  // Get initial values and callback from modal state
  const modalState = getModalState("EDIT_YOUTUBE") as
    | EditYouTubeModalState
    | undefined;
  const initialUrl = modalState?.url ?? "";
  const initialTitle = modalState?.title ?? "";
  const onSave = modalState?.onSave;

  const { register, handleSubmit, watch, reset } =
    useForm<EditYouTubeFormInput>({
      defaultValues: {
        url: initialUrl,
        title: initialTitle,
      },
    });

  // Reset form when modal state changes (when modal opens with new values)
  useEffect(() => {
    if (modalState) {
      reset({
        url: modalState.url,
        title: modalState.title,
      });
    }
  }, [modalState, reset]);

  const currentUrl = watch("url");

  const onSubmit = async (values: EditYouTubeFormInput) => {
    // Validate URL
    if (!isYouTubeUrl(values.url)) {
      setUrlError(t`Please enter a valid YouTube URL`);
      return;
    }

    setUrlError(null);
    setIsValidating(true);

    try {
      // If title is empty and URL changed, fetch new title
      let finalTitle = values.title;
      if (!finalTitle.trim() && values.url !== initialUrl) {
        const metadata = await fetchYouTubeMetadata(values.url);
        finalTitle = metadata?.title ?? "YouTube Video";
      } else if (!finalTitle.trim()) {
        // Keep existing title if no new title provided and URL unchanged
        finalTitle = initialTitle || "YouTube Video";
      }

      if (onSave) {
        onSave(values.url, finalTitle);
      }
      closeModal();
    } catch (error) {
      console.error(error);
      setUrlError(t`Failed to fetch video information`);
    } finally {
      setIsValidating(false);
    }
  };

  // Auto-focus on title input (more useful for editing)
  useEffect(() => {
    const titleElement: HTMLElement | null =
      document.querySelector<HTMLElement>("#youtube-title");
    if (titleElement) titleElement.focus();
  }, []);

  // Validate URL on change
  useEffect(() => {
    if (currentUrl && !isYouTubeUrl(currentUrl)) {
      setUrlError(t`Please enter a valid YouTube URL`);
    } else {
      setUrlError(null);
    }
  }, [currentUrl]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4 text-neutral-900 dark:text-dark-1000">
          <h2 className="text-sm font-medium">{t`Edit YouTube Video`}</h2>
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

        <div className="space-y-4">
          <div>
            <label
              htmlFor="youtube-title"
              className="mb-2 block text-xs font-medium text-light-900 dark:text-dark-900"
            >
              {t`Title`}
            </label>
            <Input
              id="youtube-title"
              placeholder={t`Enter a custom title`}
              {...register("title")}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  await handleSubmit(onSubmit)();
                }
              }}
            />
          </div>

          <div>
            <label
              htmlFor="youtube-url"
              className="mb-2 block text-xs font-medium text-light-900 dark:text-dark-900"
            >
              {t`YouTube URL`}
            </label>
            <Input
              id="youtube-url"
              placeholder={t`https://www.youtube.com/watch?v=...`}
              {...register("url", { required: true })}
              onKeyDown={async (e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  await handleSubmit(onSubmit)();
                }
              }}
            />
            {urlError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                {urlError}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-12 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <div className="space-x-2">
          <Button
            type="button"
            variant="secondary"
            onClick={() => closeModal()}
          >
            {t`Cancel`}
          </Button>
          <Button
            type="submit"
            isLoading={isValidating}
            disabled={!watch("url") || !!urlError}
          >
            {t`Save`}
          </Button>
        </div>
      </div>
    </form>
  );
}
