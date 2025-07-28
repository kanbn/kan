import Plunk from "@plunk/node";

export const cloudMailerClient =
  process.env.NEXT_PUBLIC_KAN_ENV === "cloud"
    ? new Plunk(process.env.PLUNK_API_KEY ?? "", {
        baseUrl: process.env.PLUNK_API_URL,
      })
    : null;
