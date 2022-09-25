// 静态资源处理中间件
// 在 jsx 模板元素中，一些通过 dom 的 src 加载的静态资源在这里处理
import { NextHandleFunction } from "connect";
import { isImportRequest } from "../../utils";
// 一个用于加载静态资源的中间件
import sirv from "sirv";

export function staticMiddleware(): NextHandleFunction {
    const serveFromRoot = sirv("/", { dev: true });
    return async (req, res, next) => {
        if (!req.url) {
            return;
        }
        // 不处理 import 请求
        if (isImportRequest(req.url)) {
            return;
        }
        // 使用 sirv 库加载静态资源
        serveFromRoot(req, res, next);
    };
}
