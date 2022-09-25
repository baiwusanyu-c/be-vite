import { ServerContext } from "./server";
import { blue, green } from "picocolors";
import { getShortName } from "./utils";

export function bindingHMREvents(serverContext: ServerContext) {
    // 从服务上下文 获取 文件监听、websocket、项目根路径
    const { watcher, ws, root } = serverContext;
    // 监听文件变动（基于 chokidar）
    watcher.on("change", async (file) => {
        console.log(`✨${blue("[hmr]")} ${green(file)} changed`);
        const { moduleGraph } = serverContext;
        // 根据模块变动，清除模块依赖图中的缓存
        await moduleGraph.invalidateModule(file);
        // 向客户端发送更新信息
        console.log(`🔥${getShortName(file, root)}`);
        ws.send({
            type: "update",
            updates: [
                {
                    type: "js-update",
                    timestamp: Date.now(),
                    path: "/" + getShortName(file, root),
                    acceptedPath: "/" + getShortName(file, root),
                },
            ],
        });
    });
}
