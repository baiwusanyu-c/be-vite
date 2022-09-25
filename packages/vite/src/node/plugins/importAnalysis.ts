// import 分析插件
// 对于第三方依赖路径(bare import)，需要重写为预构建产物路径；
// 对于绝对路径和相对路径，需要借助之前的路径解析插件进行解析。
import {init, parse} from "es-module-lexer";
import {
    BARE_IMPORT_RE,
    PRE_BUNDLE_DIR,
    CLIENT_PUBLIC_PATH,
} from "../constants";
import {
    cleanUrl,
    getShortName, isInternalRequest,
    isJSRequest,
} from "../utils";
// magic-string 用来作字符串编辑
import MagicString from "magic-string";
import path from "path";
import {Plugins} from "../plugins";
import {ServerContext} from "../server";


export function importAnalysisPlugin(): Plugins {
    let serverContext: ServerContext;
    return {
        name: "be-m-vite:import-analysis",
        configureServer(s) {
            // 保存服务端上下文
            serverContext = s;
        },
        async transform(code: string, id: string) {
            // 只处理 JS 相关的请求
            if (!isJSRequest(id) || isInternalRequest(id)) {
                return null;
            }
            await init;
            // 当前转换模块的所有依赖集合
            const importedModules = new Set<string>();
            // 解析 import 语句 (基于 es-module-lexer 库)
            const [imports] = parse(code);
            const ms = new MagicString(code);
            // 获取当前模块依赖图节点
            const { moduleGraph } = serverContext;
            const curMod = moduleGraph.getModuleById(id)!;

            const resolve = async (id: string, importer?: string) => {
                // @ts-ignore // 这里 this 是插件上下文 createPluginContainer 创建的 Context,相当于挨个执行钩子的 resolveId 钩子
                const resolved = await this.resolve(
                    id,
                    importer
                );
                if (!resolved) {
                    return;
                }
                // 更新对应模块的 热更新时间戳
                const cleanedId = cleanUrl(resolved.id);
                const mod = moduleGraph.getModuleById(cleanedId);
                let resolvedId = `/${getShortName(resolved.id, serverContext.root)}`;
                if (mod && mod.lastHMRTimestamp > 0) {
                    resolvedId += "?t=" + mod.lastHMRTimestamp;
                }
                return resolvedId;
            };

            // 对每一个 import 语句依次进行分析
            for (const importInfo of imports) {
                // 举例说明: const str = `import React from 'react'`
                // str.slice(s, e) => 'react'
                const {s: modStart, e: modEnd, n: modSource} = importInfo;
                if (!modSource || isInternalRequest(modSource)) continue;
                // 静态资源
                if (modSource.endsWith(".svg")) {
                    // 加上 ?import 后缀
                    const resolvedUrl = path.join(path.dirname(id), modSource);
                    ms.overwrite(modStart, modEnd, `${resolvedUrl}?import`);
                    continue;
                }
                // 第三方库: 路径重写到预构建产物的路径（node_modules/be-m-vite）
                if (BARE_IMPORT_RE.test(modSource)) {
                    const bundlePath = path.join(
                        serverContext.root,
                        PRE_BUNDLE_DIR,
                        `${modSource}.js`
                    );
                    ms.overwrite(modStart, modEnd, bundlePath);
                    // 添加到依赖集合
                    importedModules.add(bundlePath);
                } else if (modSource.startsWith(".") || modSource.startsWith("/")) {
                    // 直接调用插件上下文的 resolve 方法，会自动经过路径解析插件的处理
                    const resolved = await resolve(modSource, id);
                    if (resolved) {
                        ms.overwrite(modStart, modEnd, resolved);
                        // 添加到依赖集合
                        importedModules.add(resolved);
                    }
                }
            }
            // 只对业务源码注入
            if (!id.includes("node_modules")) {
                // 实现 import.meta.hot.xxx
                // 注入 HMR 相关的工具函数
                // createHotContext 是在注入的客户端脚本中实现并运行的
                ms.prepend(
                    `import { createHotContext as __vite__createHotContext } from "${CLIENT_PUBLIC_PATH}";` +
                    `import.meta.hot = __vite__createHotContext(${JSON.stringify(
                        cleanUrl(curMod.url)
                    )});`
                );
            }
            // 更新当前转换模块的所有依赖集合
            moduleGraph.updateModuleInfo(curMod, importedModules);
            return {
                code: ms.toString(),
                // 生成 SourceMap
                map: ms.generateMap(),
            };
        },
    };
}
