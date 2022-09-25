import { JS_TYPES_RE,HASH_RE,QEURY_RE,CLIENT_PUBLIC_PATH} from './constants'
import path from 'path'
const INTERNAL_LIST = [CLIENT_PUBLIC_PATH, "/@react-refresh"];
// 判断浏览器请求是否是 js 相关资源请求
export const isJSRequest = (id: string): boolean => {
    id = cleanUrl(id);
    if (JS_TYPES_RE.test(id)) {
        return true;
    }
    if (!path.extname(id) && !id.endsWith("/")) {
        return true;
    }
    return false;
};
// 判断浏览器请求是否是 css 相关资源请求
export const isCSSRequest = (id: string): boolean =>
    cleanUrl(id).endsWith(".css");

// 判断浏览器请求是否是 svg 等相关静态资源请求
export function isImportRequest(url: string): boolean {
    return url.endsWith("?import");
}

export const cleanUrl = (url: string): string =>
    url.replace(HASH_RE, "").replace(QEURY_RE, "");

export function removeImportQuery(url: string): string {
    return url.replace(/\?import$/, "");
}

export function getShortName(file: string, root: string) {
    return file.startsWith(root + "/") ? path.posix.relative(root, file) : file;
}
// 是否是 vite 内部请求
export function isInternalRequest(url: string): boolean {
    return INTERNAL_LIST.includes(url);
}
