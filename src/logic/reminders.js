/**
 * 提示标记（token）的唯一数据来源。
 *
 * 不打表、不内置角色清单：全部从剧本 JSON 的 `reminders` / `remindersGlobal`
 * 读出来。读取方式与 townsquare 的 ReminderModal 一致：
 *
 *   1. 在场角色的 `reminders`            → 可选（这是最常用的：占卜师的「干扰项」）
 *   2. 任意角色的 `remindersGlobal`      → 恒可选（「限一次」这类本局唯一标记）
 *   3. 面板底部的「自定义」              → 不在剧本里的临时标记
 *
 * 原来还内置过一组「通用」（中毒 / 醉酒 / 保护…），这些在纸质魔典里是
 * 由角色能力产生的，硬列出来反而让人以为每个座位都要先挂一个，已移除。
 */

/**
 * 通用标记：不属于任何角色，每个座位都可能用到。
 *
 * 照抄源码 ReminderModal 里 `availableReminders` 末尾固定 push 的两项：
 *   reminders.push({ role: "good", name: "善良" });
 *   reminders.push({ role: "evil", name: "邪恶" });
 * 源码里它们没有 image / imageAlt，图标靠 `require('../../assets/icons/' + role + '.png')`
 * 拼出来（good.png / evil.png）。我们的图标是 Vite 资源，没法在纯逻辑里 require，
 * 所以这两项只带 imageAlt，真正的 url 由调用方通过 icons 参数注入。
 */
export const COMMON_REMINDERS = [
  { role: "good", name: "善良", imageAlt: "good" },
  { role: "evil", name: "邪恶", imageAlt: "evil" }
];

/** 一个标记的唯一键：同角色同名算同一个，重复点就是移除 */
export const reminderKey = item =>
  `${item && item.role ? item.role : "common"}::${item && item.name ? item.name : ""}`;

/** 把角色定义里的一个名字包成可渲染的标记对象 */
export const toReminder = (role, name) => ({
  role: String((role && role.id) || "common"),
  // 面板里「死亡」这类标记会有好几个角色各提供一张，
  // 光看名字分不清点的是谁带来的，所以把来源角色名一起带上
  roleName: (role && role.name) || "",
  name: String(name || "").trim(),
  image: (role && role.image) || "",
  imageAlt: (role && role.imageAlt) || "",
  team: (role && role.team) || ""
});

/** 角色是否值得为它列标记（有名字就行） */
const reminderNamesOf = role => (Array.isArray(role && role.reminders) ? role.reminders : []);

const globalNamesOf = role =>
  Array.isArray(role && role.remindersGlobal) ? role.remindersGlobal : [];

/**
 * 这个标记是不是「某个角色自己带来的、且不是全局标记」。
 * 死亡 / 换角色时只清这一类：占卜师的「干扰项」跟着人走，
 * 但「是酒鬼」这种 remindersGlobal 是身份信息，不能清。
 */
export function isRoleLocalReminder(item, role) {
  if (!item || !role || !role.id) return false;
  if (String(item.role || "") !== String(role.id)) return false;
  return !globalNamesOf(role).includes(item.name);
}

/** 把标记列表拆成「留下的」和「该角色带来的非全局标记」 */
export function splitRoleReminders(list, role) {
  const kept = [];
  const removed = [];
  (Array.isArray(list) ? list : []).forEach(item => {
    if (isRoleLocalReminder(item, role)) removed.push(item);
    else kept.push(item);
  });
  return { kept, removed };
}

/**
 * 把「某个角色带来的非全局标记」从**全场每个座位**上摘下来。
 *
 * 这一步必须扫全场，不能只看这个角色自己的座位：纸质魔典里很多标记是
 * 放在别人身上的 —— 僧侣的「保护」放在被保护的人身上、占卜师的「干扰项」
 * 放在被查验的人身上。角色死了 / 被换掉之后，这些牌还留在别人脚下就是错的。
 *
 * @param {Array} players 全场座位
 * @param {Object} role 要清理的角色
 * @param {Function} [commit] 传了就直接写 store（vuex commit）
 * @returns {Array<{index:Number,name:String,items:Array}>} 每个座位被摘掉的标记
 */
