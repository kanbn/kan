import { logger } from "~/logger";
import { startWebsocketServer } from "~/server";

const bootstrap = () => {
  try {
    startWebsocketServer();
  } catch (error) {
    logger.error("failed to start websocket server", error);
    process.exitCode = 1;
  }
};

bootstrap();
