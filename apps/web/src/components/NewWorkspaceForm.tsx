import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { env } from "next-runtime-env";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  HiBolt,
  HiCheck,
  HiCheckBadge,
  HiInformationCircle,
  HiXMark,
} from "react-icons/hi2";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

import Button from "~/components/Button";
import Input from "~/components/Input";
import Toggle from "~/components/Toggle";
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
    .max(24, { message: t`URL cannot exceed 24 characters` })
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
    setValue,
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

  const isCloudEnv = env("NEXT_PUBLIC_KAN_ENV") === "cloud";

  const slug = watch("slug");
  const [debouncedSlug] = useDebounce(slug, 500);
  const isTyping = slug !== debouncedSlug;

  // Pro toggle state management
  const [isProToggleEnabled, setIsProToggleEnabled] = useState(false);
  const [lastAvailableSlug, setLastAvailableSlug] = useState<string>("");

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
    onSuccess: async (values, variables) => {
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

        // If in cloud and Pro toggle is enabled, create checkout session for pro
        if (env("NEXT_PUBLIC_KAN_ENV") === "cloud" && isProToggleEnabled) {
          try {
            const response = await fetch(
              "/api/stripe/create_checkout_session",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  slug: slug || undefined,
                  workspacePublicId: values.publicId,
                  cancelUrl: "/settings/workspace?upgrade=pro",
                  successUrl: "/boards",
                }),
              },
            );

            const data = await response.json();
            const url = (data as { url: string }).url;

            if (url) {
              window.location.href = url;
              return; // Don't close modal if redirecting to checkout
            }
          } catch (error) {
            console.error("Error creating checkout session:", error);
            showPopup({
              header: t`Error upgrading to Pro`,
              message: t`Workspace created successfully. You can upgrade later in settings.`,
              icon: "warning",
            });
          }
        }

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

  const [shouldShowBenefits, setShouldShowBenefits] = useState(false);

  const isValidSlug = slug && slug.length >= 3 && !errors.slug;

  useEffect(() => {
    if (
      isCloudEnv &&
      !checkWorkspaceSlugAvailability.isPending &&
      isValidSlug
    ) {
      const isAvailable = isWorkspaceSlugAvailable?.isAvailable === true;
      setShouldShowBenefits(isAvailable);

      // Automatically enable Pro toggle when slug is available
      if (isAvailable) {
        setIsProToggleEnabled(true);
        setLastAvailableSlug(slug);
      }
    }
  }, [
    isValidSlug,
    isWorkspaceSlugAvailable?.isAvailable,
    checkWorkspaceSlugAvailability.isPending,
    slug,
    isCloudEnv,
  ]);

  // Reset benefits when slug becomes invalid
  useEffect(() => {
    if (!isValidSlug) {
      setShouldShowBenefits(false);
    }
  }, [isValidSlug]);

  // Handle Pro toggle changes
  const handleProToggleChange = () => {
    if (isProToggleEnabled) {
      // Turning off: clear the slug and disable Pro
      setValue("slug", "");
      setIsProToggleEnabled(false);
    } else {
      // Turning on: restore the last available slug if we have one
      if (lastAvailableSlug) {
        setValue("slug", lastAvailableSlug);
      }
      setIsProToggleEnabled(true);
    }
  };

  const showProBenefits = isProToggleEnabled;

  const onSubmit = (values: FormValues) => {
    // Don't submit if slug is provided but not available
    if (values.slug && isWorkspaceSlugAvailable?.isAvailable === false) {
      return;
    }

    createWorkspace.mutate({
      name: values.name,
      slug: !isCloudEnv && values.slug ? values.slug : undefined,
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
            prefix={
              env("NEXT_PUBLIC_KAN_ENV") === "cloud"
                ? "kan.bn/"
                : `${env("NEXT_PUBLIC_BASE_URL")}/`
            }
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

          {slug && slug.length >= 3 && shouldShowBenefits && (
            <div className="mt-2 flex items-center gap-1">
              <HiInformationCircle className="h-4 w-4 text-dark-900" />
              <p className="text-xs text-gray-500 dark:text-dark-900">
                {t`Custom URLs require upgrading to a Pro plan`}
              </p>
            </div>
          )}
        </div>

        {showProBenefits && (
          <div className="mt-6">
            <div className="rounded-md bg-light-100 p-3 text-xs text-light-900 dark:bg-dark-200 dark:text-dark-900">
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <HiCheckBadge className="h-[18px] w-[18px] flex-shrink-0 text-light-1000 dark:text-dark-950" />
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-neutral-900 dark:text-dark-1000">
                      {t`Unlimited members`}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-600 ring-1 ring-inset ring-emerald-500/20 dark:text-emerald-400 sm:text-[10px]">
                      {t`Launch offer`}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-3">
                  <HiCheckBadge className="h-[18px] w-[18px] flex-shrink-0 text-light-1000 dark:text-dark-950" />
                  <span className="text-xs text-neutral-900 dark:text-dark-1000">
                    {t`Custom workspace URL`}
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <HiCheckBadge className="h-[18px] w-[18px] flex-shrink-0 text-light-1000 dark:text-dark-950" />
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-neutral-900 dark:text-dark-1000">
                      {t`Board analytics`}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-gray-500/10 px-2 py-0.5 text-[10px] font-medium text-gray-600 ring-1 ring-inset ring-gray-500/20 dark:text-gray-400 sm:text-[10px]">
                      {t`Coming soon`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <div
        className={twMerge(
          "mt-6 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600",
          !showProBenefits && "mt-12",
        )}
      >
        {/* Pro Toggle - only show in cloud environment */}
        {isCloudEnv && (
          <Toggle
            isChecked={isProToggleEnabled}
            onChange={handleProToggleChange}
            label={t`Upgrade to Pro ($29/month)`}
          />
        )}
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
