import Vue from "vue";
import { cloud, cloudInitError } from "./index";

/** 两张表：云端牌局存档、云端剧本。RLS 只放行本人的行，前端不传 owner_id */
const SAVES = "botc_saves";
const SCRIPTS = "botc_scripts";

/**
 * 云同步的共享状态。用 Vue.observable 而不是 Vuex：
 * 它只服务「云同步」面板和菜单上的一个小标识，塞进主 store 反而会跟整局存档混在一起。
 */
export const cloudState = Vue.observable({
  /** 是否已经跑过一次初始化（恢复登录态、处理登录回跳） */
  initialized: false,
  /** 本机环境能不能用云服务（缺 WebCrypto / 存储被禁时不行） */
  supported: !cloudInitError,
  /** 请求进行中：面板上的按钮统一置灰，避免连点重复写 */
  busy: false,
  /** 当前登录用户；null = 未登录 */
  user: null,
  error: "",
  /** 最近一次操作的结果提示（成功文案） */
  note: "",
  saves: [],
  scripts: []
});

function patch(next) {
  Object.assign(cloudState, next);
}

/**
 * 把 SDK / PostgreSQL 的错误翻成人话。
 * 只取错误码和固定文案，绝不把原始对象（可能带 token）丢进界面或日志。
 */
export function friendlyError(error) {
  if (!error) return "操作失败，请重试。";
  const kind = error.kind || error.code;
  if (kind === "network") return "网络没连上，检查网络后再试。";
  if (kind === "backend-unavailable") return "云服务暂时不可用，稍后再试。";
  if (kind === "unauthenticated" || kind === "invalid_grant") {
    return "登录已过期，请重新登录。";
  }
  if (kind === "42501") return "没有权限操作这条数据（它不属于当前账号）。";
  if (kind === "42P01") return "云端数据表不存在，请先在云服务里建表。";
  if (kind === "23505") return "已经有同名的记录了。";
  if (kind === "cancelled") return "已取消登录。";
  if (kind === "PGRST116") return "没有找到这条记录，可能已被删除。";
  const message = (error.message || "").toString();
  if (/origin|publishable/i.test(message)) {
    return "当前网址不在应用允许的来源里，请在正式发布地址打开。";
  }
  if (/oauthRelayBaseUrl/.test(message)) {
    return "登录通道初始化不完整（缺少中转地址），请刷新后重试。";
  }
  return message || "操作失败，请重试。";
}

/** 统一拆 { data, error }：有 error 就抛，调用方只需要 catch */
async function unwrap(query) {
  const { data, error } = await query;
  if (error) {
    const wrapped = new Error(friendlyError(error));
    wrapped.kind = error.kind;
    wrapped.code = error.code;
    throw wrapped;
  }
  return data;
}

function applyUser(session) {
  const user = (session && session.user) || null;
  patch({ user });
  if (!user) patch({ saves: [], scripts: [] });
}

/**
 * 处理登录回跳：地址栏带 code/state/provider 时换成会话，然后把这三个参数删掉。
 * sharecode 之类的应用参数必须保留 —— 清 URL 时只删这三个。
 */
async function finishRedirect() {
  const url = new URL(window.location.href);
  const hasCallback =
    url.searchParams.has("code") || url.searchParams.has("error");
  if (!hasCallback) return false;
  const provider = url.searchParams.get("provider");
  // 不是登录回跳（例如别的服务回调带了自己的参数），交给正常启动流程
  if (provider !== "workbuddy" && provider !== "wechat") return false;
  const handler =
    provider === "workbuddy"
      ? cloud.auth.handleWorkBuddyCallback
      : cloud.auth.handleWechatWebCallback;
  if (typeof handler !== "function") {
    patch({ error: "当前 SDK 版本不支持这种登录方式，请刷新页面重试。" });
    return false;
  }
  const { data, error } = await handler.call(cloud.auth);
  if (error) {
    patch({ error: friendlyError(error) });
    return false;
  }
  for (const key of ["code", "state", "provider"]) {
    url.searchParams.delete(key);
  }
  window.history.replaceState(
    null,
    "",
    url.pathname + url.search + url.hash
  );
  if (data) applyUser(data);
  return true;
}

/**
 * 启动时调用一次：处理登录回跳、恢复已有会话、订阅登录状态变化。
 * 未登录完全正常 —— 线下魔典本来就不需要账号，云同步只是可选的加值。
 */
export async function initCloud() {
  if (cloudState.initialized) return cloudState;
  patch({ initialized: true });
  if (!cloud) {
    patch({ error: cloudInitError });
    return cloudState;
  }
  try {
    await finishRedirect();
    const { data } = await cloud.auth.getSession();
    applyUser(data);
    if (typeof cloud.auth.onAuthStateChange === "function") {
      cloud.auth.onAuthStateChange((event, session) => {
        applyUser(session);
        if (event === "SIGNED_OUT") patch({ note: "", error: "" });
      });
    }
  } catch (error) {
    patch({ error: friendlyError(error) });
  }
  return cloudState;
}

