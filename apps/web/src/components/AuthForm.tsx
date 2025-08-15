import type { SocialProvider } from "better-auth/social-providers";
import { zodResolver } from "@hookform/resolvers/zod";
import { t } from "@lingui/core/macro";
import { Trans } from "@lingui/react/macro";
import { useQuery } from "@tanstack/react-query";
import { env } from "next-runtime-env";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  FaApple,
  FaDiscord,
  FaDropbox,
  FaFacebook,
  FaGithub,
  FaGitlab,
  FaGoogle,
  FaKey,
  FaLinkedin,
  FaMicrosoft,
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
    name: "OIDC", // Will be overridden dynamically
    icon: FaKey,
  },
};

export function Auth({ setIsMagicLinkSent, isSignUp }: AuthProps) {
  const [isLoginWithProviderPending, setIsLoginWithProviderPending] =
    useState<null | AuthProvider>(null);
  const [isCredentialsEnabled, setIsCredentialsEnabled] = useState(false);
  const [isLoginWithEmailPending, setIsLoginWithEmailPending] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [oidcProviderName, setOidcProviderName] = useState<string>("OIDC");
  const { showPopup } = usePopup();

  // Safely get environment variables on client side to avoid hydration mismatch
  useEffect(() => {
    const credentialsAllowed =
      env("NEXT_PUBLIC_ALLOW_CREDENTIALS")?.toLowerCase() === "true";
    setIsCredentialsEnabled(credentialsAllowed);

    const providerName = env("NEXT_PUBLIC_OIDC_PROVIDER_NAME");
    if (providerName) {
      setOidcProviderName(providerName);
    }
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
    password?: string,
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
            callbackURL: "/boards",
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
            callbackURL: "/boards",
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
      await authClient.signIn.magicLink(
        {
          email,
          callbackURL: "/boards",
        },
        {
          onSuccess: () => setIsMagicLinkSent(true, email),
          onError: ({ error }) => setLoginError(error.message),
        },
      );
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
        callbackURL: "/boards",
      });
      error = result.error;
    } else {
      // Use social signin for traditional social providers
      const result = await authClient.signIn.social({
        provider,
        callbackURL: "/boards",
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
    await handleLoginWithEmail(values.email, values.password, values.name);
  };

  const password = watch("password");

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
        {socialProviders?.length !== 0 && (
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
                  {t`Please enter a valid password`}
                </p>
              )}
            </div>
          )}
          {loginError && (
            <p className="mt-2 text-xs text-red-400">{loginError}</p>
          )}
        </div>
        <div className="mt-[1.5rem] flex items-center gap-4">
          <Button
            isLoading={isLoginWithEmailPending}
            fullWidth
            size="lg"
            variant="secondary"
          >
            {isSignUp ? t`Sign up with ` : t`Continue with `}
            {!isCredentialsEnabled || (password && password.length !== 0)
              ? t`email`
              : t`magic link`}
          </Button>
        </div>
      </form>
    </div>
  );
}
