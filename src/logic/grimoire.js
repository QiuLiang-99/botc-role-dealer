/**
 * 魔典（Grimoire）的纯逻辑层：夜序、座位、配比、伪装牌。
 *
 * 这里不打表、不硬编码角色：
 *   · 夜序完全读剧本 JSON 的 firstNight / otherNight 编号与
 *     firstNightReminder / otherNightReminder 文本；
 *   · 角色分类读 team；
 *   · 死亡、幽灵票、标记全部读玩家对象自身的字段。
 * 所以自建剧本里只要写了夜序编号，夜序面板就会自动出现该角色。
 */

export const TEAMS = ["townsfolk", "outsider", "minion", "demon", "traveler"];
export const TEAM_CN = {
  townsfolk: "镇民",
  outsider: "外来者",
  minion: "爪牙",
  demon: "恶魔",
  traveler: "旅行者"
};

/**
 * 相克条目在官方剧本 JSON 里的 team 写法有两种：
 * 新版是 `jinx`，老版（本项目内置剧本用的）是 `a jinxed`。
 * 它们不是角色，绝不能出现在换角色列表里。
 */
export const JINX_TEAMS = ["jinx", "a jinxed"];
export const isJinxEntry = role =>
  !!role && JINX_TEAMS.indexOf(String(role.team)) >= 0;

/** 场上的座位（分配了角色才算） */
export const seatedPlayers = players =>
  (players || []).map((player, index) => ({ player, index })).filter(
    item => item.player && item.player.role && item.player.role.id
  );

/**
 * 某个座位「实际」是哪张牌。
 * 认知覆盖（酒鬼 / 提线木偶）的牌面是伪装牌，真实身份在 role.coverOf 里。
 * 夜序、配比、恶魔伪装检查都必须用真实身份，否则夜里会叫错人。
 */
export const realRoleOf = player => {
  const role = (player && player.role) || {};
  return role.coverOf || role;
};

/**
 * 夜间序号（照抄 townsquare 的 players/nightOrder getter）。
 *
 * 关键：角色 json 里的 firstNight / otherNight 只是「排序用的原始值」，
 * 可能是 15、21、57 这种跨度很大的数。真正显示的是「第几个行动」：
 * 把所有在场角色的原始值去重、排序，再取 indexOf 的下标。
 * 数组第 0 位是哨兵 0，所以 indexOf(0) === 0 → 编号为 0 的角色不显示
 * （落难少女这类「其他夜晚不行动」的角色就不会冒出来）。
 *
 * @returns {Map<player, {first:Number, other:Number}>}
 */
export function nightOrderOf(players) {
  const firstNight = [0];
  const otherNight = [0];

  (players || []).forEach(player => {
    const role = realRoleOf(player);
    if (!role || !role.id) return;
    const first = Number(role.firstNight) || 0;
    const other = Number(role.otherNight) || 0;
    if (first > 0 && firstNight.indexOf(first) === -1) firstNight.push(first);
    if (other > 0 && otherNight.indexOf(other) === -1) otherNight.push(other);
  });

  firstNight.sort((a, b) => a - b);
  otherNight.sort((a, b) => a - b);

  const map = new Map();
  (players || []).forEach(player => {
    const role = realRoleOf(player);
    if (!role || !role.id) {
      map.set(player, { first: 0, other: 0 });
      return;
    }
    map.set(player, {
      first: Math.max(firstNight.indexOf(Number(role.firstNight) || 0), 0),
      other: Math.max(otherNight.indexOf(Number(role.otherNight) || 0), 0)
    });
  });
  return map;
}

/** 源码里爪牙信息 / 恶魔信息的固定编号与文案 */
const EVIL_INFO = {
  minioninfo: {
    id: "evil",
    alias: "minioninfo",
    name: "爪牙信息",
    team: "minion",
    raw: 15,
    text:
      "如果爪牙多于一位，让他们互相看清彼此。展示这是恶魔卡片，指向恶魔。"
  },
  demoninfo: {
    id: "evil",
    alias: "demoninfo",
    name: "恶魔信息与伪装身份",
    team: "demon",
    raw: 21,
    text:
      "展示这些是你的爪牙卡片，并指向每个爪牙。展示这些身份不在游戏中卡片，并展示3个不在场的善良身份。"
  }
};