/** 使用 WorkBuddy 账号登录：拿授权地址后在同一标签页跳转（PKCE 凭据存在当前标签页） */
export async function signInCloud() {
  if (!cloud) {
    patch({ error: cloudInitError || "云服务不可用。" });
    return;
  }
  patch({ busy: true, error: "", note: "" });
  try {
    const back = new URL(window.location.href);
    // 回调必须回到站点根路径，子路径在静态托管上会 404；应用自己的参数要一起带上
    back.pathname = "/";
    for (const key of ["code", "state", "provider"]) back.searchParams.delete(key);
    const { data, error } = await cloud.auth.signInWithOAuth({
      provider: "workbuddy",
      redirectTo: back.toString()
    });
    if (error) throw error;
    if (!data || !data.url) throw new Error("没有拿到授权地址，请重试。");
    window.location.assign(data.url);
  } catch (error) {
    patch({ busy: false, error: friendlyError(error) });
  }
}

export async function signOutCloud() {
  if (!cloud) return;
  patch({ busy: true, error: "", note: "" });
  try {
    await cloud.auth.signOut();
    applyUser(null);
    patch({ note: "已退出登录，本机牌局不受影响。" });
  } catch (error) {
    patch({ error: friendlyError(error) });
  } finally {
    patch({ busy: false });
  }
}

/* ------------------------------ 牌局存档 ------------------------------ */

export async function listSaves() {
  const rows = await unwrap(
    cloud.database
      .from(SAVES)
      .select("id, title, script_name, player_count, night, is_night, created_at")
      .order("created_at", { ascending: false })
      .limit(30)
  );
  return Array.isArray(rows) ? rows : [];
}

/** 列表只取元信息，牌局本体（payload）在恢复时才按 id 取，避免一次拉几十份座位快照 */
export async function loadSave(id) {
  return unwrap(
    cloud.database.from(SAVES).select("*").eq("id", id).maybeSingle()
  );
}

export async function saveGame(row) {
  if (!cloudState.user) throw new Error("请先登录再存到云端。");
  const created = await unwrap(
    cloud.database
      .from(SAVES)
      .insert({
        title: String(row.title || "未命名牌局").slice(0, 120),
        script_name: row.scriptName ? String(row.scriptName).slice(0, 120) : null,
        player_count: Number(row.playerCount) || null,
        night: Number(row.night) || null,
        is_night: !!row.isNight,
        payload: row.payload,
        // 昵称只是展示快照，没有就留空；权限永远只看 owner_id
        owner_name: (cloudState.user && cloudState.user.name) || null
      })
      .select("id, title, created_at")
  );
  return Array.isArray(created) ? created[0] : created;
}

export async function deleteSave(id) {
  const removed = await unwrap(
    cloud.database.from(SAVES).delete().eq("id", id).select("id")
  );
  if (!Array.isArray(removed) || removed.length === 0) {
    throw new Error("没有删掉：这条存档不存在，或者不属于当前账号。");
  }
  return true;
}

/* ------------------------------- 剧本 -------------------------------- */

export async function listScripts() {
  const rows = await unwrap(
    cloud.database
      .from(SCRIPTS)
      .select("id, name, author, role_count, created_at")
      .order("created_at", { ascending: false })
      .limit(30)
  );
  return Array.isArray(rows) ? rows : [];
}

export async function loadScript(id) {
  return unwrap(
    cloud.database.from(SCRIPTS).select("*").eq("id", id).maybeSingle()
  );
}

export async function saveScript(row) {
  if (!cloudState.user) throw new Error("请先登录再存到云端。");
  const created = await unwrap(
    cloud.database
      .from(SCRIPTS)
      .insert({
        name: String(row.name || "未命名剧本").slice(0, 120),
        author: row.author ? String(row.author).slice(0, 120) : null,
        role_count: Number(row.roleCount) || null,
        payload: row.payload,
        owner_name: (cloudState.user && cloudState.user.name) || null
      })
      .select("id, name, created_at")
  );
  return Array.isArray(created) ? created[0] : created;
}

export async function deleteScript(id) {
  const removed = await unwrap(
    cloud.database.from(SCRIPTS).delete().eq("id", id).select("id")
  );
  if (!Array.isArray(removed) || removed.length === 0) {
    throw new Error("没有删掉：这份剧本不存在，或者不属于当前账号。");
  }
  return true;
}

/** 拉一次云端列表（存档 + 剧本） */
export async function refreshCloud() {
  if (!cloud || !cloudState.user) return;
  patch({ busy: true, error: "" });
  try {
    const [saves, scripts] = await Promise.all([listSaves(), listScripts()]);
    patch({ saves, scripts });
  } catch (error) {
    patch({ error: friendlyError(error) });
  } finally {
    patch({ busy: false });
  }
}

/** 面板里的一次性操作：统一管 busy / error，成功时给一句结果 */
export async function runAction(text, fn) {
  patch({ busy: true, error: "", note: "" });
  try {
    const result = await fn();
    patch({ note: text });
    return result;
  } catch (error) {
    patch({ error: friendlyError(error) });
    return null;
  } finally {
    patch({ busy: false });
  }
}
