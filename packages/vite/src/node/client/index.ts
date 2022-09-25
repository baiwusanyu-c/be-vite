// hmr 客户端
// hmr 客户端指的是我们向浏览器中注入的一段 JS 脚本（也即是本ts本身，会在clientInject.ts中被注入到客户端）
// 这段脚本中会做如下的事情:
// 创建 WebSocket 客户端，用于和服务端通信
// 在收到服务端的更新信息后，通过动态 import 拉取最新的模块内容，执行 accept 更新回调
// 暴露 HMR 的一些工具函数，比如 import.meta.hot 对象的实现

interface Update {
    type: "js-update" | "css-update";
    path: string;
    acceptedPath: string;
    timestamp: number;
}

console.log("[be-vite] connecting...");

// 1. 创建客户端 WebSocket 实例
// 其中的 __HMR_PORT__ 之后会被 no-bundle 服务编译成具体的端口号
const socket = new WebSocket(`ws://localhost:__HMR_PORT__`, "vite-hmr");

// 2. 接收服务端的更新信息
socket.addEventListener("message", async ({ data }) => {
    handleMessage(JSON.parse(data)).catch(console.error);
});

// 3. 根据不同的更新类型进行更新
async function handleMessage(payload: any) {
    switch (payload.type) {
        case "connected":
            console.log(`[be-vite] connected.`);
            // 心跳检测
            setInterval(() => socket.send("ping"), 1000);
            break;

        case "update":
            // 进行具体的模块更新
            payload.updates.forEach((update: Update) => {
                if (update.type === "js-update") {
                    console.log('🌲')
                    fetchUpdate(update)
                }
            });
            break;
    }
}


interface HotModule {
    id: string;
    callbacks: HotCallback[];
}

interface HotCallback {
    deps: string[];
    fn: (modules: object[]) => void;
}

// HMR 模块表
const hotModulesMap = new Map<string, HotModule>();
// 不在生效的模块表
const pruneMap = new Map<string, (data: any) => void | Promise<void>>();
// 创建热更新上下文 import.meta.hot 实现,import.meta.hot 会在 react-hmr 插件中结合 react-refresh一步使用
export const createHotContext = (ownerPath: string) => {
    const mod = hotModulesMap.get(ownerPath);
    if (mod) {
        mod.callbacks = [];
    }

    function acceptDeps(deps: string[], callback: any) {
        const mod: HotModule = hotModulesMap.get(ownerPath) || {
            id: ownerPath,
            callbacks: [],
        };
        // callbacks 属性存放 accept 的依赖、依赖改动后对应的回调逻辑
        mod.callbacks.push({
            deps,
            fn: callback,
        });
        hotModulesMap.set(ownerPath, mod);
    }

    return {
        accept(deps: any, callback?: any) {
            // 这里仅考虑接受自身模块更新的情况
            // import.meta.hot.accept()
            if (typeof deps === "function" || !deps) {
                // @ts-ignore
                acceptDeps([ownerPath], ([mod]) => deps && deps(mod));
            }
        },
        // 模块不再生效的回调
        // import.meta.hot.prune(() => {})
        prune(cb: (data: any) => void) {
            pruneMap.set(ownerPath, cb);
        },
    };
};

// 模块更新请求实现，即客户端接受到服务器的更新消息，进行更新派发
async function fetchUpdate({ path, timestamp }: Update) {
    const mod = hotModulesMap.get(path);
    console.log('mod',mod)
    if (!mod) return;

    const moduleMap = new Map();
    const modulesToUpdate = new Set<string>();

    modulesToUpdate.add(path);

    await Promise.all(
        Array.from(modulesToUpdate).map(async (dep) => {
            const [path, query] = dep.split(`?`);
            // 通过动态 import 拉取最新模块
            try {
                const newMod = await import(
                path + `?t=${timestamp}${query ? `&${query}` : ""}`
                    );
                moduleMap.set(dep, newMod);
            } catch (e) {}
        })
    );

    return () => {
        // 拉取最新模块后执行更新回调
        for (const { deps, fn } of mod.callbacks) {
            fn(deps.map((dep: any) => moduleMap.get(dep)));
        }
        console.log(`[be-vite] hot updated: ${path}`);
    };
}

// css 热更新处理
const sheetsMap = new Map();
export function updateStyle(id: string, content: string) {
    let style = sheetsMap.get(id);
    if (!style) {
        // 添加 style 标签
        style = document.createElement("style");
        style.setAttribute("type", "text/css");
        style.innerHTML = content;
        document.head.appendChild(style);
    } else {
        // 更新 style 标签内容
        style.innerHTML = content;
    }
    sheetsMap.set(id, style);
}

export function removeStyle(id: string): void {
    const style = sheetsMap.get(id);
    if (style) {
        document.head.removeChild(style);
    }
    sheetsMap.delete(id);
}
