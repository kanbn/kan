import { createServer } from "node:http";
import { WebSocketServer } from "ws";

import { createLogger } from "@kan/logger";

import { websocketConfig } from "~/config";
import { createWsHandler } from "./handler";
import { handleEventIngest } from "./ingest";

const log = createLogger("websocket");

export const startWebsocketServer = () => {
  const server = createServer((req, res) => {
    void (async () => {
      if (req.method === "GET" && req.url === "/health") {
        res.statusCode = 200;
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ status: "ok" }));
        return;
      }

      if (req.url === websocketConfig.ingest.path) {
        await handleEventIngest(req, res);
        return;
      }

      res.statusCode = 404;
      res.end();
    })();
  });

  const wss = new WebSocketServer({ server });
  const handler = createWsHandler(wss, websocketConfig.keepAlive);

  wss.on("connection", (socket) => {
    log.info(`connection opened (active: ${wss.clients.size})`);
    socket.once("close", () => {
      log.info(`connection closed (active: ${wss.clients.size})`);
    });
  });

  let shuttingDown = false;

  const shutdown = (signal: NodeJS.Signals) => {
    if (shuttingDown) return;
    shuttingDown = true;

    // Force-exit safety net — prevents the process from hanging indefinitely.
    setTimeout(() => {
      log.error("forced exit after shutdown timeout");
      process.exit(1);
    }, 10_000).unref();

    // Inform connected clients so they can resubscribe when the process exits.
    log.warn(`${signal} received, notifying clients about reconnect`);
    handler.broadcastReconnectNotification();
    wss.close((error) => {
      if (error) {
        log.error({ err: error }, "error while closing websocket server");
      }
      server.close((closeError) => {
        if (closeError) {
          log.error({ err: closeError }, "error while closing websocket http server");
        }
        log.info("websocket server closed");
        process.exit(0);
      });
    });
  };

  (["SIGINT", "SIGTERM"] as NodeJS.Signals[]).forEach((signal) => {
    process.once(signal, () => shutdown(signal));
  });

  server.listen(websocketConfig.port, websocketConfig.host, () => {
    log.info(
      `websocket listening on :${websocketConfig.port} (ingest path: ${websocketConfig.ingest.path})`,
    );
  });

  return {
    port: websocketConfig.port,
    handler,
    wss,
    stop: () => shutdown("SIGTERM"),
  };
};
