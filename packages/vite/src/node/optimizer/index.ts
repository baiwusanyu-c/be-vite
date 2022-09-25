import path from "path";
import { build } from "esbuild";
import { green } from "picocolors";
import { scanPlugin } from "./scanPlugin";
import { preBundlePlugin } from "./preBundlePlugin";
import {PRE_BUNDLE_DIR} from '../constants'
// 预构建依赖入口
export async function optimize(root: string) {
    // 1. 确定入口
    const entry = path.resolve(root, "src/main.tsx");
    // 2. 从入口处扫描依赖
    // 扫描依赖的模块依赖图对象
    const deps = new Set<string>();
    // 使用 esbuild 构建，write 为 false
    await build({
        entryPoints: [entry],
        bundle: true,
        write: false,
        // 使用扫描插件，在 esbuild 构建过程中收集依赖
        plugins: [scanPlugin(deps)],
    });
    console.log(
        `${green("需要预构建的依赖")}:\n${[...deps]
            .map(green)
            .map((item) => `  ${item}`)
            .join("\n")}`
    );
    // 3. 预构建依赖
    // 根据上一步扫描出的依赖结果，进行多入口构建
    await build({
        entryPoints: [...deps],
        write: true,
        bundle: true,
        format: "esm",
        splitting: true,
        outdir: path.resolve(root, PRE_BUNDLE_DIR),// 构建到 node_modules
        plugins: [preBundlePlugin(deps)],
    });
}
