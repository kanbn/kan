import { env } from "next-runtime-env";

interface UploadedAttachment {
  publicId: string;
}

export async function uploadAttachment(
  cardPublicId: string,
  file: File,
): Promise<UploadedAttachment> {
  const baseUrl = env("NEXT_PUBLIC_BASE_URL") ?? "";
  const response = await fetch(
    `${baseUrl}/api/upload/attachment?cardPublicId=${encodeURIComponent(cardPublicId)}`,
    {
      method: "POST",
      headers: {
        "Content-Type": file.type,
        "x-original-filename": encodeURIComponent(file.name),
      },
      body: file,
    },
  );

  if (!response.ok) throw new Error("Upload failed");

  const result = (await response.json()) as {
    attachment?: UploadedAttachment;
  };

  if (!result.attachment?.publicId) throw new Error("Invalid upload response");

  return result.attachment;
}