export function sweepRoleReminders(players, role, commit) {
  const groups = [];
  (Array.isArray(players) ? players : []).forEach((player, index) => {
    if (!player) return;
    const { kept, removed } = splitRoleReminders(player.reminders || [], role);
    if (!removed.length) return;
    groups.push({
      index,
      name: player.name || `${index + 1}号`,
      items: removed
    });
    if (typeof commit === "function") {
      commit("players/update", {
        player,
        property: "reminders",
        value: kept
      });
      commit("players/update", {
        player,
        property: "stReminders",
        value: kept.filter(item => item.role !== "custom")
      });
    }
  });
  return groups;
}

/**
 * 把 sweepRoleReminders 的结果写成一句人话：
 * 别的座位上的标记要带上座位名，否则说书人不知道那张牌原本在哪。
 * @param {Array} groups sweepRoleReminders 的返回值
 * @param {Number} actorIndex 触发这次清理的座位（它的标记不用加座位名）
 */
export function describeRemoved(groups, actorIndex) {
  return (Array.isArray(groups) ? groups : [])
    .map(group =>
      group.items
        .map(item =>
          Number(group.index) === Number(actorIndex)
            ? item.name
            : `${item.name}（${group.name}）`
        )
        .join("、")
    )
    .filter(Boolean)
    .join("、");
}

/**
 * 认知覆盖座位应该自动带的标记。
 * 牌面是「占卜师」、背后其实是「酒鬼」时，角色对象上挂着 role.coverOf = 酒鬼，
 * 真实身份的 remindersGlobal（酒鬼 → 「是酒鬼」）就该直接放进这个座位，
 * 说书人不用自己再去找一遍。
 */
export function identityReminders(role, allRoles) {
  const cover = role && role.coverOf;
  if (!cover || !cover.id) return [];
  let source = null;
  if (allRoles instanceof Map) {
    source = allRoles.get(String(cover.id)) || allRoles.get(cover.id) || null;
  } else if (Array.isArray(allRoles)) {
    source = allRoles.find(item => String(item.id) === String(cover.id)) || null;
  }
  if (!source) return [];
  return globalNamesOf(source).map(name => toReminder(source, name));
}

/**
 * 组装标记分组。
 * @param {Array} players 当前座位（用到 role 与 reminders）
 * @param {String} focusRoleId 当前正在编辑的座位角色 id，会单独成组排最前
 * @param {Array} allRoles 当前剧本的全部角色（store.state.roles）
 *   —— 源码 ReminderModal：remindersGlobal 不看在不在场，全剧本无条件收集
 * @param {Array} bluffs 恶魔伪装三张牌的 id（store.state.players.bluffs）
 *   —— 源码 else if：不在场但被当伪装的角色，也收它的 reminders
 * @param {Array} fabled 场上已入场的传奇角色（store.state.players.fabled）
 *   —— 源码 `players.fabled.forEach`：传奇的 reminders 也收
 * @param {Object} [icons] 通用标记的图标 url，形如 { good: "...", evil: "..." }
 * @returns {Array<{key:String,title:String,hint:String,items:Array}>}
 */
