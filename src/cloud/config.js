/**
 * 云服务公开配置。
 *
 * 这四个值就是开通云服务时下发的 `publicConfig`，原样带进前端：
 * - `publishableKey` 只标识「这是哪个应用」，本身不带任何权限，服务端还会校验
 *   请求来源必须等于应用的发布域名；
 * - 真正的环境 id 与厂商密钥只存在服务端，前端永远拿不到，也不该有。
 *
 * 所以这个文件可以随构建产物一起发布，但它里面的 endpoint 必须和发布域名一致，
 * 换域名（换应用）就要换成新的 publicConfig，不能凭记忆手写。
 */
export const publicConfig = {
  resourceId: "wbcs_7i9r3l1mAzEHYHVkOB5rqx",
  endpoint: "https://botc-role-dealer.app.workbuddy.host",
  oauthRelayBaseUrl: "https://www.workbuddy.cn/v2/as/genie-baas/oauth",
  publishableKey:
    "wbpk_CVYMZ5q2xTc5DePa2e2CId_ZtI9nJUteKjIggbxQCGlXN7qHw4ku4iB"
};
