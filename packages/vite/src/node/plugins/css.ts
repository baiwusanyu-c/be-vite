// css 解析加载插件

// 对 css 相关请求处理，将 import css 转化为动态创建标签来加载 css 的代码
import { readFile } from "fs-extra";
import { Plugins } from "../plugins";

export function cssPlugin(): Plugins {
    return {
        name: "be-m-vite:css",
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
const css = "${code.replace(/\n/g, "")}";
const style = document.createElement("style");
style.setAttribute("type", "text/css");
style.innerHTML = css;
document.head.appendChild(style);
export default css;
`.trim();
                return {
                    code: jsContent,
                };
            }
            return null;
        },
    };
}
