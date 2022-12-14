// 编译入口 html 的中间件
import { NextHandleFunction } from "connect";
import { ServerContext } from "../index";
import path from "path";
import { pathExists, readFile } from "fs-extra";
// 中间件接受服务上下文 ServerContext
export function indexHtmlMiddware(
    serverContext: ServerContext
): NextHandleFunction {
    return async (req, res, next) => {
        if (req.url === "/") {
            const { root } = serverContext;
            // 默认使用项目根目录下的 index.html
            const indexHtmlPath = path.join(root, "index.html");
            if (await pathExists(indexHtmlPath)) {
                const rawHtml = await readFile(indexHtmlPath, "utf8");
                let html = rawHtml;
                // 通过执行插件的 transformIndexHtml 方法来对 HTML 进行自定义的修改
                // 注意这里和其他插件使用插件容器 pluginContainer 调用不一样，这里是直接调用
                for (const plugin of serverContext.plugins) {
                    if (plugin.transformIndexHtml) {
                        html = await plugin.transformIndexHtml(html);
                    }
                }
                res.statusCode = 200;
                res.setHeader("Content-Type", "text/html");
                return res.end(html);
            }
        }
        return next();
    };
}
