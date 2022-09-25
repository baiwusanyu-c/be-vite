import { LoadResult, PartialResolvedId, SourceDescription } from "rollup";
import { ServerContext } from "./server";
import {resolvePlugin} from "./plugins/resolve";
import {esbuildTransformPlugin} from "./plugins/esbuild";
import {importAnalysisPlugin} from "./plugins/importAnalysis";
import {cssPlugin} from "./plugins/css";

export type ServerHook = (
    server: ServerContext
) => (() => void) | void | Promise<(() => void) | void>;

// 定义 vite 插件类型
// 只实现以下这几个钩子
export interface Plugins {
    name: string;
    configureServer?: ServerHook;
    resolveId?: (
        id: string,
        importer?: string
    ) => Promise<PartialResolvedId | null> | PartialResolvedId | null;
    load?: (id: string) => Promise<LoadResult | null> | LoadResult | null;
    transform?: (
        code: string,
        id: string
    ) => Promise<SourceDescription | null> | SourceDescription | null;
    transformIndexHtml?: (raw: string) => Promise<string> | string;
}

export function resolvePlugins(): Plugins[] {
    // 下一部分会逐个补充插件逻辑
    return [resolvePlugin(), esbuildTransformPlugin(), importAnalysisPlugin(),cssPlugin()];
}
