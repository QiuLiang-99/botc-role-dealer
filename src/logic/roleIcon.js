/**
 * 角色图标地址：一处收敛「这张牌该用哪张图」。
 *
 * 项目只支持自定义剧本，图标全部走歌石官方图床（和剧本 json 里
 * 的 image 字段同一个源），本地不再内置任何角色图标：
 *
 *   1. 剧本自带图片地址（role.image，指向图床或任意外部图床）
 *   2. 阵营占位图（imageAlt = good / evil / outsider / minion /
 *      custom / fabled / bootlegger，store 在角色缺图时按 team 塞的）
 *      —— 图床没有的（loric / maximal / traveler）退到 custom 问号图
 *   3. 都没有就返回空串，组件自己显示文字占位
 */
export const ICON_CDN =
  "https://oss.gstonegames.com/data_file/clocktower/web/icons/";

/** 图床上确实存在的占位图 */
const CDN_ALTS = ["good", "evil", "outsider", "minion", "custom", "fabled", "bootlegger"];

/** 图床没有的占位图统一退到问号图 */
const FALLBACK_TO_CUSTOM = ["loric", "maximal", "traveler"];

/**
 * @param {Object} role  角色对象
 * @param {Object} [opts] { allowRemote:Boolean }
 *        allowRemote=false（设置里关掉「用插画」）就不返回任何图片地址，
 *        组件退回纯文字占位。
 */
export function roleIconUrl(role, opts = {}) {
  const r = role || {};
  if (opts.allowRemote === false) return "";
  if (r.image) return r.image;
  const alt = String(r.imageAlt || "");
  if (CDN_ALTS.indexOf(alt) >= 0) return ICON_CDN + alt + ".png";
  if (FALLBACK_TO_CUSTOM.indexOf(alt) >= 0) return ICON_CDN + "custom.png";
  return "";
}
