import { createAuthClient } from "better-auth/react";
import { oneTapClient, magicLinkClient, anonymousClient } from "better-auth/client/plugins";
import { cloudflareClient } from "better-auth-cloudflare/client";
import { sentinelClient } from "@better-auth/infra/client";
import {
  NEXT_PUBLIC_BASE_URL,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID,
} from "../config/site";

const getBaseURL = () => {
  if (typeof window !== "undefined") {
    return window.location.origin;
  }
  return NEXT_PUBLIC_BASE_URL;
};

export const authClient = createAuthClient({
  baseURL: getBaseURL(),
  plugins: [
    oneTapClient({
      clientId: NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
      // better-auth's fedCM flag only covers sign-out; use_fedcm_for_prompt is required to skip the legacy /gsi/status XHR (CORS-blocks under credentials).
      additionalOptions: {
        use_fedcm_for_prompt: true,
        itp_support: true,
      },
      promptOptions: {
        fedCM: true,
      },
    }),
    magicLinkClient(),
    cloudflareClient(),
    anonymousClient(),
    sentinelClient(),
  ],
});
