<template>
  <div class="qw-layer">
    <Modal name="quick" @close="$emit('close')">
      <div class="qw-panel">
        <header class="qw-head">
          <h3>快捷唤醒短语</h3>
          <p>
            按这句话的模板把空位填上，点「展示给玩家」全屏放出来；关掉展示就回到短语列表。
          </p>
        </header>

        <!-- 一句话预览：空位在句子里就是一个个可点的格子 -->
        <div class="qw-line">
          <template v-for="(seg, i) in phrase.seg">
            <span class="qw-text" :key="'t' + i" v-if="!isSlot(seg)">{{ seg }}</span>
            <button
              v-else
              :key="'s' + i"
              class="qw-chip"
              :class="{
                filled: !!picked[slotKey(seg)],
                active: active === slotKey(seg),
                optional: isOptional(seg)
              }"
              :title="isOptional(seg) ? '可留空' : '必填'"
              @click="active = slotKey(seg)"
            >
              <span class="qw-chip-token" v-if="slotType(seg) === 'role'">
                <Token
                  v-if="picked[slotKey(seg)]"
                  :role="picked[slotKey(seg)]"
                  :show-corner="false"
                />
                <font-awesome-icon v-else icon="question" />
              </span>
              <span class="qw-chip-align" v-else-if="slotType(seg) === 'align' && picked[slotKey(seg)]" :class="picked[slotKey(seg)]">
                <img :src="picked[slotKey(seg)] === 'good' ? goodIcon : evilIcon" alt="" />
                {{ ALIGN_LABEL[picked[slotKey(seg)]] }}{{ seg.suffix || "" }}
              </span>
              <span class="qw-chip-num" v-else-if="slotType(seg) === 'num' && picked[slotKey(seg)]">
                {{ picked[slotKey(seg)] }}
              </span>
              <span class="qw-chip-name" v-if="slotType(seg) === 'role'">
                {{ picked[slotKey(seg)] ? picked[slotKey(seg)].name : "点选角色" }}
              </span>
              <span class="qw-chip-name" v-else-if="slotType(seg) === 'seat'">
                {{ picked[slotKey(seg)] ? picked[slotKey(seg)] + "号玩家" : "玩家" }}
              </span>
              <span class="qw-chip-name" v-else-if="!picked[slotKey(seg)]">
                {{ slotLabel(slotType(seg)) }}
              </span>
              <span class="qw-chip-opt" v-if="isOptional(seg)">可选</span>
            </button>
          </template>
        </div>

        <!-- 下面按当前选中的空位类型换不同的选择器 -->
        <div class="qw-picker" v-if="activeDef">
          <!-- 角色 -->
          <template v-if="activeType === 'role'">
            <div class="qw-tools">
              <input class="qw-search" v-model="search" placeholder="搜索角色名或能力" />
              <div class="qw-tabs">
                <button
                  v-for="tab in tabs"
                  :key="tab.key"
                  class="qw-tab"
                  :class="{ on: team === tab.key }"
                  @click="team = tab.key"
                >
                  {{ tab.label }}
                </button>
              </div>
              <button class="qw-tab" :class="{ on: hideUsed }" @click="hideUsed = !hideUsed">
                只看不在场
              </button>
            </div>

            <p class="qw-count">
              共 {{ list.length }} 张牌
              <span class="qw-tip">已在场的牌会标出座位号，需要时也能选</span>
            </p>

            <div class="qw-grid">
              <button
                v-for="role in list"
                :key="role.id"
                class="qw-card"
                :class="{ used: !!usedBy(role), current: isPicked(role) }"
                :title="role.ability || ''"
                @click="pickRole(role)"
              >
                <div class="qw-card-token">
                  <Token :role="role" :show-corner="false" />
                  <span class="qw-used" v-if="usedBy(role)">{{ usedBy(role) }}号</span>
                </div>
                <span class="qw-card-name">{{ role.name }}</span>
                <em class="qw-card-team" :class="role.team">{{ teamLabel(role.team) }}</em>
              </button>
            </div>

            <p class="qw-empty" v-if="!list.length">没有匹配的角色，换个关键词或类型试试。</p>
          </template>

          <!-- 善良 / 邪恶 -->
          <div class="qw-align" v-else-if="activeType === 'align'">
            <button
              class="qw-align-btn good"
              :class="{ on: picked[active] === 'good' }"
              @click="pickAlign('good')"
            >
              <img class="qw-align-thumb" :src="goodIcon" alt="" />
              善良
            </button>
            <button
              class="qw-align-btn evil"
              :class="{ on: picked[active] === 'evil' }"
              @click="pickAlign('evil')"
            >
              <img class="qw-align-thumb" :src="evilIcon" alt="" />
              邪恶
            </button>
          </div>

          <!-- 1–12 名玩家 -->
          <div class="qw-nums" v-else-if="activeType === 'num'">
            <button
              v-for="n in 12"
              :key="'n' + n"
              class="qw-num"
              :class="{ on: picked[active] === n }"
              @click="pickNum(n)"
            >
              {{ n }}
            </button>
          </div>

          <!-- 座位号：1–当前魔典最大座位号 -->
          <div class="qw-nums" v-else-if="activeType === 'seat'">
            <button
              v-for="n in maxSeat"
              :key="'seat' + n"
              class="qw-num"
              :class="{ on: picked[active] === n }"
              @click="pickNum(n)"
            >
              {{ n }}
            </button>
          </div>

          <!-- 可选格子（绿色）：随时可以把这一格清空 -->
          <div class="qw-slot-clear" v-if="activeOptional">
            <button class="qw-clear-btn" @click="clearActive">
              <font-awesome-icon icon="eraser" /> 这一格留空
            </button>
            <span class="qw-clear-tip">绿色边框的格子都可以不填</span>
          </div>
        </div>

        <!-- 没有空位的短语（是否使用你的能力 / 做出你的选择）直接展示 -->
        <p class="qw-plain" v-else>
          这句话没有要填的内容，直接点「展示给玩家」。
        </p>

        <div class="qw-actions">
          <button class="qw-btn ghost" @click="reset" :disabled="!filledCount">
            <font-awesome-icon icon="eraser" /> 清空
          </button>
          <button class="qw-btn" @click="show" :disabled="!ready">
            <font-awesome-icon icon="eye" /> 展示给玩家
          </button>
        </div>
      </div>
    </Modal>

    <!-- 全屏展示：和「给恶魔看」同一个观感，只是内容换成这句话 -->
    <transition name="panel-fade">
      <div class="qw-show" v-if="showing" @click="closeShow">
        <div class="qws-line">
          <template v-for="(seg, i) in phrase.seg">
            <span class="qws-text" :key="'st' + i" v-if="!isSlot(seg)">{{ seg }}</span>
            <span
              class="qws-role"
              :key="'sr' + i"
              v-else-if="slotType(seg) === 'role' && picked[slotKey(seg)]"
            >
              <Token :role="picked[slotKey(seg)]" :show-corner="false" />
              <b>{{ picked[slotKey(seg)].name }}</b>
            </span>
            <span
              class="qws-align"
              :key="'sa' + i"
              v-else-if="slotType(seg) === 'align' && picked[slotKey(seg)]"
              :class="picked[slotKey(seg)]"
            >
              <img :src="picked[slotKey(seg)] === 'good' ? goodIcon : evilIcon" alt="" />
              {{ ALIGN_LABEL[picked[slotKey(seg)]] }}{{ seg.suffix || "" }}
            </span>
            <span
              class="qws-num"
              :key="'sn' + i"
              v-else-if="slotType(seg) === 'num' && picked[slotKey(seg)]"
            >
              {{ picked[slotKey(seg)] }}
            </span>
            <span
              class="qws-seat"
              :key="'ss' + i"
              v-else-if="slotType(seg) === 'seat' && picked[slotKey(seg)]"
            >
              {{ picked[slotKey(seg)] }}号玩家
            </span>
          </template>
        </div>
        <p class="qws-hint">展示完成后，将设备交回说书人 · 点任意处关闭</p>
      </div>
    </transition>
  </div>
