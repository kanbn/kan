import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { HiCheck, HiXMark } from "react-icons/hi2";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useDebounce } from "~/hooks/useDebounce";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { useWorkspace } from "~/providers/workspace";
import { api } from "~/utils/api";
import LoadingSpinner from "./LoadingSpinner";

const schema = z.object({
  name: z
    .string()
    .min(1, { message: t`Workspace name is required` })
    .max(64, { message: t`Workspace name cannot exceed 64 characters` }),
  slug: z
    .string()
    .min(3, {
      message: t`URL must be at least 3 characters long`,
    })
    .max(64, { message: t`URL cannot exceed 64 characters` })
    .regex(/^(?![-]+$)[a-zA-Z0-9-]+$/, {
      message: t`URL can only contain letters, numbers, and hyphens`,
    })
    .optional()
    .or(z.literal("")),
});

type FormValues = z.infer<typeof schema>;

export function NewWorkspaceForm() {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const { switchWorkspace, availableWorkspaces } = useWorkspace();
  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    trigger,
    clearErrors,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      slug: "",
    },
    mode: "onSubmit",
  });
  const utils = api.useUtils();

  const hasAvailableWorkspaces = availableWorkspaces.length > 0;

  const slug = watch("slug");
  const [debouncedSlug] = useDebounce(slug, 500);
  const isTyping = slug !== debouncedSlug;

  // Validate slug only after debounce
  useEffect(() => {
    if (isTyping) {
      // Clear errors while typing
      clearErrors("slug");
    } else if (debouncedSlug) {
      // Validate after debounce
      void trigger("slug");
    }
  }, [isTyping, debouncedSlug, trigger, clearErrors]);

  const checkWorkspaceSlugAvailability =
    api.workspace.checkSlugAvailability.useQuery(
      {
        workspaceSlug: debouncedSlug ?? "",
      },
      {
        enabled: !!debouncedSlug && debouncedSlug.length >= 3 && !errors.slug,
      },
    );

  const isWorkspaceSlugAvailable = checkWorkspaceSlugAvailability.data;

  const createWorkspace = api.workspace.create.useMutation({
    onSuccess: (values) => {
      if (values.publicId && values.name) {
        void utils.workspace.all.invalidate();
        switchWorkspace({
          publicId: values.publicId,
          name: values.name,
          description: values.description,
          slug: values.slug,
          plan: values.plan,
          role: "admin",
          weekStartDay: 1,
        });

        closeModal();
      }
    },
    onError: () => {
      showPopup({
        header: t`Unable to create workspace`,
        message: t`Please try again later, or contact customer support.`,
        icon: "error",
      });
    },
  });

  useEffect(() => {
    const nameElement: HTMLElement | null =
      document.querySelector<HTMLElement>("#workspace-name");
    if (nameElement) nameElement.focus();
  }, []);

  const isValidSlug = slug && slug.length >= 3 && !errors.slug;

  const onSubmit = (values: FormValues) => {
    // Don't submit if slug is provided but not available
    if (values.slug && isWorkspaceSlugAvailable?.isAvailable === false) {
      return;
    }

    createWorkspace.mutate({
      name: values.name,
      slug: values.slug,
    });
  };

  const isSlugAvailable =
    isValidSlug &&
    isWorkspaceSlugAvailable?.isAvailable &&
    !isWorkspaceSlugAvailable?.isReserved;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4">
          <h2 className="text-sm font-bold text-neutral-900 dark:text-dark-1000">
            {t`New workspace`}
          </h2>
          <button
            type="button"
            className={twMerge(
              "rounded p-1 hover:bg-light-200 focus:outline-none dark:hover:bg-dark-300",
              !hasAvailableWorkspaces && "invisible",
            )}
            onClick={(e) => {
              e.preventDefault();
              closeModal();
            }}
          >
            <HiXMark size={18} className="text-light-900 dark:text-dark-900" />
          </button>
        </div>

        <Input
          id="workspace-name"
          placeholder={t`Workspace name`}
          {...register("name")}
          errorMessage={errors.name?.message}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              await handleSubmit(onSubmit)();
            }
          }}
        />

        <div className="mt-4">
          <Input
            id="workspace-slug"
            placeholder={t`workspace-url`}
            {...register("slug")}
            className={`${
              isSlugAvailable
                ? "focus:ring-green-500 dark:focus:ring-green-500"
                : ""
            }`}
            errorMessage={
              errors.slug?.message ??
              (isWorkspaceSlugAvailable?.isAvailable === false &&
              isWorkspaceSlugAvailable?.isReserved === false
                ? t`This workspace URL has already been taken`
                : isWorkspaceSlugAvailable?.isReserved
                  ? t`This workspace URL is reserved`
                  : undefined)
            }
            prefix={`${env("NEXT_PUBLIC_BASE_URL")}/`}
            iconRight={
              slug && slug.length >= 3 && !errors.slug ? (
                isWorkspaceSlugAvailable?.isAvailable ? (
                  <HiCheck className="h-4 w-4 text-green-500" />
                ) : checkWorkspaceSlugAvailability.isPending || isTyping ? (
                  <LoadingSpinner />
                ) : null
              ) : null
            }
            onKeyDown={async (e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                await handleSubmit(onSubmit)();
              }
            }}
          />
        </div>
      </div>
      <div className="mt-6 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <div>
          <Button
            type="submit"
            isLoading={createWorkspace.isPending}
            disabled={
              createWorkspace.isPending ||
              (!!slug &&
                (checkWorkspaceSlugAvailability.isPending ||
                  isWorkspaceSlugAvailable?.isAvailable === false ||
                  isTyping))
            }
          >
            {t`Create workspace`}
          </Button>
        </div>
      </div>
    </form>
  );
}
