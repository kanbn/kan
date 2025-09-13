import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  HiInformationCircle,
  HiMiniCheck,
  HiOutlineDocumentDuplicate,
  HiXMark,
} from "react-icons/hi2";
import { z } from "zod";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useClipboard } from "~/hooks/useClipboard";
import { useModal } from "~/providers/modal";

const newApiKeySchema = z.object({
  name: z
    .string()
    .min(1, { message: t`API key name is required` })
    .max(30, { message: t`API key name cannot exceed 30 characters` }),
});

export default function NewApiKeyModal() {
  const { closeModal } = useModal();
  const { copied, copy } = useClipboard({ timeout: 2000 });
  const [createdApiKey, setCreatedApiKey] = useState<{
    key: string;
    name: string;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<z.infer<typeof newApiKeySchema>>({
    resolver: zodResolver(newApiKeySchema),
    defaultValues: {
      name: "",
    },
  });

  const qc = useQueryClient();

  const createApiKeyMutation = useMutation({
    mutationFn: ({ name }: { name: string }) =>
      authClient.apiKey.create({ name, prefix: "kan_" }),
    onSuccess: ({ data: apiKey }) => {
      void qc.invalidateQueries({
        queryKey: ["apiKeys"],
      });
      if (apiKey && apiKey.key && apiKey.name) {
        setCreatedApiKey({
          key: apiKey.key,
          name: apiKey.name,
        });
      }
    },
    onError: () => {
      // Handle error if needed
    },
  });

  const onSubmit = (data: z.infer<typeof newApiKeySchema>) => {
    createApiKeyMutation.mutate({ name: data.name });
  };

  useEffect(() => {
    // Reset state and form when modal opens
    setCreatedApiKey(null);
    reset();
  }, [reset]);

  useEffect(() => {
    if (!createdApiKey) {
      const nameElement = document.querySelector<HTMLElement>("#name");
      if (nameElement) nameElement.focus();
    }
  }, [createdApiKey]);

  if (createdApiKey) {
    return (
      <div>
        <div className="px-5 pt-5">
          <div className="flex w-full items-center justify-between pb-4 text-neutral-900 dark:text-dark-1000">
            <h2 className="text-sm font-bold">{t`API key created`}</h2>
            <button
              type="button"
              className="rounded p-1 hover:bg-light-300 focus:outline-none dark:hover:bg-dark-300"
              onClick={(e) => {
                e.preventDefault();
                closeModal();
              }}
            >
              <HiXMark
                size={18}
                className="text-light-900 dark:text-dark-900"
              />
            </button>
          </div>

          <div className="mb-4">
            <div className="relative">
              <Input
                value={createdApiKey.key}
                className="pr-10 text-sm text-light-900 dark:text-dark-900"
                readOnly
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-light-900 hover:text-light-950 dark:text-dark-900 dark:hover:text-dark-950"
                onClick={() => copy(createdApiKey.key)}
              >
                {copied ? (
                  <HiMiniCheck className="h-5 w-5 text-green-600" />
                ) : (
                  <HiOutlineDocumentDuplicate className="h-5 w-5" />
                )}
              </button>
            </div>
            <div className="mt-2 flex items-start gap-1">
              <HiInformationCircle className="mt-0.5 h-4 w-4 text-dark-900" />
              <p className="text-xs text-gray-500 dark:text-dark-900">
                {t`This API key will only be shown once. Please save it in a secure location.`}
              </p>
            </div>
          </div>
        </div>
        <div className="mt-12 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
          <div>
            <Button onClick={() => closeModal()}>{t`Close`}</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="px-5 pt-5">
        <div className="flex w-full items-center justify-between pb-4 text-neutral-900 dark:text-dark-1000">
          <h2 className="text-sm font-bold">{t`New API key`}</h2>
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
          id="name"
          placeholder={t`API key name`}
          {...register("name", { required: true })}
          errorMessage={errors.name?.message}
          onKeyDown={async (e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              await handleSubmit(onSubmit)();
            }
          }}
        />
      </div>
      <div className="mt-12 flex items-center justify-end border-t border-light-600 px-5 pb-5 pt-5 dark:border-dark-600">
        <div>
          <Button type="submit" isLoading={createApiKeyMutation.isPending}>
            {t`Create API key`}
          </Button>
        </div>
      </div>
    </form>
  );
}
