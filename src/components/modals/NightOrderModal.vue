<template>
  <Modal name="night" @close="$emit('close')">
    <div class="no-panel">
      <header class="no-head">
        <!-- 天数不在这里调：顶栏有专门的「第 N 夜」按钮 -->
        <div class="no-phase">
          <span class="no-phase-label" :class="{ day: !isNight }">
            第 {{ night }} {{ isNight ? "夜" : "天" }}
          </span>
        </div>
        <div class="no-titles">
          <h3>夜间行动顺序</h3>
          <p>
            {{ isNight ? "按编号从下往上唤醒" : "白天不结算夜序，可先核对昨晚结果" }}
            <span class="no-dot">·</span>
            {{ doneCount }} / {{ rows.length }} 已处理
          </p>
        </div>
      </header>

      <div class="no-tools">
        <button
          class="no-chip"
          :class="{ on: onlyPending }"
          @click="onlyPending = !onlyPending"
        >
          只看未处理
        </button>
        <button class="no-chip" :class="{ on: withDead }" @click="withDead = !withDead">
          显示已死亡
        </button>
        <button class="no-chip" @click="resetNight">清空本夜进度</button>
        <span class="no-hint">点一行就是「已行动」，再点一次撤回</span>
      </div>

      <p class="no-empty" v-if="!rows.length">
        这一夜没有需要唤醒的角色。若刚分配完角色，请确认角色数据里带有
        <code>firstNight / otherNight</code> 编号。
      </p>
      <p class="no-empty" v-else-if="!visible.length">
        本夜的行动都处理完了。
      </p>

      <ol class="no-list" v-else>
        <li
          v-for="row in visible"
          :key="row.key + '-' + (row.alias || row.index)"
          class="no-row"
          :class="{ done: row.done, dead: row.dead, info: row.info }"
          @click="toggle(row)"
        >
          <div class="no-order">
            <em>{{ row.order }}</em>
          </div>
          <!-- 角色图标：源码 NightOrderModal 的 .icon，地址收在 logic/roleIcon.js -->
          <div class="no-icon" :class="row.role.team">
            <span :style="iconStyle(row)"></span>
          </div>
          <div class="no-seat" v-if="row.seat">{{ row.seat }}</div>
          <div class="no-main">
            <div class="no-name">
              <template v-if="row.info">{{ row.role.name }}</template>
              <template v-else>
                {{ row.player.name }}
                <span class="no-role" :class="row.role.team">{{ row.role.name }}</span>
                <span class="no-dead" v-if="row.dead">已死亡</span>
              </template>
            </div>
            <p class="no-text">{{ row.text || "该角色本夜无需唤醒，按能力自行判断。" }}</p>
          </div>
          <div class="no-check">
            <font-awesome-icon :icon="row.done ? 'check-circle' : 'circle'" />
          </div>
        </li>
      </ol>
    </div>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import { buildNightOrder } from "../../logic/grimoire";
import { roleIconUrl } from "../../logic/roleIcon";

export default {
  name: "NightOrderModal",
  components: { Modal },
  props: {
    players: { type: Array, default: () => [] },
    night: { type: Number, default: 1 },
    isNight: { type: Boolean, default: true }
  },
  data() {
    // 默认只看未处理（用户要求），已死亡默认不显示：死人夜里不会被唤醒
    return { onlyPending: true, withDead: false };
  },
  computed: {
    firstNight() {
      // 第一夜用首夜顺序，其余夜晚用「其他夜晚」顺序
      return this.night <= 1;
    },
    rows() {
      return buildNightOrder(this.players, {
        firstNight: this.firstNight,
        night: this.night
      });
    },
    visible() {
      return this.rows.filter(row => {
        if (!this.withDead && row.dead) return false;
        if (this.onlyPending && row.done) return false;
        return true;
      });
    },
    doneCount() {
      return this.rows.filter(row => row.done).length;
    }
  },
  methods: {
    /**
     * 图标：剧本自带图片优先，缺图退到阵营占位图（都在图床）。
     * 注意不能「imageAlt 优先」—— 自定义剧本的 imageAlt 会被塞成阵营占位图
     *（good.png 就是那个蓝色大拇指），一优先整列图标都变成大拇指。
     */
    iconStyle(row) {
      const url = roleIconUrl(row.role);
      return url ? { backgroundImage: `url(${url})` } : {};
    },
    toggle(row) {
      // 爪牙/恶魔信息没有对应玩家，进度记在该阵营第一个人身上
      const target = row.info ? (row.players || [])[0] : row.player;
      if (!target) return;
      const property = row.info ? null : "nightDone";
      const map = Object.assign({}, target.nightDone || {});
      const key = row.info ? "info" + row.alias : row.key;
      if (map[key]) this.$delete(map, key);
      else map[key] = true;
      this.$store.commit("players/update", {
        player: target,
        property: property || "nightDone",
        value: map
      });
    },
    resetNight() {
      const key = (this.firstNight ? "f" : "o") + this.night;
      const byPlayer = new Map();
      this.rows.forEach(row => {
        if (!row.done) return;
        const target = row.info ? (row.players || [])[0] : row.player;
        if (!target) return;
        if (!byPlayer.has(target)) byPlayer.set(target, []);
        byPlayer.get(target).push(row.info ? "info" + row.alias : key);
      });
      byPlayer.forEach((keys, target) => {
        const map = Object.assign({}, target.nightDone || {});
        keys.forEach(k => this.$delete(map, k));
        this.$store.commit("players/update", {
          player: target,
          property: "nightDone",
          value: map
        });
      });
    }
  }
};
</script>