/**
 * 这枚提示标记是不是「死亡」。
 * 名字必须正好是「死亡」：小恶魔 / 涡流 / 卡扎力 / 月之子 挂的那种，
 * 「选择死」「死亡票」之类不算。天亮结算和夜序判定共用这一个定义。
 */
export const isDeathMark = item =>
  !!item && String(item.name || "").trim() === "死亡";

/** 座位上有没有「死亡」标记（有 = 今晚会死，夜序里按已死亡处理） */
export const hasDeathMark = player =>
  !!(player && (player.reminders || []).some(isDeathMark));

/**
 * 夜间顺序表。
 * @param {Array} players 座位
 * @param {Object} opts { firstNight:Boolean, night:Number }
 */
export function buildNightOrder(players, opts = {}) {
  const isFirst = opts.firstNight !== false;
  const night = Math.max(1, Number(opts.night) || 1);
  const key = nightKeyOf({ firstNight: isFirst, night });
  const seated = seatedPlayers(players);
  const rawOf = role => Number(isFirst ? role.firstNight : role.otherNight) || 0;
  const textOf = role =>
    (isFirst ? role.firstNightReminder : role.otherNightReminder) || "";

  // 爪牙信息 / 恶魔信息只在 7 人以上出现（源码 players.length > 6）
  const withInfo = isFirst && seated.length > 6;
  const marks = [0];
  const push = value => {
    if (value > 0 && marks.indexOf(value) === -1) marks.push(value);
  };
  seated.forEach(({ player }) => {
    const role = realRoleOf(player);
    if (role && role.id) push(rawOf(role));
  });
  if (withInfo) {
    push(EVIL_INFO.minioninfo.raw);
    push(EVIL_INFO.demoninfo.raw);
  }
  marks.sort((a, b) => a - b);
  const rank = value => Math.max(marks.indexOf(value), 0);

  const rows = [];

  seated.forEach(({ player, index }) => {
    const role = realRoleOf(player);
    if (!role || !role.id) return;
    const order = rank(rawOf(role));
    // 源码 v-if="nightOrder.get(role).first"：序号为 0 就是不行动，不显示
    if (!order) return;
    const doneMap = player.nightDone || {};
    rows.push({
      key,
      index,
      seat: index + 1,
      player,
      role,
      order,
      text: textOf(role),
      // 身上挂着「死亡」标记的人，当晚就会被判死，所以这一夜不该再被唤醒：
      // 和 isDead 走同一个显示开关（默认藏起来，勾「显示已死亡」才露出来）
      dead: !!player.isDead || hasDeathMark(player),
      done: !!doneMap[key],
      players: [player]
    });
  });

  if (withInfo) {
    Object.keys(EVIL_INFO).forEach(alias => {
      const info = EVIL_INFO[alias];
      const members = seated
        .filter(({ player }) => {
          const role = realRoleOf(player);
          return role && role.team === info.team;
        })
        .map(({ player }) => player);
      rows.push({
        key,
        index: -1,
        seat: null,
        alias,
        id: info.id,
        role: { id: info.id, name: info.name, team: info.team },
        order: rank(info.raw),
        text: info.text,
        dead: false,
        // 爪牙/恶魔信息是「说书人念一遍」，进度记在该阵营第一个人的 nightDone 里
        done: !!(
          members[0] &&
          members[0].nightDone &&
          members[0].nightDone["info" + alias]
        ),
        players: members,
        info: true
      });
    });
  }

  rows.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return (a.seat || 99) - (b.seat || 99);
  });
  return rows;
}

/** 把「这一条已做完」写进玩家对象：按 夜次 分开记，换夜不会串 */
export function nightDoneOf(player, key) {
  return !!(player && player.nightDone && player.nightDone[key]);
}

/** 当前这一夜的进度键："f1" 首夜 / "o2" 第 2 夜 */
export function nightKeyOf(opts = {}) {
  return (opts.firstNight === false ? "o" : "f") + (Number(opts.night) || 1);
}

/**
 * 座位牌上那个夜序数字。
 * 与夜序面板同一份数据：当前夜的行动编号，没编号就是 0（不显示）。
 * 已处理的标记存在 player.nightDone[key] 里，所以两处天然联动。
 */
