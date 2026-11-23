import { env } from "@kan/shared/env";

export const formatToArray = (
  value: string | string[] | undefined,
): string[] => {
  if (Array.isArray(value)) {
    return value;
  }
  return value ? [value] : [];
};

export const isPlaceholderPublicId = (publicId: string) =>
  publicId.startsWith("PLACEHOLDER_");

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

  const useVirtualHosted =
    env("NEXT_PUBLIC_USE_VIRTUAL_HOSTED_URLS") === "true";
  const storageDomain = env("NEXT_PUBLIC_STORAGE_DOMAIN");
  const storageUrl = env("NEXT_PUBLIC_STORAGE_URL");
  const bucket = env("NEXT_PUBLIC_AVATAR_BUCKET_NAME");

  if (useVirtualHosted && storageDomain && bucket) {
    return `https://${bucket}.${storageDomain}/${imageOrKey}`;
  }

  if (storageUrl && bucket) {
    return `${storageUrl}/${bucket}/${imageOrKey}`;
  }

  return "";
};
