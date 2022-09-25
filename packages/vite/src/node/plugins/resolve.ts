// 路径分析插件
// 对请求的路径进行处理，使之能转换真实文件系统中的路径

import resolve from "resolve";
import { Plugins } from "../plugins";
import { ServerContext } from "../server";
import path from "path";
import { pathExists } from "fs-extra";
import { DEFAULT_EXTERSIONS } from "../constants";
import { removeImportQuery, cleanUrl, isInternalRequest } from "../utils";

export function resolvePlugin(): Plugins {
    let serverContext: ServerContext;
    return {
        name: "be-m-vite:resolve",
        configureServer(s) {
            // 保存服务端上下文
            serverContext = s;
        },
        async resolveId(id: string, importer?: string) {
            id = removeImportQuery(cleanUrl(id));
            if (isInternalRequest(id)) {
                return null;
            }
            // 1. 绝对路径
            if (path.isAbsolute(id)) {
                if (await pathExists(id)) {
                    return { id };
                }
                // 加上 root 路径前缀，处理 /src/main.tsx 的情况
                id = path.join(serverContext.root, id);
                if (await pathExists(id)) {
                    return { id };
                }
            }
            // 2. 相对路径
            else if (id.startsWith(".")) {
                if (!importer) {
                    throw new Error("`importer` should not be undefined");
                }
                // path.extname 返回路径文件扩展名
                const hasExtension = path.extname(id).length > 1;
                let resolvedId: string;
                // 2.1 包含文件名后缀
                // 如 ./App.tsx
                if (hasExtension) {
                    // resolve.sync 路径算法分析相对路径
                    resolvedId = resolve.sync(id, { basedir: path.dirname(importer) });
                    if (await pathExists(resolvedId)) {
                        return { id: resolvedId };
                    }
                }
                    // 2.2 不包含文件名后缀
                // 如 ./App
                else {
                    // ./App -> ./App.tsx
                    for (const extname of DEFAULT_EXTERSIONS) {
                        try {
                            const withExtension = `${id}${extname}`;
                            resolvedId = resolve.sync(withExtension, {
                                basedir: path.dirname(importer),
                            });
                            if (await pathExists(resolvedId)) {
                                return { id: resolvedId };
                            }
                        } catch (e) {
                            continue;
                        }
                    }
                }
            }
            return null;
        },
    };
}
