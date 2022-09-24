// vite cli
// vite 的 node 服务入口 cli，vite 的开发、构建、热更新
// 等核心功能都是在 这个 node 服务中实现的
import cac from "cac";
import { startDevServer } from "./server";
// 创建 cli 对象
const cli = cac()

// 指令
cli
    .command("[root]", "Run the development server")
    .alias("serve")
    .alias("dev")
    .action(async () => {
        // 启动一个 dev 服务
        await startDevServer();
    });

cli.help();

cli.parse();
