import type { GetCardByIdOutput } from "@kan/api/types";

export function CardCoverBanner({
  cover,
}: {
  cover: GetCardByIdOutput["cover"];
}) {
  if (cover?.kind !== "colour") return null;

  return (
    <div
      className="mb-6 h-28 w-full rounded-md"
      style={{ backgroundColor: cover.colourCode }}
      aria-hidden="true"
    />
  );
}
