const toLinearChannel = (value: number) => {
  const channel = value / 255;
  return channel <= 0.04045
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
};

export const getContrastingTextColour = (colourCode: string) => {
  const red = Number.parseInt(colourCode.slice(1, 3), 16);
  const green = Number.parseInt(colourCode.slice(3, 5), 16);
  const blue = Number.parseInt(colourCode.slice(5, 7), 16);
  const luminance =
    0.2126 * toLinearChannel(red) +
    0.7152 * toLinearChannel(green) +
    0.0722 * toLinearChannel(blue);

  const whiteContrast = 1.05 / (luminance + 0.05);
  const blackContrast = (luminance + 0.05) / 0.05;

  return whiteContrast > blackContrast ? "#ffffff" : "#000000";
};
