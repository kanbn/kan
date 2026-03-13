import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";
const level = process.env.LOG_LEVEL ?? (isDev ? "debug" : "info");

export const logger = pino({
  level,
  ...(isDev && {
    transport: {
      target: "pino-pretty",
      options: {
        colorize: true,
        ignore: "pid,hostname",
        translateTime: "HH:MM:ss",
      },
    },
  }),
});

export const createLogger = (module: string) => logger.child({ module });
