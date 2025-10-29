import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const response = await fetch("https://formbricks.com/api/oss-friends");
    if (!response.ok) {
      throw new Error("Failed to fetch from Formbricks");
    }
    const data = await response.json();

    return res.status(200).json(data);
  } catch (error) {
    console.error("Error fetching OSS friends:", error);
    return res.status(500).json({ message: "Failed to fetch OSS friends" });
  }
}
