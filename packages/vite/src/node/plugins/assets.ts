// 静态资源请求处理插件
// 将相关的资源 import 的 改为 export 导出
import { Plugins } from "../plugins";
import { cleanUrl, removeImportQuery } from "../utils";

export function assetPlugin(): Plugins {
    return {
        name: "be-m-vite:asset",
        async load(id) {
            const cleanedId = removeImportQuery(cleanUrl(id));
            // 这里仅处理 svg
            // import svg 转化为 svg 导出代码
            if (cleanedId.endsWith(".svg")) {
                return {
                    // 包装成一个 JS 模块
                    code: `export default "${cleanedId}"`,
                };
            }
        },
    };
}
