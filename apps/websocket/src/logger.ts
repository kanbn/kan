const formatMessage = (level: "info" | "error" | "warn", message: string) => {
  const timestamp = new Date().toISOString();
  return `[websocket:${level}] ${timestamp} ${message}`;
};

export const logger = {
  info: (message: string) => {
    console.log(formatMessage("info", message));
  },
  warn: (message: string) => {
    console.warn(formatMessage("warn", message));
  },
  error: (message: string, error?: unknown) => {
    if (error instanceof Error) {
      console.error(
        formatMessage("error", `${message} - ${error.message}`),
        error,
      );
      return;
    }

    console.error(formatMessage("error", message), error);
  },
};
