<template>
  <Modal name="fabled" @close="$emit('close')">
    <div class="fb-panel">
      <header class="fb-head">
        <h3>传奇 / 奇遇角色</h3>
        <p>
          这类角色不占座位、不计入存活与夜序。点圆牌上的加号把它加进本局，
          鼠标停在圆牌上才显示名字与能力。
        </p>
      </header>

      <div class="fb-current" v-if="picked.length">
        <span class="fb-cap">本局已添加</span>
        <div class="fb-chips">
          <button
            v-for="role in picked"
            :key="'on-' + role.id"
            class="fb-chip"
            :title="`${role.name}：${role.ability || ''}\n点击移除`"
            @click="toggle(role)"
          >
            <span class="fb-chip-token">
              <Token :role="role" :show-corner="false" :show-name="false" />
            </span>
            <span class="fb-chip-name">{{ role.name }}</span>
            <i>×</i>
          </button>
        </div>
      </div>

      <div class="fb-grid">
        <div
          class="fb-cell"
          v-for="role in list"
          :key="role.id"
          :class="{ on: isOn(role) }"
        >
          <button
            class="fb-token"
            :title="isOn(role) ? `移除「${role.name}」` : `添加「${role.name}」`"
            @click="toggle(role)"
          >
            <Token :role="role" :show-corner="false" :show-name="false" />
            <!-- 没图才用名字首字当纹章；仓库里 34 张传奇图标齐了，基本走不到这 -->
            <span class="fb-glyph" v-if="!hasIcon(role)">{{ role.name.slice(0, 1) }}</span>
            <span class="fb-add" :class="{ added: isOn(role) }">
              <font-awesome-icon :icon="isOn(role) ? 'check' : 'plus'" />
            </span>
          </button>
          <!-- 名字与能力只在悬停时浮出，平时不占版面 -->
          <div class="fb-tip">
            <b>{{ role.name }}</b>
            <span>{{ role.ability || "（该角色没有写能力）" }}</span>
          </div>
        </div>
      </div>

      <p class="fb-empty" v-if="!list.length">
        当前剧本里没有传奇 / 奇遇角色。
      </p>
    </div>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import Token from "../Token";

export default {
  name: "FabledModal",
  components: { Modal, Token },
  computed: {
    list() {
      return Array.from(this.$store.state.fabled.values());
    },
    pickedIds() {
      return (this.$store.state.players.fabled || []).map(String);
    },
    picked() {
      return this.pickedIds
        .map(id => this.$store.state.fabled.get(id))
        .filter(Boolean);
    }
  },
  methods: {
    // 图标全走图床：剧本自带 image 的传奇才有图，其余显示文字
    hasIcon(role) {
      return !!role.image;
    },
    isOn(role) {
      return this.pickedIds.includes(String(role.id));
    },
    toggle(role) {
      const next = this.pickedIds.slice();
      const at = next.indexOf(String(role.id));
      if (at >= 0) next.splice(at, 1);
      else next.push(String(role.id));
      this.$root.$emit(
        "grimoire:mark",
        `${at >= 0 ? "移除" : "添加"}传奇角色 ${role.name}`
      );
      this.$store.commit("players/setFabled", next);
    }
  }
};
</script>

<style lang="scss" scoped>
.fb-panel {
  width: 760px;
  max-width: 100%;
  max-height: 80vh;
  overflow-y: auto;
  padding: 4px 6px 10px;
  color: #eee9dd;
  text-align: left;
}
.fb-head {
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(201, 173, 126, 0.22);
  h3 {
    margin: 0;
    text-align: left;
    font-size: 0.95em;
    letter-spacing: 3px;
  }
  p {
    margin: 4px 0 0;
    font-size: 0.66em;
    line-height: 1.6;
    color: #a5a5a5;
  }
}

.fb-current {
  padding: 10px 0 4px;
  .fb-cap {
    font-size: 0.62em;
    color: #c9ad7e;
    letter-spacing: 1px;
  }
}
.fb-chips {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 7px;
}
.fb-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px 3px 3px;
  border-radius: 20px;
  border: 1px solid rgba(201, 173, 126, 0.55);
  background: rgba(201, 173, 126, 0.12);
  color: #ffd9a0;
  font-size: 0.66em;
  cursor: pointer;
  &:hover {
    color: #fff;
    border-color: #ffdfae;
  }
  .fb-chip-token {
    width: 26px;
    height: 26px;
    flex: none;
    display: block;
  }
  .fb-chip-name {
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  i {
    font-style: normal;
    opacity: 0.7;
  }
}

/* 圆牌网格：和玩家座位上的牌同一套视觉 */
.fb-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(104px, 1fr));
  gap: 14px;
  padding: 14px 2px 6px;
}
.fb-cell {
  position: relative;
  display: flex;
  justify-content: center;
}
.fb-token {
  position: relative;
  width: 92px;
  height: 92px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
  filter: drop-shadow(0 3px 7px rgba(0, 0, 0, 0.6));
  transition: transform 160ms, filter 160ms;
  &:hover {
    transform: translateY(-3px);
    filter: drop-shadow(0 6px 14px rgba(255, 190, 110, 0.35));
  }
  .fb-glyph {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: PiratesBay, "Noto Sans SC", serif;
    font-size: 30px;
    line-height: 1;
    color: #3a2a18;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.6),
      0 0 6px rgba(120, 90, 40, 0.35);
    pointer-events: none;
  }
  .fb-add {
    position: absolute;
    right: -4px;
    bottom: -4px;
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: #ffe3bd;
    background: linear-gradient(#3b2c18, #16100a);
    border: 1px solid rgba(255, 206, 138, 0.65);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
    &.added {
      color: #1d1408;
      background: linear-gradient(#ffe0ad, #d8a94f);
      border-color: #ffdfae;
    }
  }
}
.fb-cell.on .fb-token {
  filter: drop-shadow(0 0 10px rgba(255, 200, 120, 0.55))
    drop-shadow(0 3px 7px rgba(0, 0, 0, 0.6));
}

/* 悬停浮出的说明：平时不占空间，所以格子可以排得很紧 */
.fb-tip {
  position: absolute;
  left: 50%;
  bottom: calc(100% - 4px);
  transform: translateX(-50%);
  width: max-content;
  max-width: 230px;
  padding: 6px 9px;
  border-radius: 8px;
  background: rgba(8, 8, 8, 0.96);
  border: 1px solid rgba(201, 173, 126, 0.45);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.75);
  opacity: 0;
  pointer-events: none;
  transition: opacity 140ms;
  z-index: 30;
  text-align: left;
  b {
    display: block;
    font-size: 0.66em;
    letter-spacing: 1px;
    color: #ffd9a0;
  }
  span {
    display: block;
    margin-top: 3px;
    font-size: 0.62em;
    line-height: 1.5;
    color: #cfc7b8;
  }
  &:after {
    content: "";
    position: absolute;
    left: 50%;
    top: 100%;
    transform: translateX(-50%);
    border: 6px solid transparent;
    border-top-color: rgba(201, 173, 126, 0.45);
  }
}
.fb-cell:hover .fb-tip {
  opacity: 1;
}

.fb-empty {
  padding: 18px 4px;
  font-size: 0.7em;
  color: #8f8f8f;
}
</style>
