import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { FaDiscord, FaGithub, FaGoogle, FaApple, FaMicrosoft, FaFacebook, FaSpotify, FaTwitch, FaTwitter, FaDropbox, FaLinkedin, FaGitlab, FaTiktok, FaReddit, FaVk } from "react-icons/fa";
import { SiRoblox, SiZoom } from "react-icons/si";
import { TbBrandKick } from "react-icons/tb";
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
}

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
          {Object.entries(availableSocialProviders).map(([key, provider]) => {
            if (!socialProviders?.includes(key)) {
              return null;
            }
            return (
            <Button
              onClick={() => handleLoginWithProvider(key as SocialProvider)}
              isLoading={isLoginWithProviderPending === key}
              iconLeft={<provider.icon />}
              fullWidth
              size="lg"
            >
              Continue with {provider.name}
            </Button>
          )})}
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