</template>

<script>
import Modal from "./Modal";
import Token from "../Token";
import { pickRoles, buildUsage, TEAM_CN } from "../../logic/grimoire";
import {
  isSlot,
  slotType,
  slotKey,
  slotDef,
  slotLabel,
  ALIGN_LABEL
} from "../../logic/phrases";
// 善良/邪恶的拇指图：图床上同名文件是小丑面具、不是拇指，
// 所以这两张界面素材放本地随构建打包
import goodIcon from "../../assets/good.png";
import evilIcon from "../../assets/evil.png";

/** 打开短语时按 slots 里的 default 预填（「选择N名玩家」默认就是 1） */
function defaultPicked(phrase) {
  const picked = {};
  ((phrase && phrase.slots) || []).forEach(slot => {
    if (slot.default !== undefined) picked[slot.key] = slot.default;
  });
  return picked;
}

export default {
  name: "QuickWakeModal",
  components: { Modal, Token },
  props: {
    phrase: { type: Object, required: true },
    players: { type: Array, default: () => [] }
  },
  data() {
    return {
      picked: defaultPicked(this.phrase),
      active: "",
      search: "",
      team: "all",
      // 「这些角色不在场」这类短语默认只看没上场的牌
      hideUsed: this.phrase.onlyUnused === true,
      showing: false,
      tabs: [
        { key: "all", label: "全部" },
        { key: "townsfolk", label: "镇民" },
        { key: "outsider", label: "外来者" },
        { key: "minion", label: "爪牙" },
        { key: "demon", label: "恶魔" }
      ],
      ALIGN_LABEL,
      goodIcon,
      evilIcon
    };
  },
  computed: {
    usage() {
      return buildUsage(this.players);
    },
    list() {
      return pickRoles(this.$store.state.roles, {
        search: this.search,
        team: this.team,
        hideUsed: this.hideUsed,
        usedIds: Array.from(this.usage.keys())
      });
    },
    activeDef() {
      return slotDef(this.phrase, this.active);
    },
    activeType() {
      return this.activeDef ? this.activeDef.type : "";
    },
    filledCount() {
      return Object.keys(this.picked).filter(key => this.picked[key]).length;
    },
    /** 座位号的可选范围：1–当前魔典最大座位号 */
    maxSeat() {
      return Math.max((this.players || []).length, 1);
    },
    /** 当前这一格是不是「可留空」（绿色边框） */
    activeOptional() {
      const def = slotDef(this.phrase, this.active);
      return !!(def && def.optional);
    },
    /**
     * 必填的空位都填上才能展示；
     * minFilled 表示「几格都可不填，但至少得填几格」（「你是…的…」是 1）
     */
    ready() {
      const slots = this.phrase.slots || [];
      if (slots.some(slot => !slot.optional && !this.picked[slot.key])) return false;
      const min = Number(this.phrase.minFilled) || 0;
      return this.filledCount >= min;
    }
  },
  created() {
    // 短语可以指定「先填哪个空」（如「你是…的…」先选角色，阵营可后补）
    this.active = this.phrase.firstSlot || this.firstEmpty();
  },
  methods: {
    isSlot,
    slotType,
    slotKey,
    slotLabel,
    isOptional(seg) {
      const def = slotDef(this.phrase, slotKey(seg));
      return !!(def && def.optional);
    },
    firstEmpty() {
      const slots = this.phrase.slots || [];
      const empty = slots.find(slot => !this.picked[slot.key]);
      return (empty || slots[0] || {}).key || "";
    },
    teamLabel(team) {
      return TEAM_CN[team] || team;
    },
    usedBy(role) {
      const seats = this.usage.get(String(role.id));
      return seats ? seats.join("、") : "";
    },
    isPicked(role) {
      return Object.keys(this.picked).some(
        key => this.picked[key] && this.picked[key].id === role.id
      );
    },
    pickRole(role) {
      if (!this.active) return;
      this.$set(this.picked, this.active, role);
      this.active = this.firstEmpty();
    },
    pickAlign(value) {
      if (!this.active) return;
      this.$set(this.picked, this.active, value);
      this.active = this.firstEmpty();
    },
    pickNum(n) {
      if (!this.active) return;
      this.$set(this.picked, this.active, n);
      this.active = this.firstEmpty();
    },
    /** 把当前这一格清空（只对可留空的格子显示入口） */
    clearActive() {
      if (!this.active) return;
      this.$delete(this.picked, this.active);
    },
    reset() {
      this.picked = defaultPicked(this.phrase);
      this.active = this.phrase.firstSlot || this.firstEmpty();
    },
    show() {
      if (!this.ready) return;
      this.showing = true;
    },
    /** 关掉展示就退回短语列表（这个窗口本身也一起收起来） */
    closeShow() {
      this.showing = false;
      this.$emit("close");
    }
  }
};
</script>

