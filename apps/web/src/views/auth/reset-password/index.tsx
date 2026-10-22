import Link from "next/link";
import { useRouter } from "next/router";
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { PageHead } from "~/components/PageHead";
import PatternedBackground from "~/components/PatternedBackground";
import { usePopup } from "~/providers/popup";

interface FormValues {
  password: string;
  confirmPassword: string;
}

const ResetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { message: t`Password must be at least 8 characters` }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: t`Passwords do not match`,
    path: ["confirmPassword"],
  });

export default function ResetPasswordPage() {
  const router = useRouter();
  const { showPopup } = usePopup();
  const { token: tokenParam } = router.query;
  const token = Array.isArray(tokenParam) ? tokenParam[0] : tokenParam;
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(ResetPasswordSchema),
  });

  const { data } = authClient.useSession();

  if (data?.user.id) void router.push("/boards");

  const onSubmit = async (values: FormValues) => {
    if (!token) return;
    setFormError(null);
    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });
    if (error) {
      setFormError(
        error.message && error.message !== "Invalid token"
          ? error.message
          : t`This password reset link is invalid or has expired.`,
      );
      return;
    }
    showPopup({
      header: t`Success`,
      message: t`Your password has been reset successfully.`,
      icon: "success",
    });
    void router.push("/login");
  };

  return (
    <>
      <PageHead title={t`Reset password | kan.bn`} />
      <main className="h-screen bg-light-100 pt-20 dark:bg-dark-50 sm:pt-0">
        <div className="justify-top flex h-full flex-col items-center px-4 sm:justify-center">
          <div className="z-10 flex w-full flex-col items-center">
            <Link href="/">
              <h1 className="mb-6 text-lg font-bold tracking-tight text-light-1000 dark:text-dark-1000">
                kan.bn
              </h1>
            </Link>
            <p className="mb-10 text-3xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
              {t`Set a new password`}
            </p>
            {token ? (
              <div className="w-full rounded-lg border border-light-500 bg-light-300 px-4 py-10 dark:border-dark-400 dark:bg-dark-200 sm:max-w-md lg:px-10">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
                    <div>
                      <Input
                        type="password"
                        {...register("password")}
                        placeholder={t`Enter a new password`}
                      />
                      {errors.password && (
                        <p className="mt-2 text-xs text-red-400">
                          {errors.password.message ??
                            t`Please enter a valid password`}
                        </p>
                      )}
                    </div>
                    <div>
                      <Input
                        type="password"
                        {...register("confirmPassword")}
                        placeholder={t`Confirm your password`}
                      />
                      {errors.confirmPassword && (
                        <p className="mt-2 text-xs text-red-400">
                          {errors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                    {formError && (
                      <p className="mt-2 text-xs text-red-400">{formError}</p>
                    )}
                    <div className="mt-[1.5rem] flex items-center gap-4">
                      <Button
                        isLoading={isSubmitting}
                        fullWidth
                        size="lg"
                        variant="secondary"
                      >
                        {t`Reset password`}
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            ) : (
              <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <p className="text-md mt-2 text-center text-light-1000 dark:text-dark-1000">
                  <Trans>
                    This password reset link is invalid or has expired.
                  </Trans>
                </p>
              </div>
            )}
            <p className="mt-4 text-sm text-light-1000 dark:text-dark-1000">
              <Trans>
                Remembered your password?{" "}
                <span className="underline">
                  <Link href="/login">Sign in</Link>
                </span>
              </Trans>
            </p>
          </div>
          <PatternedBackground />
        </div>
      </main>
    </>
  );
}
