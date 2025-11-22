import { createServer } from "node:http";
import { WebSocketServer } from "ws";

import { websocketConfig } from "~/config";
import { logger } from "~/logger";
import { createWsHandler } from "./handler";
import { handleEventIngest } from "./ingest";

export const startWebsocketServer = () => {
  const server = createServer(async (req, res) => {
    if (req.url === websocketConfig.ingest.path) {
      await handleEventIngest(req, res);
      return;
    }

    res.statusCode = 404;
    res.end();
  });

  const wss = new WebSocketServer({ server });
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
      server.close((closeError) => {
        if (closeError) {
          logger.error("error while closing websocket http server", closeError);
        }
        logger.info("websocket server closed");
      });
    });
  };

  (["SIGINT", "SIGTERM"] as NodeJS.Signals[]).forEach((signal) => {
    process.once(signal, () => shutdown(signal));
  });

  server.listen(websocketConfig.port, () => {
    logger.info(
      `server listening on ws://localhost:${websocketConfig.port} (ingest: ${websocketConfig.ingest.path})`,
    );
  });

  return {
    port: websocketConfig.port,
    handler,
    wss,
    stop: () => shutdown("SIGTERM"),
  };
};
