import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";
import MetricsStore from "./metrics-store.ts";

export function setupMetricsWebSocket(server: Server) {
    const wss = new WebSocketServer({
        server,
        path: "/ws/metrics"
    });

    wss.on("connection", (socket) => {
        console.log("[WS] Dashboard connected");

        // Send current metrics immediately
        socket.send(
            JSON.stringify({
                type: "metrics",
                timestamp: Date.now(),
                data: MetricsStore.getMetrics()
            })
        );

        socket.on("close", () => {
            console.log("[WS] Dashboard disconnected");
        });
    });

    setInterval(() => {
        const message = JSON.stringify({
            type: "metrics",
            timestamp: Date.now(),
            data: MetricsStore.getMetrics()
        });

        wss.clients.forEach((client) => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }, 1000);

    console.log("[WS] Metrics WebSocket running on /ws/metrics");

    return wss;
}