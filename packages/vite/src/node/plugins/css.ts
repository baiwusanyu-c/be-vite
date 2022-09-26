// css 解析加载插件

// 对 css 相关请求处理，将 import css 转化为动态创建标签来加载 css 的代码
import { readFile } from "fs-extra";
import { CLIENT_PUBLIC_PATH } from "../constants";
import { Plugins } from "../plugins";
import { ServerContext } from "../server";
import { getShortName } from "../utils";

export function cssPlugin(): Plugins {
    let serverContext: ServerContext;
    return {
        name: "be-m-vite:css",
        configureServer(s) {
            serverContext = s;
        },
        load(id) {
            // 根据模块 id 加载对应文件
            if (id.endsWith(".css")) {
                return readFile(id, "utf-8");
            }
        },
        // 转换逻辑
        async transform(code, id) {
            // 将 import css 转化为动态创建标签来加载 css 的代码
            if (id.endsWith(".css")) {
                // 包装成 JS 模块
                const jsContent = `
import { createHotContext as __vite__createHotContext } from "${CLIENT_PUBLIC_PATH}";
import.meta.hot = __vite__createHotContext("/${getShortName(id, serverContext.root)}");

import { updateStyle, removeStyle } from "${CLIENT_PUBLIC_PATH}"
  
const id = '${id}';
const css = '${code.replace(/\r\n/g, "")}';

updateStyle(id, css);
import.meta.hot.accept();
export default css;
import.meta.hot.prune(() => removeStyle(id));`.trim();
                return {
                    code: jsContent,
                };
            }
            return null;
        },
    };
}