<style lang="scss" scoped>
.qw-panel {
  flex: 1;
  min-height: 0;
  width: 100%;
  display: flex;
  flex-direction: column;
  padding: 0 2px 4px;
  color: #eee9dd;
  text-align: left;
}

.qw-head {
  flex: none;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(201, 173, 126, 0.22);
  h3 {
    margin: 0;
    font-size: 0.95em;
    letter-spacing: 3px;
    text-align: left;
  }
  p {
    margin: 4px 0 0;
    font-size: 0.66em;
    line-height: 1.6;
    color: #a5a5a5;
  }
}

/* 一句话 + 空位 */
.qw-line {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 8px 10px;
  padding: 16px 4px 14px;
}
.qw-text {
  font-size: 0.95em;
  letter-spacing: 3px;
  color: #f2e8d5;
}
.qw-chip {
  position: relative;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px 4px 6px;
  border-radius: 26px;
  border: 1px dashed rgba(255, 255, 255, 0.22);
  background: rgba(255, 255, 255, 0.03);
  color: #cfc7b6;
  font-family: inherit;
  font-size: 0.72em;
  cursor: pointer;
  transition: border-color 160ms, background 160ms;
  &.filled {
    border-style: solid;
    border-color: rgba(201, 173, 126, 0.45);
    color: #f2e8d5;
  }
  &.active {
    border-color: #ffce8a;
    background: rgba(255, 206, 138, 0.09);
    box-shadow: 0 0 0 1px rgba(255, 206, 138, 0.35);
  }
  /* 可留空的格子统一走绿色，和必填的黄色区分开 */
  &.optional {
    border-color: rgba(126, 205, 145, 0.5);
    color: #a6ddb2;
    .qw-chip-name {
      color: #a6ddb2;
    }
    &.filled {
      border-style: solid;
      border-color: rgba(126, 205, 145, 0.72);
    }
    &.active {
      border-color: #8ee7a6;
      background: rgba(126, 205, 145, 0.12);
      box-shadow: 0 0 0 1px rgba(126, 205, 145, 0.38);
    }
    .qw-chip-opt {
      border-color: rgba(126, 205, 145, 0.5);
      color: #a6ddb2;
    }
  }
}
.qw-chip-token {
  width: 26px;
  height: 26px;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.45);
  color: #7d7d7d;
  font-size: 0.8em;
}
.qw-chip-align {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 0 4px;
  font-size: 0.9em;
  letter-spacing: 2px;
  img {
    width: 15px;
    height: 15px;
    display: block;
  }
  &.good {
    color: #8fb6e8;
  }
  &.evil {
    color: #e08b8b;
  }
}
.qw-chip-num {
  min-width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85em;
  color: #ffce8a;
  border: 1px solid rgba(255, 206, 138, 0.45);
}
.qw-chip-name {
  white-space: nowrap;
}
.qw-chip-opt {
  position: absolute;
  right: -4px;
  top: -8px;
  padding: 0 4px;
  border-radius: 6px;
  background: #2b2318;
  border: 1px solid rgba(201, 173, 126, 0.4);
  font-size: 0.8em;
  color: #c9a06a;
}