export function buildReminderGroups(players, focusRoleId, allRoles, bluffs, fabled, icons) {
  const seats = Array.isArray(players) ? players : [];
  const onStage = seats
    .map(player => player && player.role)
    .filter(role => role && role.id);

  const seen = new Set();
  const push = (list, item) => {
    if (!item.name) return;
    // 键是「角色 id + 名字」，不是名字。同一枚标记只能出现一次，
    // 但不同角色带的同名标记（教父的「死亡」/ 造谣者的「死亡」）必须各留一张：
    // 源码 ReminderModal 的 :key 也是 `reminder.role + ' ' + reminder.name`，
    // 面板里本来就是一人一张、不平铺去重。
    // 之前按名字去重，第一个带「死亡」的角色（多半是场上的小恶魔）把后面
    // 所有人的「死亡」都顶掉了 —— 表现就是「造谣者的死亡放不到别人身上」。
    const key = reminderKey(item);
    if (seen.has(key)) return;
    seen.add(key);
    list.push(Object.assign({ key }, item));
  };

  const own = [];
  const others = [];
  const global = [];

  const focus = focusRoleId
    ? onStage.find(role => String(role.id) === String(focusRoleId))
    : null;

  if (focus) {
    reminderNamesOf(focus).forEach(name =>
      push(own, toReminder(focus, name))
    );
  }

  onStage.forEach(role => {
    if (focus && String(role.id) === String(focus.id)) return;
    reminderNamesOf(role).forEach(name => push(others, toReminder(role, name)));
  });

  const globalSource =
    Array.isArray(allRoles) && allRoles.length ? allRoles : onStage;

  // 源码 else if (bluffs.some(...))：不在场、但作为「恶魔的伪装身份」的角色，
  // 它的 reminders 也要能挂（说书人得给「伪装成占卜师」的恶魔挂干扰项）
  const onStageIds = new Set(onStage.map(role => String(role.id)));
  (Array.isArray(bluffs) ? bluffs : []).forEach(id => {
    const role = globalSource.find(item => String(item.id) === String(id));
    if (!role || onStageIds.has(String(role.id))) return;
    reminderNamesOf(role).forEach(name => push(others, toReminder(role, name)));
  });

  // 源码：`if (role.remindersGlobal && role.remindersGlobal.length)` 无条件追加，
  // 遍历的是 store.state.roles（当前剧本全集），和角色在不在场无关
  globalSource.forEach(role => {
    globalNamesOf(role).forEach(name => push(global, toReminder(role, name)));
  });

  // 源码 `// add out of script traveler reminders`：
  // 在场上、但不在当前剧本里的角色（中途入场的旅行者 / 换进来的角色），
  // 它的 reminders 同样要能挂 —— 只遍历剧本的话这些角色一个标记都用不了
  const scriptIds = new Set(globalSource.map(role => String(role.id)));
  onStage.forEach(role => {
    if (scriptIds.has(String(role.id))) return;
    const target = focus && String(role.id) === String(focus.id) ? own : others;
    reminderNamesOf(role).forEach(name => push(target, toReminder(role, name)));
    globalNamesOf(role).forEach(name => push(global, toReminder(role, name)));
  });

  // 源码 `// add fabled reminders`：场上已入场的传奇角色
  (Array.isArray(fabled) ? fabled : []).forEach(role => {
    if (!role) return;
    reminderNamesOf(role).forEach(name => push(others, toReminder(role, name)));
    globalNamesOf(role).forEach(name => push(global, toReminder(role, name)));
  });

  // 源码末尾固定追加的「善良 / 邪恶」（还有「自定义」）。
  // 这两张不属于任何角色，任何座位都可能挂，所以不参与上面那套在场判断。
  const common = COMMON_REMINDERS.map(item => {
    const icon = icons && icons[item.imageAlt];
    return Object.assign({ key: reminderKey(item) }, item, icon ? { image: icon } : {});
  });

  const groups = [
    {
      key: "own",
      title: "本角色的标记",
      hint: focus ? `「${focus.name}」能力产生的标记` : "",
      items: own
    },
    {
      key: "others",
      title: "场上其他角色",
      hint: "给其他角色的标记，放在这个座位上",
      items: others
    },
    {
      key: "global",
      title: "全局标记",
      hint: "剧本中出现的角色即使不在场也能使用的标记",
      items: global
    },
    {
      key: "common",
      title: "通用标记",
      hint: "不属于任何角色，随时可以放",
      items: common
    }
  ];

  return groups.filter(group => group.items.length);
}

/**
 * 某个标记是否已经放在这个座位上。
 * 必须「同一个角色 + 同一个名字」才算同一个标记：
 * 教父、造谣者、刺客的标记都叫「死亡」，只按名字比对会把别人的「死亡」
 * 当成自己的，于是面板里一打开就打着勾，点一下就变成「移除」——
 * 表现就是「这个标记按不上去」。老存档里没有 role 字段的标记才退回按名字比。
 */
export function hasReminder(player, item) {
  const list = (player && player.reminders) || [];
  return list.some(exist => {
    if (exist.name !== item.name) return false;
    if (!exist.role || !item.role) return true;
    return String(exist.role) === String(item.role);
  });
}
