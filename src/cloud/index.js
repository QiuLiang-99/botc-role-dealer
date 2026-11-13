import { createWorkBuddyCloud } from "@tencent-ai/workbuddy-cloud-sdk";
import { publicConfig } from "./config";

export { publicConfig };

/**
 * 全应用只初始化这一个客户端，登录、数据库、存储都复用它。
 *
 * 初始化失败（浏览器缺 WebCrypto / sessionStorage 不可写）时不要在模块加载阶段
 * 直接抛错把整个应用炸掉 —— 线下魔典本来就不依赖云服务也能用，
 * 所以这里记下失败原因，由云面板提示「本机环境不支持」，其余功能照常。
 */
let client = null;
let initError = "";

try {
  client = createWorkBuddyCloud({
    endpoint: publicConfig.endpoint,
    oauthRelayBaseUrl: publicConfig.oauthRelayBaseUrl,
    publishableKey: publicConfig.publishableKey
  });
} catch (error) {
  initError =
    (error && error.message) || "云服务客户端初始化失败，请在正式发布地址打开。";
}

export const cloud = client;
export const cloudInitError = initError;
