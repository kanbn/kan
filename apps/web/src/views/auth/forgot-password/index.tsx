import Link from "next/link";
import { useRouter } from "next/navigation";
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
import { AuthLayout } from "../components/AuthLayout";

interface FormValues {
  email: string;
}

const EmailSchema = z.object({
  email: z.string().email(),
});

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isEmailSent, setIsEmailSent] = useState<boolean>(false);
  const [emailSentTo, setEmailSentTo] = useState<string>("");
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(EmailSchema),
  });

  const { data } = authClient.useSession();

  if (data?.user.id) router.push("/boards");

  const onSubmit = async (values: FormValues) => {
    setFormError(null);
    const { error } = await authClient.requestPasswordReset({
      email: values.email,
    });
    if (error) {
      setFormError(error.message ?? t`Something went wrong.`);
    } else {
      setIsEmailSent(true);
      setEmailSentTo(values.email);
    }
  };

  return (
    <>
      <PageHead title={t`Forgot password | kan.bn`} />
      <AuthLayout
        title={isEmailSent ? t`Check your inbox` : t`Forgot your password?`}
        footer={
          <Trans>
            Remembered your password?{" "}
            <span className="font-medium text-light-1000 hover:underline dark:text-dark-1000">
              <Link href="/login">Sign in</Link>
            </span>
          </Trans>
        }
      >
        {isEmailSent ? (
          <p className="text-center text-sm text-light-900 dark:text-dark-900">
            <Trans>We've sent a password reset link to {emailSentTo}.</Trans>
          </p>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
            <div>
              <Input
                {...register("email", { required: true })}
                placeholder={t`Enter your email address`}
              />
              {errors.email && (
                <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                  {t`Please enter a valid email address`}
                </p>
              )}
            </div>
            {formError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {formError}
              </p>
            )}
            <div className="mt-4 flex items-center gap-4">
              <Button isLoading={isSubmitting} fullWidth>
                {t`Send reset link`}
              </Button>
            </div>
          </form>
        )}
      </AuthLayout>
    </>
  );
}