/* 选择区 */
.qw-picker {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
.qw-tools {
  flex: none;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  padding: 10px 2px 6px;
}
.qw-search {
  width: 190px;
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(0, 0, 0, 0.4);
  color: #fff;
  font-size: 0.7em;
  font-family: inherit;
  &:focus {
    outline: none;
    border-color: rgba(201, 173, 126, 0.65);
  }
}
.qw-tabs {
  display: flex;
  gap: 4px;
}
.qw-tab {
  padding: 3px 9px;
  border-radius: 11px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: transparent;
  color: #a9a9a9;
  font-family: inherit;
  font-size: 0.64em;
  cursor: pointer;
  &:hover {
    color: #ffce8a;
  }
  &.on {
    color: #ffce8a;
    border-color: rgba(255, 206, 138, 0.6);
    background: rgba(255, 206, 138, 0.12);
  }
}
.qw-count {
  flex: none;
  margin: 0 0 4px;
  padding-left: 2px;
  font-size: 0.62em;
  color: #8c8c8c;
  .qw-tip {
    margin-left: 8px;
    color: #6f6f6f;
  }
}
.qw-grid {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(84px, 1fr));
  gap: 6px 4px;
  align-content: start;
  overflow-y: auto;
  padding: 2px 2px 8px;
}
.qw-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 2px;
  border-radius: 9px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  &:hover {
    background: rgba(255, 206, 138, 0.08);
  }
  &.current {
    border-color: rgba(255, 206, 138, 0.5);
    background: rgba(255, 206, 138, 0.08);
  }
  &.used {
    opacity: 0.62;
  }
}
.qw-card-token {
  position: relative;
  width: clamp(46px, 6vw, 58px);
  aspect-ratio: 1/1;
}
.qw-used {
  position: absolute;
  right: -6px;
  top: -4px;
  padding: 0 4px;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(201, 173, 126, 0.45);
  font-size: 0.55em;
  color: #ffce8a;
}
.qw-card-name {
  font-size: 0.64em;
  color: #ece7dc;
}
.qw-card-team {
  font-style: normal;
  font-size: 0.54em;
  letter-spacing: 1px;
  color: #7c9fc4;
  &.outsider {
    color: #8fb87a;
  }
  &.minion {
    color: #c48b8b;
  }
  &.demon {
    color: #d2696a;
  }
}
.qw-empty {
  flex: none;
  padding: 18px 4px;
  font-size: 0.7em;
  color: #8f8f8f;
}

