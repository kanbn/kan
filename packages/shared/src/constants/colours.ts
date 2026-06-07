export const colours: { name: string; code: string }[] = [
  { name: "Teal", code: "#0d9488" },
  { name: "Light Teal", code: "#9fdfd9" },
  { name: "Green", code: "#65a30d" },
  { name: "Light Green", code: "#bef264" },
  { name: "Blue", code: "#0284c7" },
  { name: "Light Blue", code: "#7dd3fc" },
  { name: "Purple", code: "#4f46e5" },
  { name: "Light Purple", code: "#c4b5fd" },
  { name: "Yellow", code: "#ca8a04" },
  { name: "Light Yellow", code: "#fde68a" },
  { name: "Orange", code: "#ea580c" },
  { name: "Light Orange", code: "#fdba74" },
  { name: "Red", code: "#dc2626" },
  { name: "Light Red", code: "#fca5a5" },
  { name: "Pink", code: "#db2777" },
  { name: "Light Pink", code: "#f9a8d4" },
] as const;

export type Colour = (typeof colours)[number];
