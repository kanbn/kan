import { WebSocketServer } from "ws";

import { websocketConfig } from "~/config";
import { logger } from "~/logger";
import { createWsHandler } from "./handler";

export const startWebsocketServer = () => {
  const wss = new WebSocketServer({ port: websocketConfig.port });
  const handler = createWsHandler(wss, websocketConfig.keepAlive);

  wss.on("connection", (socket) => {
    logger.info(`connection opened (active: ${wss.clients.size})`);
    socket.once("close", () => {
      logger.info(`connection closed (active: ${wss.clients.size})`);
    });
  });

  const shutdown = (signal: NodeJS.Signals) => {
    // Inform connected clients so they can resubscribe when the process exits.
    logger.warn(`${signal} received, notifying clients about reconnect`);
    handler.broadcastReconnectNotification();
    wss.close((error) => {
      if (error) {
        logger.error("error while closing websocket server", error);
      }
      logger.info("websocket server closed");
    });
  };

  (["SIGINT", "SIGTERM"] as NodeJS.Signals[]).forEach((signal) => {
    process.once(signal, () => shutdown(signal));
  });

  logger.info(
    `server listening on ws://localhost:${wss.options.port ?? websocketConfig.port}`,
  );

  return {
    port: wss.options.port ?? websocketConfig.port,
    handler,
    wss,
    stop: () => shutdown("SIGTERM"),
  };
};
