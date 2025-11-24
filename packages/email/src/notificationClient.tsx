import { Novu } from "@novu/api";

export const notificationClient =
  process.env.NEXT_PUBLIC_KAN_ENV === "cloud" && process.env.NOVU_API_KEY
    ? new Novu({ secretKey: process.env.NOVU_API_KEY })
    : null;
