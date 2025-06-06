import type { NextApiRequest, NextApiResponse } from "next";

import { createNextApiContext } from "@kan/api/trpc";
import { users } from "@kan/db/schema";
import { eq } from "drizzle-orm";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { user } = await createNextApiContext(req);

  if (!user)
    return res.status(401).json({ message: "User not authenticated" });

  const apiKey = process.env.TRELLO_APP_API_KEY;

  if (!apiKey)
    return res.status(500).json({ message: "Trello API key not found" });

  const token = req.body.token;

  if (!token)
    return res.status(400).json({ message: "No token found" });

  try {
    const { db } = await createNextApiContext(req);
    await db.update(users).set({ trelloToken: token, trelloConnected: true }).where(eq(users.id, user.id));

    return res.status(200).json({ message: "Trello authentication successful" });
  } catch (err) {
    console.error("Trello authentication error:", err);
    return res.status(400).json({ message: "Trello authentication failed" });
  }
}