const ColoredBackground = ({ color }: { color: string }) => (
  <div
    className="absolute inset-0 h-full w-full"
    style={{ backgroundColor: color }}
  />
);

export default ColoredBackground;
