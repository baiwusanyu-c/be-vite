// vite cli
// vite 的 node 服务入口 cli，vite 的开发、构建、热更新
// 等核心功能都是在 这个 node 服务中实现的
import cac from "cac";
import { startDevServer } from "./server";
// 创建 cli 对象
const cli = cac()

// 指令
cli.command("[root]", "Run the development server")
    // 创建一个指令实例，设置为 [root],你的bin 是 x ，则使用x可运行，否则要用 x serve 、x rawName、x dev
    .alias("serve") // 指令别名
    .alias("dev") // 指令别名
    .action(async () => { // 指令动作
        // 启动一个 dev 服务
        await startDevServer();
    });

cli.help();

cli.parse(); // 解析上面步骤配置，开始执行
