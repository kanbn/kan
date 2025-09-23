import type { BetterAuthClientPlugin } from "better-auth";
import type { BetterFetchOption } from "better-auth/react";
import { stripeClient } from "@better-auth/stripe/client";
import {
  apiKeyClient,
  genericOAuthClient,
  magicLinkClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { socialProvidersPlugin } from "./auth";

const socialProvidersPluginClient = {
  id: "social-providers-plugin",
  $InferServerPlugin: {} as ReturnType<typeof socialProvidersPlugin>,
  getActions: ($fetch) => {
    return {
      getSocialProviders: async (fetchOptions?: BetterFetchOption) => {
        const res = $fetch("/social-providers", {
          method: "GET",
          ...fetchOptions,
        });
        return res.then((res) => res.data as string[]);
      },
    };
  },
} satisfies BetterAuthClientPlugin;

export const authClient = createAuthClient({
  plugins: [
    stripeClient({
      subscription: true,
    }),
    magicLinkClient(),
    apiKeyClient(),
    genericOAuthClient(),
    socialProvidersPluginClient,
  ],
});
