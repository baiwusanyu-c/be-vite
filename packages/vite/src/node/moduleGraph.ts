import { PartialResolvedId, TransformResult } from "rollup";
import { cleanUrl } from "./utils";

// 模块图节点对象
export class ModuleNode {
    // 资源访问 url
    url: string;
    // 资源绝对路径
    id: string | null = null; // 模块 id
    importers = new Set<ModuleNode>(); // 该模块的引用方集合（那些依赖了该模块）
    importedModules = new Set<ModuleNode>(); // 该模块所依赖的模块集合（该模块依赖了那些）
    transformResult: TransformResult | null = null; // 经过 transform 钩子后的编译结果
    lastHMRTimestamp = 0; //   上一次热更新时间戳
    constructor(url: string) {
        this.url = url;
    }
}
// 模块图对象
export class ModuleGraph {
    // 资源 url 到 模块图节点（ModuleNode ）的映射表
    urlToModuleMap = new Map<string, ModuleNode>();
    // 资源绝对路径到 模块图节点（ModuleNode ） 的映射表
    idToModuleMap = new Map<string, ModuleNode>();

    constructor(
        private resolveId: (url: string) => Promise<PartialResolvedId | null>
    ) {}
    // 根据模块 id 获得模块图节点
    getModuleById(id: string): ModuleNode | undefined {
        return this.idToModuleMap.get(id);
    }
    // 根据请求 url 获得模块图节点（将在 transform 中间件中用于缓存获取）
    async getModuleByUrl(rawUrl: string): Promise<ModuleNode | undefined> {
        const { url } = await this._resolve(rawUrl);
        return this.urlToModuleMap.get(url);
    }
    // 创建模块图节点到模块图
    // 根据原始 rawUrl 获取或创建新的模块图节点 并返回
    // 将在 transform 中间件中用于初始化创建模块图节点
    async ensureEntryFromUrl(rawUrl: string): Promise<ModuleNode> {
        const { url, resolvedId } = await this._resolve(rawUrl);
        // 首先检查缓存
        if (this.urlToModuleMap.has(url)) {
            return this.urlToModuleMap.get(url) as ModuleNode;
        }
        // 若无缓存，更新 urlToModuleMap 和 idToModuleMap
        // 更新
        const mod = new ModuleNode(url);
        mod.id = resolvedId;
        this.urlToModuleMap.set(url, mod);
        this.idToModuleMap.set(resolvedId, mod);
        return mod;
    }
    // 更新模块图信息
    async updateModuleInfo(
        mod: ModuleNode,
        importedModules: Set<string | ModuleNode>
    ) {
        // 获取该模块旧的模块依赖集合
        const prevImports = mod.importedModules;
        // 遍历该模块新的模块依赖集合集合，
        for (const curImports of importedModules) {
            // 创建/获取对应的依赖模块的模块图节点
            const dep =
                typeof curImports === "string"
                    ? await this.ensureEntryFromUrl(cleanUrl(curImports))
                    : curImports;
            if (dep) {
                // 将依赖模块的模块图节点添加到当前模块的依赖集合中
                // 即 mod 依赖 dep
                mod.importedModules.add(dep);
                // 将当前模块的模块图节点添加到依赖模块的引用集合中
                // 即 dep 被 mode 引用
                dep.importers.add(mod);
            }
        }
        // 遍历该模块旧的的模块依赖集合集合， 清除已经不再被引用的依赖
        for (const prevImport of prevImports) {
            if (!importedModules.has(prevImport.url)) {
                prevImport.importers.delete(mod);
            }
        }
    }

    // HMR 触发时会执行这个方法
    invalidateModule(file: string) {
        const mod = this.idToModuleMap.get(file);
        if (mod) {
            // 更新时间戳
            mod.lastHMRTimestamp = Date.now();
            mod.transformResult = null;
            mod.importers.forEach((importer) => {
                this.invalidateModule(importer.id!);
            });
        }
    }

    // 根据 url 从 rollup 获取对应模块 id
    private async _resolve(
        url: string
    ): Promise<{ url: string; resolvedId: string }> {
        const resolved = await this.resolveId(url);
        const resolvedId = resolved?.id || url;
        return { url, resolvedId };
    }
}
