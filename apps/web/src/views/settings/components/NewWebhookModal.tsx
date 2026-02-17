import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { HiXMark } from "react-icons/hi2";
import { z } from "zod";

import { webhookEvents } from "@kan/db/schema";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const newWebhookSchema = z.object({
  name: z
    .string()
    .min(1, { message: t`Webhook name is required` })
    .max(255, { message: t`Webhook name cannot exceed 255 characters` }),
  url: z
    .string()
    .min(1, { message: t`Webhook URL is required` })
    .url({ message: t`Please enter a valid URL` })
    .max(2048, { message: t`URL cannot exceed 2048 characters` }),
  secret: z
    .string()
    .max(512, { message: t`Secret cannot exceed 512 characters` })
    .optional(),
  events: z
    .array(z.enum(webhookEvents))
    .min(1, { message: t`Select at least one event` }),
  active: z.boolean(),
});

type WebhookFormData = z.infer<typeof newWebhookSchema>;

interface NewWebhookModalProps {
  workspacePublicId: string;
  isEdit?: boolean;
}

export function NewWebhookModal({
  workspacePublicId,
  isEdit = false,
}: NewWebhookModalProps) {
  const { closeModal, entityId: webhookPublicId, getModalState, clearModalState } = useModal();
  const { showPopup } = usePopup();
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  const modalState = isEdit ? getModalState("EDIT_WEBHOOK") : null;

  const utils = api.useUtils();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<WebhookFormData>({
    resolver: zodResolver(newWebhookSchema),
    defaultValues: {
      name: "",
      url: "",
      secret: "",
      events: ["card.created", "card.updated", "card.moved", "card.deleted"],
      active: true,
    },
  });

  useEffect(() => {
    if (isEdit && webhookPublicId && modalState) {
      reset({
        name: modalState.name ?? "",
        url: modalState.url ?? "",
        secret: "",
        events: modalState.events ?? ["card.created"],
        active: modalState.active ?? true,
      });
    } else if (!isEdit) {
      reset({
        name: "",
        url: "",
        secret: "",
        events: ["card.created", "card.updated", "card.moved", "card.deleted"],
        active: true,
      });
    }
  }, [isEdit, webhookPublicId, modalState, reset]);

  // Clear modal state when closing
  useEffect(() => {
    return () => {
      if (isEdit) {
        clearModalState("EDIT_WEBHOOK");
      }
    };
  }, [isEdit, clearModalState]);

  const createWebhookMutation = api.webhook.create.useMutation({
    onSuccess: () => {
      void utils.webhook.list.invalidate({ workspacePublicId });
      showPopup({ message: t`Webhook created successfully`, type: "success" });
      closeModal();
    },
    onError: (error) => {
      showPopup({
        message: error.message || t`Failed to create webhook`,
        type: "error",
      });
    },
  });

  const updateWebhookMutation = api.webhook.update.useMutation({
    onSuccess: () => {
      void utils.webhook.list.invalidate({ workspacePublicId });
      showPopup({ message: t`Webhook updated successfully`, type: "success" });
      closeModal();
    },
    onError: (error) => {
      showPopup({
        message: error.message || t`Failed to update webhook`,
        type: "error",
      });
    },
  });

  const testWebhookMutation = api.webhook.test.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        showPopup({ message: t`Test webhook sent successfully!`, type: "success" });
      } else {
        showPopup({
          message: result.error || t`Webhook test failed`,
          type: "error",
        });
      }
      setIsTestingWebhook(false);
    },
    onError: (error) => {
      showPopup({
        message: error.message || t`Failed to test webhook`,
        type: "error",
      });
      setIsTestingWebhook(false);
    },
  });

  const onSubmit = (data: WebhookFormData) => {
    if (isEdit && webhookPublicId) {
      updateWebhookMutation.mutate({
        workspacePublicId,
        webhookPublicId: webhookPublicId as string,
        name: data.name,
        url: data.url,
        secret: data.secret || undefined,
        events: data.events,
        active: data.active,
      });
    } else {
      createWebhookMutation.mutate({
        workspacePublicId,
        name: data.name,
        url: data.url,
        secret: data.secret || undefined,
        events: data.events,
      });
    }
  };

  const handleTestWebhook = () => {
    if (!webhookPublicId) return;
    setIsTestingWebhook(true);
    testWebhookMutation.mutate({
      workspacePublicId,
      webhookPublicId: webhookPublicId as string,
    });
  };

  const isPending = createWebhookMutation.isPending || updateWebhookMutation.isPending;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4 text-neutral-900 dark:text-dark-1000">
          <h2 className="text-sm font-bold">
            {isEdit ? t`Edit webhook` : t`New webhook`}
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

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-light-900 dark:text-dark-900">
              {t`Name`}
            </label>
            <Input
              id="name"
              placeholder={t`My webhook`}
              {...register("name")}
              errorMessage={errors.name?.message}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-light-900 dark:text-dark-900">
              {t`URL`}
            </label>
            <Input
              id="url"
              placeholder="https://example.com/webhook"
              {...register("url")}
              errorMessage={errors.url?.message}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-light-900 dark:text-dark-900">
              {t`Secret (optional)`}
            </label>
            <Input
              id="secret"
              type="password"
              placeholder={isEdit ? t`Enter new secret to update` : t`HMAC secret for signature verification`}
              {...register("secret")}
              errorMessage={errors.secret?.message}
            />
            <p className="mt-1 text-xs text-neutral-500 dark:text-dark-800">
              {t`Used to sign webhook payloads for verification. Leave blank to keep existing secret.`}
            </p>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-light-900 dark:text-dark-900">
              {t`Events`}
            </label>
            <Controller
              name="events"
              control={control}
              render={({ field }) => (
                <div className="space-y-2">
                  {webhookEvents.map((event) => (
                    <label
                      key={event}
                      className="flex items-center space-x-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={field.value.includes(event)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            field.onChange([...field.value, event]);
                          } else {
                            field.onChange(
                              field.value.filter((v) => v !== event)
                            );
                          }
                        }}
                        className="h-4 w-4 rounded border-light-400 text-primary-600 focus:ring-primary-500 dark:border-dark-400"
                      />
                      <span className="text-sm text-light-900 dark:text-dark-900">
                        {event}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            />
            {errors.events && (
              <p className="mt-1 text-xs text-red-500">{errors.events.message}</p>
            )}
          </div>

          {isEdit && (
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  {...register("active")}
                  className="h-4 w-4 rounded border-light-400 text-primary-600 focus:ring-primary-500 dark:border-dark-400"
                />
                <span className="text-sm text-light-900 dark:text-dark-900">
                  {t`Active`}
                </span>
              </label>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <div>
          {isEdit && webhookPublicId && (
            <Button
              type="button"
              variant="secondary"
              onClick={handleTestWebhook}
              isLoading={isTestingWebhook}
            >
              {t`Send test`}
            </Button>
          )}
        </div>
        <div>
          <Button type="submit" isLoading={isPending}>
            {isEdit ? t`Save changes` : t`Create webhook`}
          </Button>
        </div>
      </div>
    </form>
  );
}
