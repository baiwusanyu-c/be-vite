// connect 是一个具有中间件机制的轻量级 Node.js 框架。
// 既可以单独作为服务器，也可以接入到任何具有中间件机制的框架中，如 Koa、Express
import connect from "connect";
// picocolors 是一个用来在命令行显示不同颜色文本的工具
import { blue, green } from "picocolors";
import { optimize } from "../optimizer";
import { resolvePlugins,Plugins } from "../plugins";
import { createPluginContainer, PluginContainer } from "../pluginContainer";
import {indexHtmlMiddware} from "./middlewares/indexHtml";
// node 服务上下文
export interface ServerContext {
    root: string; // 项目启动根路径
    pluginContainer: PluginContainer; // 插件容器
    app: connect.Server; // connect的服务实例
    plugins: Plugins[]; // 插件列表
}

// 开启一个 vite 使用的 node 服务
export async function startDevServer() {
    // connect 服务实例
    const app = connect();
    // 启动跟路径
    const root = process.cwd();
    const startTime = Date.now();
    // 接受插件列表
    const plugins = resolvePlugins();
    // 创建插件容器对象
    const pluginContainer = createPluginContainer(plugins);
     // 配置服务上下文
     const serverContext: ServerContext = {
           root: process.cwd(),
           app,
           pluginContainer,
           plugins,
         };
    // 遍历插件列表，执行插件 configureServer 钩子
     for (const plugin of plugins) {
           if (plugin.configureServer) {
               await plugin.configureServer(serverContext);
             }
     }
    app.use(indexHtmlMiddware(serverContext));

    app.listen(3000, async () => {
        // 预构建依赖
        optimize(root)
        console.log(
            green("🚀 No-Bundle 服务已经成功启动!"),
            `耗时: ${Date.now() - startTime}ms`
        );
        console.log(`> 本地访问路径: ${blue("http://localhost:3000")}`);
    });
}
