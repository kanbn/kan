import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FaDiscord, FaGithub, FaGoogle } from "react-icons/fa";
import { z } from "zod";
import type { SocialProvider } from "better-auth/social-providers";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import Input from "~/components/Input";

interface FormValues {
  email: string;
}

interface AuthProps {
  setIsMagicLinkSent: (value: boolean, recipient: string) => void;
}

const EmailSchema = z.object({ email: z.string().email() });

export function Auth({ setIsMagicLinkSent }: AuthProps) {
  const [isLoginWithProviderPending, setIsLoginWithProviderPending] = useState<
    null | SocialProvider
  >(null);
  const [isLoginWithEmailPending, setIsLoginWithEmailPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(EmailSchema),
  });

  const { data: socialProviders } = useQuery({
    queryKey: ["social_providers"],
    queryFn: () => authClient.getSocialProviders(),
  });

  const handleLoginWithEmail = async (email: string) => {
    setIsLoginWithEmailPending(true);
    setLoginError(null);
    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/boards",
    });

    setIsLoginWithEmailPending(false);

    if (error) {
      setLoginError(
        "Something went wrong, please try again later or contact customer support.",
      );
    } else {
      setIsMagicLinkSent(true, email);
    }
  };

  const handleLoginWithProvider = async (
    provider: SocialProvider) => {
    setIsLoginWithProviderPending(provider);
    setLoginError(null);
    const { error } = await authClient.signIn.social({
      provider,
      callbackURL: "/boards",
    });

    setIsLoginWithProviderPending(null);

    if (error) {
      setLoginError(
        `Failed to login with ${provider.at(0)?.toUpperCase() + provider.slice(1)}. Please try again.`,
      );
    }
  };

  const onSubmit = async (values: FormValues) => {
    await handleLoginWithEmail(values.email);
  };

  return (
    <div className="space-y-6">
      {socialProviders?.length !== 0 && (
        <div className="space-y-2">
          {socialProviders?.includes("google") && (
            <Button
              onClick={() => handleLoginWithProvider("google")}
              isLoading={isLoginWithProviderPending === "google"}
              iconLeft={<FaGoogle />}
              fullWidth
              size="lg"
            >
              Continue with Google
            </Button>
          )}
          {socialProviders?.includes("github") && (
            <Button
              onClick={() => handleLoginWithProvider("github")}
              isLoading={isLoginWithProviderPending === "github"}
              iconLeft={<FaGithub />}
              fullWidth
              size="lg"
            >
              Continue with GitHub
            </Button>
          )}
          {socialProviders?.includes("discord") && (
            <Button
              onClick={() => handleLoginWithProvider("discord")}
              isLoading={isLoginWithProviderPending === "discord"}
              iconLeft={<FaDiscord />}
              fullWidth
              size="lg"
            >
              Continue with Discord
            </Button>
          )}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        {socialProviders?.length !== 0 && (
          <div className="mb-[1.5rem] flex w-full items-center gap-4">
            <div className="h-[1px] w-full bg-light-600 dark:bg-dark-600" />
            <span className="text-sm text-light-900 dark:text-dark-900">
              or
            </span>
            <div className="h-[1px] w-full bg-light-600 dark:bg-dark-600" />
          </div>
        )}
        <Input
          {...register("email", { required: true })}
          placeholder="Enter your email address"
        />
        {errors.email && (
          <p className="mt-2 text-xs text-red-400">
            Please enter a valid email address
          </p>
        )}
        {loginError && (
          <p className="mt-2 text-xs text-red-400">{loginError}</p>
        )}
        <div className="mt-[1.5rem]">
          <Button
            isLoading={isLoginWithEmailPending}
            fullWidth
            size="lg"
            variant="secondary"
          >
            Continue with email
          </Button>
        </div>
      </form>
    </div>
  );
}
