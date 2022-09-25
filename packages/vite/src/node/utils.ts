import { JS_TYPES_RE,HASH_RE,QEURY_RE} from './constants'
import path from 'path'
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

export const cleanUrl = (url: string): string =>
    url.replace(HASH_RE, "").replace(QEURY_RE, "");
