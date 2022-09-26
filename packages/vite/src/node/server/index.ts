// connect 是一个具有中间件机制的轻量级 Node.js 框架。
// 既可以单独作为服务器，也可以接入到任何具有中间件机制的框架中，如 Koa、Express
import connect from "connect";
// picocolors 是一个用来在命令行显示不同颜色文本的工具
import { blue, green } from "picocolors";
import { optimize } from "../optimizer";
import { resolvePlugins,Plugins } from "../plugins";
import { createPluginContainer, PluginContainer } from "../pluginContainer";
import {indexHtmlMiddware} from "./middlewares/indexHtml";
import {transformMiddleware} from "./middlewares/transform";
import {staticMiddleware} from "./middlewares/static";
import { ModuleGraph } from "../moduleGraph";
import chokidar, { FSWatcher } from "chokidar";
import {createWebSocketServer} from "../ws";
import { bindingHMREvents } from "../hmr";
// node 服务上下文
export interface ServerContext {
    root: string; // 项目启动根路径
    pluginContainer: PluginContainer; // 插件容器
    app: connect.Server; // connect的服务实例
    plugins: Plugins[]; // 插件列表
    moduleGraph: ModuleGraph; // 依赖模块图
    ws: { send: (data: any) => void; close: () => void }; // webSocket，用于 hmr
    watcher: FSWatcher; // 文件监听器，用于 hmr
}

// 开启一个 vite 使用的 node 服务
export async function startDevServer() {

    // connect 服务实例
    const app = connect();
    // 启动跟路径
    const root = process.cwd();
    const startTime = Date.now();
    // 创建文件监听器，用于 hmr
    const watcher = chokidar.watch(root, {
        ignored: ["**/node_modules/**", "**/.git/**"],
        ignoreInitial: true,
    });
    // 接受插件列表
    const plugins = resolvePlugins();
    // 创建插件容器对象
    const pluginContainer = createPluginContainer(plugins);
    // 构建模块依赖图,与模块依赖构建相关插件的 resolveId 钩子会这里运行
    const moduleGraph = new ModuleGraph((url) => pluginContainer.resolveId(url));
    // 初始化创建 websocket 连接，并返回 ws 对象（包含 send、close）
    const ws = createWebSocketServer(app);
     // 配置服务上下文
     const serverContext: ServerContext = {
           root: process.cwd(),
           app,
           pluginContainer,
           plugins,
           moduleGraph,
           watcher,
           ws
     };
     // 将服务上下文绑定到热更新 hmr 服务中，
     // 文件监听起 watcher 和 ws 实际上是在这里面做具体使用到
     bindingHMREvents(serverContext);
    // 遍历插件列表，执行插件 configureServer 钩子
     for (const plugin of plugins) {
           if (plugin.configureServer) {
               await plugin.configureServer(serverContext);
             }
     }
    // 插件的钩子放在插件容器中 pluginContainer
    // 插件容器在服务上下文中 serverContext
    // 一些中间件会访问服务上下文进而执行插件
    app.use(indexHtmlMiddware(serverContext)); // 包含执行客户端注入
    app.use(transformMiddleware(serverContext));// 包含客户端脚本你加载处理
    app.use(staticMiddleware()); // 静态服务器中间件

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
