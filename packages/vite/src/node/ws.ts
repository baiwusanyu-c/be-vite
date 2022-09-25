// websocket，用于 hmr
import connect from "connect";
import { red } from "picocolors";
import { WebSocketServer, WebSocket } from "ws";
import { HMR_PORT } from "./constants";

export function createWebSocketServer(server: connect.Server): {
    send: (msg: string) => void;
    close: () => void;
} {
    // 创建一个 websocket 服务
    let wss: WebSocketServer;
    wss = new WebSocketServer({ port: HMR_PORT });
    // 连接成功时
    wss.on("connection", (socket) => {
        socket.send(JSON.stringify({ type: "connected" }));
    });
    // 连接错误时
    wss.on("error", (e: Error & { code: string }) => {
        if (e.code !== "EADDRINUSE") {
            console.error(red(`WebSocket server error:\n${e.stack || e.message}`));
        }
    });

    return {
        // 发送方法
        send(payload: Object) {
            const stringified = JSON.stringify(payload);
            wss.clients.forEach((client) => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(stringified);
                }
            });
        },
        // 关闭方法
        close() {
            wss.close();
        },
    };
}
