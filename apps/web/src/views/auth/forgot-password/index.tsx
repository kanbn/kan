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
import PatternedBackground from "~/components/PatternedBackground";

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
      <main className="h-screen bg-light-100 pt-20 dark:bg-dark-50 sm:pt-0">
        <div className="justify-top flex h-full flex-col items-center px-4 sm:justify-center">
          <div className="z-10 flex w-full flex-col items-center">
            <Link href="/">
              <h1 className="mb-6 text-lg font-bold tracking-tight text-light-1000 dark:text-dark-1000">
                kan.bn
              </h1>
            </Link>
            <p className="mb-10 text-3xl font-bold tracking-tight text-light-1000 dark:text-dark-1000">
              {isEmailSent ? t`Check your inbox` : t`Forgot your password?`}
            </p>
            {isEmailSent ? (
              <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                <p className="text-md mt-2 text-center text-light-1000 dark:text-dark-1000">
                  <Trans>
                    We've sent a password reset link to {emailSentTo}.
                  </Trans>
                </p>
              </div>
            ) : (
              <div className="w-full rounded-lg border border-light-500 bg-light-300 px-4 py-10 dark:border-dark-400 dark:bg-dark-200 sm:max-w-md lg:px-10">
                <div className="sm:mx-auto sm:w-full sm:max-w-sm">
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-2">
                    <div>
                      <Input
                        {...register("email", { required: true })}
                        placeholder={t`Enter your email address`}
                      />
                      {errors.email && (
                        <p className="mt-2 text-xs text-red-400">
                          {t`Please enter a valid email address`}
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
                        {t`Send reset link`}
                      </Button>
                    </div>
                  </form>
                </div>
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
