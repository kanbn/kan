import type { SocialProvider } from "better-auth/social-providers";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { env } from "next-runtime-env";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  FaApple,
  FaDiscord,
  FaDropbox,
  FaFacebook,
  FaGithub,
  FaGitlab,
  FaGoogle,
  FaLinkedin,
  FaMicrosoft,
  FaOpenid,
  FaReddit,
  FaSpotify,
  FaTiktok,
  FaTwitch,
  FaTwitter,
  FaVk,
} from "react-icons/fa";
import { SiRoblox, SiZoom } from "react-icons/si";
import { TbBrandKick } from "react-icons/tb";
import { z } from "zod";

import { authClient } from "@kan/auth/client";

import Button from "~/components/Button";
import Input from "~/components/Input";
import { usePopup } from "~/providers/popup";

type AuthProvider = SocialProvider | "oidc";

interface FormValues {
  name?: string;
  email: string;
  password?: string;
}

interface AuthProps {
  setIsMagicLinkSent: (value: boolean, recipient: string) => void;
  isSignUp?: boolean;
}

const EmailSchema = z.object({
  name: z.string().optional(),
  email: z.string().email(),
  password: z.string().optional(),
});

const availableSocialProviders = {
  google: {
    id: "google",
    name: "Google",
    icon: FaGoogle,
  },
  github: {
    id: "github",
    name: "GitHub",
    icon: FaGithub,
  },
  discord: {
    id: "discord",
    name: "Discord",
    icon: FaDiscord,
  },
  apple: {
    id: "apple",
    name: "Apple",
    icon: FaApple,
  },
  microsoft: {
    id: "microsoft",
    name: "Microsoft",
    icon: FaMicrosoft,
  },
  facebook: {
    id: "facebook",
    name: "Facebook",
    icon: FaFacebook,
  },
  spotify: {
    id: "spotify",
    name: "Spotify",
    icon: FaSpotify,
  },
  twitch: {
    id: "twitch",
    name: "Twitch",
    icon: FaTwitch,
  },
  twitter: {
    id: "twitter",
    name: "Twitter",
    icon: FaTwitter,
  },
  dropbox: {
    id: "dropbox",
    name: "Dropbox",
    icon: FaDropbox,
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn",
    icon: FaLinkedin,
  },
  gitlab: {
    id: "gitlab",
    name: "GitLab",
    icon: FaGitlab,
  },
  tiktok: {
    id: "tiktok",
    name: "TikTok",
    icon: FaTiktok,
  },
  reddit: {
    id: "reddit",
    name: "Reddit",
    icon: FaReddit,
  },
  roblox: {
    id: "roblox",
    name: "Roblox",
    icon: SiRoblox,
  },
  vk: {
    id: "vk",
    name: "VK",
    icon: FaVk,
  },
  kick: {
    id: "kick",
    name: "Kick",
    icon: TbBrandKick,
  },
  zoom: {
    id: "zoom",
    name: "Zoom",
    icon: SiZoom,
  },
  oidc: {
    id: "oidc",
    name: "OIDC",
    icon: FaOpenid,
  },
};

