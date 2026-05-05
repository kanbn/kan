import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { useModal } from "~/providers/modal";
import { usePopup } from "~/providers/popup";
import { api } from "~/utils/api";

const buildSchema = (hasPassword: boolean) => {
  const base = z.object({
    currentPassword: hasPassword
      ? z.string().min(1, t`Current password is required`)
      : z.string().optional(),
    newPassword: z
      .string()
      .min(8, t`Password must be at least 8 characters`)
      .min(1, t`New password is required`),
    confirmPassword: z.string().min(1, t`Please confirm your new password`),
  });

  return base
    .refine((data) => data.newPassword === data.confirmPassword, {
      message: t`Passwords do not match`,
      path: ["confirmPassword"],
    })
    .refine(
      (data) => !hasPassword || data.currentPassword !== data.newPassword,
      {
        message: t`New password must be different from current password`,
        path: ["newPassword"],
      },
    );
};

type FormValues = {
  currentPassword?: string;
  newPassword: string;
  confirmPassword: string;
};

interface Props {
  hasPassword: boolean;
}

export function ChangePasswordFormConfirmation({ hasPassword }: Props) {
  const { closeModal } = useModal();
  const { showPopup } = usePopup();
  const router = useRouter();
  const utils = api.useUtils();

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
    reset,
    setError,
  } = useForm<FormValues>({
    resolver: zodResolver(buildSchema(hasPassword)),
    mode: "onChange",
  });

  const setPasswordMutation = api.user.setPassword.useMutation();

  const changePasswordMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      if (!hasPassword) {
        await setPasswordMutation.mutateAsync({
          newPassword: data.newPassword,
        });
        return;
      }

      const response = await authClient.changePassword({
        newPassword: data.newPassword,
        currentPassword: data.currentPassword ?? "",
        revokeOtherSessions: true,
      });

      if (response?.error) {
        throw new Error(response?.error.message || "Invalid Password");
      }
    },
    onSuccess: async () => {
      closeModal();
      showPopup({
        header: hasPassword ? t`Password Changed` : t`Password Set`,
        message: hasPassword
          ? t`Your password has been changed.`
          : t`Your password has been set.`,
        icon: "success",
      });

      // Clear the session prompt flag so future magic link logins
      // don't re-show the set-password modal (password is now set)
      if (!hasPassword && typeof window !== "undefined") {
        sessionStorage.removeItem("set_password_prompted");
      }

      utils.invalidate();
      reset();
      router.push("/");
    },
    onError: async (error: any) => {
      const errorMessage = error.message.toLowerCase();

      if (errorMessage.includes("invalid password")) {
        setError("currentPassword", {
          type: "manual",
          message: t`The current password you entered is incorrect.`,
        });
      } else {
        closeModal();
        showPopup({
          header: hasPassword ? t`Error Changing Password` : t`Error Setting Password`,
          message: t`An unexpected error occurred. Please try again later.`,
          icon: "error",
        });
      }
    },
  });

  const onSubmit = (data: FormValues) => {
    changePasswordMutation.mutate(data);
  };

  const handleCancel = () => {
    reset();
    closeModal();
  };

  return (
    <div className="p-5">
      <div className="flex w-full flex-col justify-between pb-4">
        <h2 className="text-md pb-4 font-medium dark:text-white">
          {hasPassword ? t`Change Password` : t`Set Password`}
        </h2>
        <p className="mb-4 text-sm text-light-900">
          {hasPassword
            ? t`Enter your current password and choose a new secure password.`
            : t`You signed in without a password. Set a password to enable password-based login.`}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-2">
          {hasPassword && (
            <div>
              <Input
                id="currentPassword"
                type="password"
                {...register("currentPassword")}
                placeholder={t`Enter your current password`}
              />
              {errors.currentPassword && (
                <p className="mt-2 text-xs text-red-400">
                  {errors.currentPassword.message}
                </p>
              )}
            </div>
          )}

          <div>
            <Input
              id="newPassword"
              type="password"
              {...register("newPassword")}
              placeholder={t`Enter your new password`}
            />
            {errors.newPassword && (
              <p className="mt-2 text-xs text-red-400">
                {errors.newPassword.message}
              </p>
            )}
          </div>

          <div>
            <Input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
              placeholder={t`Confirm your new password`}
            />
            {errors.confirmPassword && (
              <p className="mt-2 text-xs text-red-400">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>
        </div>

        <div className="mt-[1.5rem] flex items-center gap-4">
          <Button
            variant="secondary"
            onClick={handleCancel}
            type="button"
            fullWidth
            size="lg"
          >
            {t`Cancel`}
          </Button>
          <Button
            variant="primary"
            type="submit"
            disabled={!isValid || changePasswordMutation.isPending}
            isLoading={changePasswordMutation.isPending}
            fullWidth
            size="lg"
          >
            {hasPassword ? t`Change Password` : t`Set Password`}
          </Button>
        </div>
      </form>
    </div>
  );
}
