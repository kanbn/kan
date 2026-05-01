import { createLogger } from "@kan/logger";
import { startWebsocketServer } from "~/server";

const log = createLogger("websocket");

const bootstrap = () => {
  try {
    startWebsocketServer();
  } catch (error) {
    log.error({ err: error }, "failed to start websocket server");
    process.exitCode = 1;
  }
};

bootstrap();