export function Auth({ setIsMagicLinkSent, isSignUp }: AuthProps) {
  const [isCloudEnv, setIsCloudEnv] = useState(false);
  const [isLoginWithProviderPending, setIsLoginWithProviderPending] =
    useState<null | AuthProvider>(null);
  const [isCredentialsEnabled, setIsCredentialsEnabled] = useState(false);
  const [isEmailSendingEnabled, setIsEmailSendingEnabled] = useState(false);
  const [isLoginWithEmailPending, setIsLoginWithEmailPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const { showPopup } = usePopup();
  const oidcProviderName = "OIDC";
  const passwordRef = useRef<HTMLInputElement | null>(null);

  const redirect = useSearchParams().get("next");
  const callbackURL = redirect ?? "/boards";

  // Safely get environment variables on client side to avoid hydration mismatch
  useEffect(() => {
    const credentialsAllowed =
      env("NEXT_PUBLIC_ALLOW_CREDENTIALS")?.toLowerCase() === "true";
    const emailSendingEnabled =
      env("NEXT_PUBLIC_DISABLE_EMAIL")?.toLowerCase() !== "true";
    const isCloudEnv = env("NEXT_PUBLIC_KAN_ENV") === "cloud";
    setIsCloudEnv(isCloudEnv);
    setIsEmailSendingEnabled(emailSendingEnabled);
    setIsCredentialsEnabled(credentialsAllowed);
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(EmailSchema),
  });

  const { data: socialProviders } = useQuery({
    queryKey: ["social_providers"],
    queryFn: () => authClient.getSocialProviders(),
  });

  const handleLoginWithEmail = async (
    email: string,
    password?: string | null,
    name?: string,
  ) => {
    setIsLoginWithEmailPending(true);
    setLoginError(null);
    if (password) {
      if (isSignUp && name) {
        await authClient.signUp.email(
          {
            name,
            email,
            password,
            callbackURL,
          },
          {
            onSuccess: () =>
              showPopup({
                header: t`Success`,
                message: t`You have been signed up successfully.`,
                icon: "success",
              }),
            onError: ({ error }) => setLoginError(error.message),
          },
        );
      } else {
        await authClient.signIn.email(
          {
            email,
            password,
            callbackURL,
          },
          {
            onSuccess: () =>
              showPopup({
                header: t`Success`,
                message: t`You have been logged in successfully.`,
                icon: "success",
              }),
            onError: ({ error }) => setLoginError(error.message),
          },
        );
      }
    } else {
      // Only allow magic link if email sending is enabled and not in sign up mode
      if (isCloudEnv || (isEmailSendingEnabled && !isSignUp)) {
        await authClient.signIn.magicLink(
          {
            email,
            callbackURL,
          },
          {
            onSuccess: () => setIsMagicLinkSent(true, email),
            onError: ({ error }) => setLoginError(error.message),
          },
        );
      } else {
        // Provide a clear error feedback when password omitted but magic link unavailable
        setLoginError(
          isSignUp
            ? t`Password is required to sign up.`
            : t`Password is required to login.`,
        );
      }
    }

    setIsLoginWithEmailPending(false);
  };

  const handleLoginWithProvider = async (provider: AuthProvider) => {
    setIsLoginWithProviderPending(provider);
    setLoginError(null);

    let error;
    if (provider === "oidc") {
      // Use oauth2 signin for OIDC provider
      const result = await authClient.signIn.oauth2({
        providerId: "oidc",
        callbackURL,
      });
      error = result.error;
    } else {
      // Use social signin for traditional social providers
      const result = await authClient.signIn.social({
        provider,
        callbackURL,
      });
      error = result.error;
    }

    setIsLoginWithProviderPending(null);

    if (error) {
      setLoginError(
        t`Failed to login with ${provider.at(0)?.toUpperCase() + provider.slice(1)}. Please try again.`,
      );
    }
  };

  const onSubmit = async (values: FormValues) => {
    // Treat empty password string as undefined to trigger magic link path
    const sanitizedPassword = values.password?.trim()
      ? values.password
      : undefined;
    await handleLoginWithEmail(values.email, sanitizedPassword, values.name);
  };

  const password = watch("password");

  const isMagicLinkAvailable = useMemo(() => {
    return isCloudEnv || (isEmailSendingEnabled && !isSignUp);
  }, [isCloudEnv, isEmailSendingEnabled, isSignUp]);

  // Determine if we should operate in magic link mode for current form state (login only)
  const isMagicLinkMode = useMemo(() => {
    // Magic link only viable when email sending enabled AND not sign up.
    if (!isEmailSendingEnabled || isSignUp) return false;
    // If credentials disabled we always default to magic link.
    if (!isCredentialsEnabled) return true;
    // Credentials enabled: user chooses magic link by leaving password blank.
    return !password;
  }, [isEmailSendingEnabled, isSignUp, isCredentialsEnabled, password]);

  // Auto-focus password field when an error indicates it's required
  useEffect(() => {
    if (!isCredentialsEnabled) return;
    // Focus when: sign up and missing password; login error requiring password; validation error on password.
    const pwdEmpty = (password ?? "").length === 0;
    let needsPassword = false;
    if (isSignUp && pwdEmpty) {
      needsPassword = true;
    } else if (loginError?.toLowerCase().includes("password")) {
      needsPassword = true;
    } else if (errors.password) {
      needsPassword = true;
    }
    if (needsPassword && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [isSignUp, password, loginError, errors.password, isCredentialsEnabled]);

  return (
    <div className="space-y-6">
      {socialProviders?.length !== 0 && (
        <div className="space-y-2">
          {Object.entries(availableSocialProviders).map(([key, provider]) => {
            if (!socialProviders?.includes(key)) {
              return null;
            }
            return (
              <Button
                key={key}
                onClick={() => handleLoginWithProvider(key as AuthProvider)}
                isLoading={isLoginWithProviderPending === key}
                iconLeft={<provider.icon />}
                fullWidth
                size="lg"
              >
                <Trans>
                  Continue with{" "}
                  {key === "oidc" ? oidcProviderName : provider.name}
                </Trans>
              </Button>
            );
          })}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)}>
        {!isCredentialsEnabled && socialProviders?.length === 0 && (
          <div className="flex w-full items-center gap-4">
            <div className="h-[1px] w-1/3 bg-light-600 dark:bg-dark-600" />
            <span className="text-center text-sm text-light-900 dark:text-dark-900">
              {t`No authentication methods are currently available`}
            </span>
            <div className="h-[1px] w-1/3 bg-light-600 dark:bg-dark-600" />
          </div>
        )}
        {!isCredentialsEnabled && socialProviders?.length !== 0 && (
          <div className="mb-[1.5rem] flex w-full items-center gap-4">
            <div className="h-[1px] w-full bg-light-600 dark:bg-dark-600" />
            <span className="text-sm text-light-900 dark:text-dark-900">
              {t`or`}
            </span>
            <div className="h-[1px] w-full bg-light-600 dark:bg-dark-600" />
          </div>
        )}
        <div className="space-y-2">
          {isSignUp && isCredentialsEnabled && (
            <div>
              <Input
                {...register("name", { required: true })}
                placeholder={t`Enter your name`}
              />
              {errors.name && (
                <p className="mt-2 text-xs text-red-400">
                  {t`Please enter a valid name`}
                </p>
              )}
            </div>
          )}
          {(isCredentialsEnabled || isMagicLinkAvailable) && (
            <>
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

              {isCredentialsEnabled && (
                <div>
                  <Input
                    type="password"
                    {...register("password", { required: true })}
                    placeholder={t`Enter your password`}
                  />
                  {errors.password && (
                    <p className="mt-2 text-xs text-red-400">
                      {errors.password.message ??
                        t`Please enter a valid password`}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
          {loginError && (
            <p className="mt-2 text-xs text-red-400">{loginError}</p>
          )}
        </div>
        {(isCredentialsEnabled || isMagicLinkAvailable) && (
          <div className="mt-[1.5rem] flex items-center gap-4">
            <Button
              isLoading={isLoginWithEmailPending}
              fullWidth
              size="lg"
              variant="secondary"
            >
              {isSignUp ? t`Sign up with ` : t`Continue with `}
              {isMagicLinkMode ? t`magic link` : t`email`}
            </Button>
          </div>
        )}
      </form>
    </div>
  );
}
