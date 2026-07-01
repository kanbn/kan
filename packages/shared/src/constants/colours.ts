export const colours: { name: string; code: string }[] = [
  { name: "Teal", code: "#0d9488" },
  { name: "Green", code: "#65a30d" },
  { name: "Blue", code: "#0284c7" },
  { name: "Purple", code: "#4f46e5" },
  { name: "Yellow", code: "#ca8a04" },
  { name: "Orange", code: "#ea580c" },
  { name: "Red", code: "#dc2626" },
  { name: "Pink", code: "#db2777" },
  { name: "Light Teal", code: "#9fdfd9" },
  { name: "Light Green", code: "#bef264" },
  { name: "Light Blue", code: "#7dd3fc" },
  { name: "Light Purple", code: "#c4b5fd" },
  { name: "Light Yellow", code: "#fde68a" },
  { name: "Light Orange", code: "#fdba74" },
  { name: "Light Red", code: "#fca5a5" },
  { name: "Light Pink", code: "#f9a8d4" },
] as const;

export type Colour = (typeof colours)[number];
