import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const { url, filename } = req.query;

  if (!url || typeof url !== "string") {
    return res.status(400).json({
      message: "url parameter is required",
    });
  }

  try {
    const downloadUrl = decodeURIComponent(url);
    const downloadFilename =
      (typeof filename === "string" ? decodeURIComponent(filename) : null) ??
      "attachment";

    const upstream = await fetch(downloadUrl);

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        message: "Failed to fetch attachment",
      });
    }

    const contentType =
      upstream.headers.get("Content-Type") ?? "application/octet-stream";

    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${downloadFilename}"`,
    );

    const buffer = await upstream.arrayBuffer();
    return res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Error downloading attachment:", error);
    return res.status(500).json({ message: "Failed to download attachment" });
  }
}
