import { Novu } from "@novu/api";
import { createLogger } from "@kan/logger";

const log = createLogger("email");

export const notificationClient =
  process.env.NEXT_PUBLIC_KAN_ENV === "cloud" && process.env.NOVU_API_KEY
    ? new Novu({ secretKey: process.env.NOVU_API_KEY })
    : null;

if (process.env.NEXT_PUBLIC_KAN_ENV === "cloud") {
  if (notificationClient) {
    log.info("Novu notification client initialized");
  } else if (!process.env.NOVU_API_KEY) {
    log.warn("Novu API key is missing, notification client disabled");
  }
}
