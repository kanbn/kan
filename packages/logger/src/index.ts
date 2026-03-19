import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";
const isCloud = process.env.NEXT_PUBLIC_KAN_ENV === "cloud";
const level = process.env.LOG_LEVEL || (isDev ? "debug" : "info");

const axiomToken = process.env.AXIOM_TOKEN;
const axiomDataset = process.env.AXIOM_DATASET;
const useAxiom = isCloud && !!axiomToken && !!axiomDataset;

const targets: pino.TransportTargetOptions[] = [];

if (isDev) {
  targets.push({
    target: "pino-pretty",
    options: {
      colorize: true,
      ignore: "pid,hostname",
      translateTime: "HH:MM:ss",
    },
  });
}

if (useAxiom) {
  targets.push({
    target: "@axiomhq/pino",
    options: {
      dataset: axiomDataset,
      token: axiomToken,
    },
  });
}

export const logger = pino({
  level,
  ...(targets.length > 0 && {
    transport: { targets },
  }),
});

export const createLogger = (module: string) => logger.child({ module });
