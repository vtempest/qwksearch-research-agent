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
    }),
    magicLinkClient(),
    cloudflareClient(),
    anonymousClient(),
    sentinelClient(),
  ],
});
