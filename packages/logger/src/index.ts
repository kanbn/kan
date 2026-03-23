import { Axiom } from "@axiomhq/js";
import { trace } from "@opentelemetry/api";
import pino from "pino";

const isDev = process.env.NODE_ENV !== "production";
const isCloud = process.env.NEXT_PUBLIC_KAN_ENV === "cloud";
const level = process.env.LOG_LEVEL || (isDev ? "debug" : "info");

const axiomToken = process.env.AXIOM_TOKEN;
const axiomDataset = process.env.AXIOM_DATASET;
const useAxiom = isCloud && !!axiomToken && !!axiomDataset;

function createAxiomStream(
  token: string,
  dataset: string,
): pino.DestinationStream {
  const client = new Axiom({ token });
  return {
    write(msg: string) {
      try {
        client.ingest(dataset, [JSON.parse(msg) as Record<string, unknown>]);
      } catch {
        // ignore malformed log lines
      }
    },
  };
}

export const logger = useAxiom
  ? pino(
      { level },
      pino.multistream([
        { stream: process.stdout, level },
        { stream: createAxiomStream(axiomToken, axiomDataset), level },
      ]),
    )
  : pino({
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

function getTraceContext(): { traceId?: string; spanId?: string } {
  try {
    const span = trace.getActiveSpan();
    if (!span) return {};
    const ctx = span.spanContext();
    return { traceId: ctx.traceId, spanId: ctx.spanId };
  } catch {
    return {};
  }
}

export const createLogger = (module: string) =>
  logger.child({ module, ...getTraceContext() });