/* 善良 / 邪恶 */
.qw-align {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 26px;
}
.qw-align-btn {
  width: 150px;
  padding: 18px 0;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.03);
  color: #d8d2c6;
  font-family: inherit;
  font-size: 1.05em;
  letter-spacing: 6px;
  cursor: pointer;
  transition: all 160ms;
  /* 拇指图和文字横着排（原来是上下叠） */
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 12px;
  .qw-align-thumb {
    width: 52px;
    height: 52px;
    display: block;
    flex: none;
  }
  &.good:hover,
  &.good.on {
    color: #cfe4ff;
    border-color: #6f9fd8;
    background: rgba(90, 140, 200, 0.22);
  }
  &.evil:hover,
  &.evil.on {
    color: #ffd2d2;
    border-color: #c06565;
    background: rgba(170, 70, 70, 0.24);
  }
}

/* 1–12 */
.qw-nums {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  align-content: center;
  padding: 10px 6px 18px;
}
.qw-num {
  padding: 14px 0;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.03);
  color: #ded7c9;
  font-family: inherit;
  font-size: 1em;
  cursor: pointer;
  &:hover {
    color: #ffce8a;
    border-color: rgba(255, 206, 138, 0.55);
  }
  &.on {
    color: #1a1206;
    border-color: #ffce8a;
    background: #ffce8a;
  }
}

