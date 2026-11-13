const NEWPLAYER = {
  name: "",
  id: "",
  image: "",
  role: {},
  isAllowRole: true,
  isWraith: false,
  isUsingWraith: false,
  reminders: [],
  stReminders: [],
  isVoteless: false,
  isSecretVoteless: false,
  isDead: false,
  // 死因："" 未死 / "exec" 处决 / "other" 能力或夜晚
  deathBy: "",
  votes: 1,
  pronouns: "",
  newMessages: 0,
  chatGroup: "",
  isTalking: false,
  // 说书人笔记（只给说书人看，不参与任何结算）
  note: "",
  // 某条夜序是否已处理：键是 "f1"（首夜）/ "o2"（第 2 夜），按夜分开记
  nightDone: {}
};

const state = () => ({
  players: [],
  fabled: [],
  bluffs: [],
  firstNightOrder: [],
  otherNightOrder: []
});

/**
 * 一个空座位。role / reminders / stReminders / nightDone 必须各座位一份新对象，
 * 展开只是浅拷贝，直接共用同一个引用会让两个座位互相串数据。
 * seq 只用来拼 id，保证 Vue keyed 渲染拿到的是唯一 key。
 */
const emptySeat = (index, seq) => ({
  ...NEWPLAYER,
  role: {},
  reminders: [],
  stReminders: [],
  nightDone: {},
  id: "seat-" + seq,
  name: index + 1 + "号",
  image: ""
});

/** 现有座位里已经用过的最大序号，接着往后排，避免 id 撞车（缩了再加就会撞） */
const nextSeq = players => {
  let max = 0;
  players.forEach(player => {
    const match = /^seat-(\d+)$/.exec(String((player && player.id) || ""));
    if (match) max = Math.max(max, Number(match[1]));
  });
  return max + 1;
};

/**
 * 照源码 players/add 的语义：只往末尾追加一个空座位，其余座位原样不动。
 * 源码里「增减座位」从来不碰已有玩家的角色和标记（改人数只是加/减 li），
 * 所以这里也不再像以前那样整桌重建。
 */
const appendSeats = (players, target) => {
  const list = players.slice();
  let seq = nextSeq(list);
  while (list.length < target) {
    list.push(emptySeat(list.length, seq));
    seq += 1;
  }
  return list;
};

const getters = {
  alive({ players }) {
    return players.filter(player => !player.isDead).length;
  },
  nonTravelers({ players }) {
    const nonTravelers = players.filter(
      player => player.role.team !== "traveler"
    );
    return Math.min(nonTravelers.length, 15);
  }
};

const mutations = {
  set(state, players) {
    state.players = players;
  },
  /**
   * 线下分发器：在场上摆好 N 个座位（空座位）
   */
  initSeats(state, count) {
    state.players = Array.from({ length: count }, (_, index) =>
      emptySeat(index, index + 1)
    );
  },
  /** 末尾加一个空座位（源码 Menu.vue 的「添加座位」） */
  addSeat(state, cap) {
    const limit = Number(cap) || 15;
    if (state.players.length >= limit) return;
    state.players = appendSeats(state.players, state.players.length + 1);
  },
  /**
   * 改人数：只增删末尾座位，已有座位连角色、标记、死亡状态一起留着。
   * 加人往末尾补空位；减人从末尾砍——座位号是圆桌上的位置，不能抽中间的，
   * 否则后面所有人都会往前挪一格。
   */
  resizeSeats(state, count) {
    const target = Math.max(1, Number(count) || 0);
    if (target === state.players.length) return;
    if (target > state.players.length) {
      state.players = appendSeats(state.players, target);
      return;
    }
    state.players = state.players.slice(0, target);
  },
  /** 清空标记：只清提示标记，角色 / 死亡 / 名字 / 笔记都不动 */
  clearMarks(state) {
    state.players.forEach(player => {
      player.reminders = [];
      player.stReminders = [];
    });
  },
  update(state, { player, property, value }) {
    const index = state.players.indexOf(player);
    if (index >= 0) {
      state.players[index][property] = value;
    }
  },
  /** 恶魔伪装：三个格子存角色 id，换设备/刷新时按 id 还原 */
  setBluffs(state, list) {
    state.bluffs = Array.isArray(list) ? list.slice(0, 3) : [];
  },
  /** 本局添加的传奇 / 奇遇角色（不占座位） */
  setFabled(state, list) {
    state.fabled = Array.isArray(list) ? list.slice() : [];
  },
  /** 整座还原：给「撤销」用，一次写回一个座位的全部可变字段 */
  restoreSeat(state, { index, seat }) {
    const player = state.players[index];
    if (!player || !seat) return;
    if (typeof seat.n === "string") player.name = seat.n;
    player.role = seat.role || {};
    player.isDead = !!seat.d;
    player.deathBy = seat.db || "";
    player.isVoteless = !!seat.v;
    player.note = seat.note || "";
    player.reminders = Array.isArray(seat.r) ? seat.r : [];
    player.nightDone = seat.nd || {};
  },
  /**
   * 换位：两个座位连人带牌整体交换。
   * 必须换一个新数组，Vue 2 对「按下标赋值」不响应。
   */
  swap(state, [a, b]) {
    if (a === b) return;
    const list = state.players.slice();
    if (!list[a] || !list[b]) return;
    const tmp = list[a];
    list[a] = list[b];
    list[b] = tmp;
    state.players = list;
  },
  /* 移动玩家（源码 players/move）：把 from 抽出来插到 to，中间的人依次挪一格。
     例：把 3 号移到 6 号 → 原 4/5/6 号变成 3/4/5 号。 */
  move(state, [from, to]) {
    if (from === to) return;
    const list = state.players.slice();
    if (!list[from] || !list[to]) return;
    const [p] = list.splice(from, 1);
    list.splice(to, 0, p);
    state.players = list;
  },
  // 线下模式为单机使用，不需要把状态回传给自己所在的联机座位
  selfUpdate() {}
};

export default {
  namespaced: true,
  state,
  getters,
  mutations
};
