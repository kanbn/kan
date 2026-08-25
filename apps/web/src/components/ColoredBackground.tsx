const ColoredBackground = ({ color }: { color: string }) => (
  <div
    className="pointer-events-none absolute inset-0 z-0 h-full w-full transition-opacity group-hover:opacity-90"
    style={{ backgroundColor: color }}
  />
);

export default ColoredBackground;