<style lang="scss" scoped>
.no-panel {
  /* 同 RemindersModal：用固定宽 + max-width，宽度交给外层窗口去收，避免横向溢出 */
  width: 760px;
  max-width: 100%;
  /*
   * 高度写死：点掉一行之后那一行会被「只看未处理」过滤掉，列表一变短
   * 整个窗口就跟着缩一下，鼠标底下东西全跳位，看着像窗口在抖。
   * 外部尺寸固定，只让里面的列表自己滚。
   */
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 4px 6px 10px;
  color: #eee9dd;
  text-align: left;
}

.no-head {
  flex: none;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 6px 4px 12px;
  border-bottom: 1px solid rgba(201, 173, 126, 0.22);
}

.no-phase {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
}
.no-phase-label {
  min-width: 78px;
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px solid rgba(201, 173, 126, 0.5);
  background: linear-gradient(180deg, #1b2632, #0a1015);
  color: #ffd9a0;
  font-size: 0.86em;
  letter-spacing: 1px;
  cursor: default;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  &.day {
    color: #ffe9b8;
    border-color: rgba(255, 214, 130, 0.75);
    background: linear-gradient(180deg, #3a2c14, #150e05);
  }
}

.no-titles {
  h3 {
    text-align: left;
    font-size: 0.95em;
    letter-spacing: 3px;
    margin: 0;
  }
  p {
    margin: 3px 0 0;
    font-size: 0.68em;
    color: #a9a9a9;
  }
  .no-dot {
    margin: 0 6px;
    opacity: 0.5;
  }
}

.no-tools {
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 2px;
  .no-hint {
    margin-left: auto;
    font-size: 0.62em;
    color: #818181;
  }
}
.no-chip {
  padding: 2px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.05);
  color: #cfcfcf;
  font-size: 0.66em;
  cursor: pointer;
  &:hover {
    color: #ffce8a;
  }
  &.on {
    color: #1a1206;
    background: linear-gradient(180deg, #e8c88f, #c9ad7e);
    border-color: #ffdfae;
  }
}

.no-empty {
  flex: 1;
  margin: 18px 4px;
  font-size: 0.72em;
  line-height: 1.7;
  color: #9a9a9a;
  code {
    color: #ffce8a;
  }
}

.no-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
  list-style: none;
  margin: 0;
}

.no-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 9px 8px;
  border-radius: 9px;
  border: 1px solid transparent;
  border-bottom-color: rgba(255, 255, 255, 0.07);
  cursor: pointer;
  transition: background 160ms, opacity 160ms;
  &:hover {
    background: rgba(255, 206, 138, 0.07);
  }
  &.done {
    opacity: 0.45;
    .no-name {
      text-decoration: line-through;
    }
  }
  &.dead .no-seat {
    filter: grayscale(1);
  }
}

.no-order {
  flex: none;
  width: 28px;
  padding-top: 2px;
  em {
    display: inline-block;
    min-width: 22px;
    padding: 1px 4px;
    border-radius: 5px;
    font-style: normal;
    font-size: 0.7em;
    text-align: center;
    color: #1a1206;
    background: linear-gradient(180deg, #e9d1a5, #c9ad7e);
  }
}

.no-seat {
  flex: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid rgba(201, 173, 126, 0.45);
  background: #12181f;
  color: #d9c39a;
  font-size: 0.68em;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 源码 NightOrderModal 的 .icon：每行左边一张角色图标 */
.no-icon {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 6px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.1);
  span {
    display: block;
    width: 100%;
    height: 100%;
    /*
     * contain 而不是 cover：图标是正方形，装进方框里整张都看得见。
     * 用 cover 只能看到正中间那一条，舞蛇人 / 小精灵这种线条细的图
     * 裁完就剩一坨颜色，认不出是谁。
     */
    background-size: contain;
    background-position: center;
    background-repeat: no-repeat;
  }
  &.minion {
    border-color: rgba(240, 163, 163, 0.45);
  }
  &.demon {
    border-color: rgba(208, 140, 255, 0.45);
  }
}

.no-main {
  flex: 1;
  min-width: 0;
}
.no-name {
  font-size: 0.8em;
  color: #fff;
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
}
.no-role {
  font-size: 0.8em;
  padding: 0 6px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  &.townsfolk {
    color: #9ecbff;
  }
  &.outsider {
    color: #b9e0a5;
  }
  &.minion {
    color: #f0a3a3;
  }
  &.demon {
    color: #d08cff;
  }
}
.no-dead {
  font-size: 0.75em;
  color: #d98a8a;
}
.no-text {
  margin: 4px 0 0;
  font-size: 0.7em;
  line-height: 1.6;
  color: #b9b9b9;
}

.no-check {
  flex: none;
  padding-top: 4px;
  font-size: 0.9em;
  color: #6d7a86;
  .done & {
    color: #7fd39a;
  }
}
</style>
