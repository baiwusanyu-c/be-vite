// esbuild 编译插件，用于 node 服务读取文件后进行js转化
// 将 JS/TS/JSX/TSX 编译成浏览器可以识别的 JS 语法，可以利用 Esbuild 的 Transform API 来实现
import { readFile } from "fs-extra";
import { Plugins } from "../plugins";
import { isJSRequest } from "../utils";
import esbuild from "esbuild";
import path from "path";

export function esbuildTransformPlugin(): Plugins {
    return {
        name: "be-m-vite:esbuild-transform",
        // 加载模块
        async load(id) {
            if (isJSRequest(id)) {
                try {
                    // 根据模块 id 加载内容
                    const code = await readFile(id, "utf-8");
                    return code;
                } catch (e) {
                    return null;
                }
            }
        },
        async transform(code, id) {
            if (isJSRequest(id)) {
                // 承接 load 钩子，根据 id 分析出扩展名，
                // 使用 esbuild 对其源码转化为 js
                const extname = path.extname(id).slice(1);
                const { code: transformedCode, map } = await esbuild.transform(code, {
                    target: "esnext",
                    format: "esm",
                    sourcemap: true,
                    loader: extname as "js" | "ts" | "jsx" | "tsx",
                });
                return {
                    code: transformedCode,
                    map,
                };
            }
            return null;
        },
    };
}