.qw-plain {
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 0.72em;
  color: #8c8c8c;
}

/* 可选格子的「留空」入口 */
.qw-slot-clear {
  flex: none;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 2px 2px;
}
.qw-clear-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: 12px;
  border: 1px solid rgba(126, 205, 145, 0.55);
  background: rgba(126, 205, 145, 0.08);
  color: #a6ddb2;
  font-family: inherit;
  font-size: 0.66em;
  cursor: pointer;
  &:hover {
    color: #d7f5de;
    border-color: #8ee7a6;
  }
}
.qw-clear-tip {
  font-size: 0.6em;
  color: #6f8f77;
}

.qw-actions {
  flex: none;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 10px 2px 2px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}
.qw-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 18px;
  border-radius: 16px;
  border: 1px solid rgba(201, 173, 126, 0.7);
  background: linear-gradient(180deg, #3a2c14, #150e05);
  color: #ffd9a0;
  font-family: inherit;
  font-size: 0.74em;
  letter-spacing: 1px;
  cursor: pointer;
  &:hover:not(:disabled) {
    color: #fff;
    border-color: #ffdfae;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  &.ghost {
    border-color: rgba(255, 255, 255, 0.18);
    background: transparent;
    color: #b9b3a6;
  }
}

/* ---------- 全屏展示 ---------- */
.qw-show {
  position: fixed;
  inset: 0;
  z-index: 400;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 26px;
  padding: 6vh 5vw;
  box-sizing: border-box;
  background: radial-gradient(circle at 50% 40%, #16110c 0%, #000 78%);
  cursor: pointer;
}
.qws-line {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 18px 24px;
  max-width: 92vw;
}
.qws-text {
  /* 这是举给桌子对面看的，字要大：900 高屏幕上约 47px */
  font-size: clamp(24px, 5.2vmin, 58px);
  letter-spacing: 7px;
  color: #f3e9d6;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8);
}
.qws-role {
  display: flex;
  flex-direction: column;
  align-items: center;
  /* 牌是这句话的主角，比正文再大一号（900 高屏幕上约 216px） */
  width: clamp(104px, 24vmin, 250px);
  b {
    margin-top: 12px;
    font-weight: normal;
    font-size: clamp(14px, 2.1vmin, 24px);
    letter-spacing: 3px;
    color: #d8cbb4;
  }
}
.qws-align {
  display: flex;
  /* 拇指图和「善良 / 邪恶」横着排（原来是上下叠） */
  flex-direction: row;
  align-items: center;
  gap: clamp(10px, 1.8vmin, 22px);
  font-size: clamp(30px, 7vmin, 76px);
  letter-spacing: 10px;
  img {
    width: clamp(46px, 9vmin, 104px);
    height: clamp(46px, 9vmin, 104px);
    display: block;
    flex: none;
    filter: drop-shadow(0 0 18px rgba(255, 255, 255, 0.25));
  }
  &.good {
    color: #8fb6e8;
    text-shadow: 0 0 26px rgba(90, 140, 200, 0.6);
  }
  &.evil {
    color: #e08b8b;
    text-shadow: 0 0 26px rgba(170, 70, 70, 0.6);
  }
}
.qws-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: clamp(56px, 9vmin, 96px);
  height: clamp(56px, 9vmin, 96px);
  border-radius: 50%;
  border: 2px solid rgba(255, 206, 138, 0.7);
  color: #ffce8a;
  font-size: clamp(24px, 4.4vmin, 44px);
}
.qws-seat {
  font-size: clamp(24px, 5.2vmin, 58px);
  letter-spacing: 7px;
  color: #ffce8a;
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.8);
}
.qws-hint {
  margin: 0;
  font-size: clamp(11px, 1.5vmin, 14px);
  letter-spacing: 2px;
  color: #6e6e6e;
}
</style>
