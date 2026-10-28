import type { Colour } from "@kan/shared/constants";
import { colours } from "@kan/shared/constants";

export const resolveLabelColour = (
  colourCode: string | null | undefined,
): Colour => {
  const defaultColour = colours[0];

  if (!defaultColour) throw new Error("Label colour palette is empty");
  if (!colourCode) return defaultColour;

  return (
    colours.find((colour) => colour.code === colourCode) ?? {
      name: colourCode,
      code: colourCode,
    }
  );
};
