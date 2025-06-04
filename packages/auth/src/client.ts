import { apiKeyClient, magicLinkClient } from "better-auth/client/plugins";
import { BetterFetchOption, createAuthClient } from "better-auth/react";
import { socialProvidersPlugin } from "./auth";
import { BetterAuthClientPlugin } from "better-auth";

const socialProvidersPluginClient = {
  id: "social-providers-plugin",
  $InferServerPlugin: {} as ReturnType<typeof socialProvidersPlugin>,
  getActions: ($fetch) => {
    return {
      getSocialProviders: async(fetchOptions?: BetterFetchOption) => {
        const res = $fetch("/social-providers", {
          method: "GET",
          ...fetchOptions,
        });
        return res.then((res) => res.data as string[]);
      },
    }
  }
} satisfies BetterAuthClientPlugin;

export const authClient = createAuthClient({
  plugins: [magicLinkClient(), apiKeyClient(), socialProvidersPluginClient],
});
