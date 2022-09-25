// 转换中间件，包括对js、ts、jsx、tsx转换
import { NextHandleFunction } from "connect";
import {
    isJSRequest,
    cleanUrl, isCSSRequest,isImportRequest
} from "../../utils";
import { ServerContext } from "../index";
import createDebug from "debug";

const debug = createDebug("dev");

export async function transformRequest(
    url: string,
    serverContext: ServerContext
) {
    const { pluginContainer } = serverContext;
    url = cleanUrl(url);
    // 简单来说，就是依次调用插件容器的 resolveId、load、transform 方法
    // 从插件容器中调用这些方法，实际上就是循环列插件列表，挨个调用这些钩子
    // 其中不乏有一些 ts -》js 这种相关 transform 插件
    // 也有读取 ts、jsx 文件的相关 load 插件
    // 也有依赖查询相关的 resolvedId 插件
    const resolvedResult = await pluginContainer.resolveId(url);
    let transformResult;
    if (resolvedResult?.id) {
        let code = await pluginContainer.load(resolvedResult.id);
        if (typeof code === "object" && code !== null) {
            code = code.code;
        }
        if (code) {
            transformResult = await pluginContainer.transform(
                code as string,
                resolvedResult?.id
            );
        }
    }
    return transformResult;
}

// 中间件过滤出浏览器对 js 相关文件的资源请求
// 调用转换插件，读取对应的文件并返回文件内容（即xxx.js脚本代码）给浏览器
export function transformMiddleware(
    serverContext: ServerContext
): NextHandleFunction {
    return async (req, res, next) => {
        if (req.method !== "GET" || !req.url) {
            return next();
        }
        const url = req.url;
        debug("transformMiddleware: %s", url);
        // transform JS、css、svg.... request
        if (isJSRequest(url) || isCSSRequest(url) || isImportRequest(url)) {
            // 核心编译函数
            let result = await transformRequest(url, serverContext);
            if (!result) {
                return next();
            }
            if (result && typeof result !== "string") {
                // @ts-ignore
                result = result.code;
            }
            // 编译完成，返回响应给浏览器
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/javascript");
            return res.end(result);
        }

        next();
    };
}
