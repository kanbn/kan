import { Subscriber } from "@subscriber.dev/sdk";

export const subscriber =
  process.env.NEXT_PUBLIC_KAN_ENV === "cloud" && process.env.SUBSCRIBER_API_KEY
    ? new Subscriber(process.env.SUBSCRIBER_API_KEY, {
        baseUrl: process.env.SUBSCRIBER_API_URL,
      })
    : null;
