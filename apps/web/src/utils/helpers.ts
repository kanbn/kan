import { env } from "next-runtime-env";

export const formatToArray = (
  value: string | string[] | undefined,
): string[] => {
  if (Array.isArray(value)) {
    return value.filter((item) => item !== undefined);
  }
  return value ? [value] : [];
};

export const inferInitialsFromEmail = (email: string) => {
  const localPart = email.split("@")[0];
  if (!localPart) return "";
  const separators = /[._-]/;
  const parts = localPart.split(separators);

  if (parts.length > 1) {
    return (
      (parts[0]?.[0] ?? "") + (parts[parts.length - 1]?.[0] ?? "")
    ).toUpperCase();
  } else {
    return localPart.slice(0, 2).toUpperCase();
  }
};

export const getInitialsFromName = (name: string) => {
  return name
    .split(" ")
    .map((namePart) => namePart.charAt(0).toUpperCase())
    .join("");
};

export const formatMemberDisplayName = (
  name: string | null,
  email: string | null,
) => {
  if (name) return name;
  if (!email) return "";

  const localPart = email.split("@")[0];

  if (!localPart) return "";

  return localPart.replace(/[_-]/g, ".");
};

export const getAvatarUrl = (imageOrKey: string | null) => {
  if (!imageOrKey) return "";

  if (imageOrKey.startsWith("http://") || imageOrKey.startsWith("https://")) {
    return imageOrKey;
  }

  // Construct URL from S3 key
  const useVirtualHosted = env("NEXT_PUBLIC_USE_VIRTUAL_HOSTED_URLS") === "true";
  const storageDomain = env("NEXT_PUBLIC_STORAGE_DOMAIN");
  const storageUrl = env("NEXT_PUBLIC_STORAGE_URL");
  const bucket = env("NEXT_PUBLIC_AVATAR_BUCKET_NAME");

  if (useVirtualHosted && storageDomain && bucket) {
    // Virtual-hosted style: https://{bucket}.{domain}/{key}
    return `https://${bucket}.${storageDomain}/${imageOrKey}`;
  }

  if (storageUrl && bucket) {
    // Path-style: {storageUrl}/{bucket}/{key}
    return `${storageUrl}/${bucket}/${imageOrKey}`;
  }

  return "";
};

export const isLightHexColor = (color: string | null | undefined) => {
  if (!color || !/^#[0-9a-fA-F]{6}$/.test(color)) return null;

  const red = parseInt(color.slice(1, 3), 16);
  const green = parseInt(color.slice(3, 5), 16);
  const blue = parseInt(color.slice(5, 7), 16);

  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;

  return luminance > 0.6;
};