export function seatNightInfo(player, opts = {}) {
  const role = realRoleOf(player);
  if (!role || !role.id) return { order: 0, key: "", done: false };
  const key = nightKeyOf(opts);
  const order =
    Number(opts.firstNight === false ? role.otherNight : role.firstNight) || 0;
  const reminders =
    (opts.firstNight === false ? role.otherNightReminder : role.firstNightReminder) ||
    "";
  if (!order && !reminders) return { order: 0, key, done: false };
  return {
    order,
    key,
    done: !!(player.nightDone && player.nightDone[key])
  };
}

/**
 * 角色候选列表。
 * @param {Map} roles store 里的角色 Map
 * @param {Object} opts { search, team, hideUsed }
 */
export function pickRoles(roles, opts = {}) {
  const keyword = String(opts.search || "").trim().toLowerCase();
  const team = opts.team || "all";
  const list = Array.from(roles ? roles.values() : []);
  return list
    .filter(role => role && role.id)
    .filter(
      role =>
        role.team !== "traveler" &&
        role.team !== "fabled" &&
        !isJinxEntry(role)
    )
    .filter(role => team === "all" || role.team === team)
    .filter(role => {
      if (!keyword) return true;
      return (
        String(role.name || "").toLowerCase().includes(keyword) ||
        String(role.ability || "").toLowerCase().includes(keyword) ||
        String(role.id || "").toLowerCase().includes(keyword)
      );
    })
    .filter(role => {
      if (!opts.hideUsed) return true;
      return !(opts.usedIds || []).includes(String(role.id));
    })
    .sort((a, b) => {
      const ta = TEAMS.indexOf(a.team);
      const tb = TEAMS.indexOf(b.team);
      if (ta !== tb) return ta - tb;
      return String(a.name || "").localeCompare(String(b.name || ""), "zh");
    });
}

/**
 * 谁在用这张牌（真实身份或牌面）。给角色面板标「已在场」用。
 * @returns {Map<String, Array<Number>>} roleId -> 座位号
 */
export function buildUsage(players) {
  const usage = new Map();
  (players || []).forEach((player, index) => {
    if (!player.role || !player.role.id) return;
    const take = id => {
      const key = String(id);
      if (!usage.has(key)) usage.set(key, []);
      usage.get(key).push(index + 1);
    };
    take(player.role.id);
    if (player.role.coverOf && player.role.coverOf.id) {
      take(player.role.coverOf.id);
    }
  });
  return usage;
}

/**
 * 恶魔伪装最需要的三张牌：不在场的镇民 / 外来者。
 * 顺序按「最像真的」排：镇民在前，外来者在后，同类型按剧本顺序。
 */
export function bluffCandidates(roles, players) {
  const usage = buildUsage(players);
  return Array.from(roles ? roles.values() : [])
    .filter(role => role && role.id)
    .filter(role => role.team === "townsfolk" || role.team === "outsider")
    .filter(role => !usage.has(String(role.id)))
    .sort((a, b) => {
      const ta = a.team === "townsfolk" ? 0 : 1;
      const tb = b.team === "townsfolk" ? 0 : 1;
      if (ta !== tb) return ta - tb;
      return String(a.name || "").localeCompare(String(b.name || ""), "zh");
    });
}

/**
 * 整局快照（给「记录 / 撤销」用）。
 * 只存可序列化的字段，角色用 id + 伪装牌 id 还原，避免角色对象被改坏。
 */
export function snapSeats(players) {
  return (players || []).map(player => ({
    n: player.name || "",
    id: (player.role && player.role.id) || "",
    cover: (player.role && player.role.coverOf) || null,
    d: player.isDead ? 1 : 0,
    v: player.isVoteless ? 1 : 0,
    // 死因："" 不明 / exec 处决 / role:<角色 id> 死于该角色的「死亡」标记 / other 能力或夜晚
    db: player.deathBy || "",
    note: player.note || "",
    r: (player.reminders || []).map(item => ({
      role: item.role,
      name: item.name,
      reversed: item.reversed ? 1 : 0
    })),
    nd: Object.assign({}, player.nightDone || {})
  }));
}

/** 提示标记的显示文案：翻转的标记加一个记号，避免整块重画 */
export const reminderText = item =>
  item && item.reversed ? `↻${item.name || ""}` : (item && item.name) || "";
