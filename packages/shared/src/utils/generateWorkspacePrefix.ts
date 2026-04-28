export const generateWorkspacePrefix = (name: string): string => {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 0);

  if (words.length === 0) return "WS";

  const firstWord = words[0];
  if (words.length === 1 && firstWord) {
    const word = firstWord.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
    return word.slice(0, 3) || "WS";
  }

  const initials = words
    .map((w) => {
      const cleaned = w.replace(/[^a-zA-Z0-9]/g, "");
      return cleaned.length > 0 ? cleaned[0]! : "";
    })
    .filter((c) => c.length > 0)
    .join("")
    .toUpperCase()
    .slice(0, 4);

  return initials || "WS";
};
