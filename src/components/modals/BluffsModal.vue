<template>
  <Modal name="bluffs" @close="$emit('close')">
    <!-- 功能按钮放进窗口的按钮行，避免和右上角的关闭按钮重叠 -->
    <template #tools>
      <button class="bl-show" :disabled="!filled" @click="$emit('preview')">
        <font-awesome-icon icon="eye" /> 给恶魔看
      </button>
    </template>
    <div class="bl-panel">
      <header class="bl-head">
        <div>
          <h3>恶魔伪装</h3>
          <p>
            选出 3 张不在场的镇民 / 外来者给恶魔看；在场角色不会出现在候选里。
          </p>
        </div>
      </header>

      <div class="bl-slots">
        <div
          class="bl-slot"
          v-for="(slot, i) in 3"
          :key="'slot-' + i"
          :class="{ filled: !!slots[i], active: active === i }"
          @click="active = i"
        >
          <div class="bl-slot-no">{{ i + 1 }}</div>
          <div class="bl-slot-token" v-if="slots[i]">
            <Token :role="slots[i]" :show-corner="false" />
          </div>
          <div class="bl-slot-empty" v-else>未设置</div>
          <div class="bl-slot-name" v-if="slots[i]">{{ slots[i].name }}</div>
          <button
            class="bl-clear"
            v-if="slots[i]"
            title="清除这一格"
            @click.stop="clearSlot(i)"
          >
            ×
          </button>
        </div>
      </div>

      <div class="bl-tools">
        <input class="bl-search" v-model="search" placeholder="搜索角色名" />
        <span class="bl-tip">先点一个格子，再点角色</span>
      </div>

      <div class="bl-grid">
        <button
          v-for="role in candidates"
          :key="role.id"
          class="bl-card"
          :class="{ used: pickedIds.includes(String(role.id)) }"
          :title="role.ability || ''"
          @click="pick(role)"
        >
          <div class="bl-token"><Token :role="role" :show-corner="false" /></div>
          <span>{{ role.name }}</span>
          <em :class="role.team">{{ role.team === "outsider" ? "外来者" : "镇民" }}</em>
        </button>
      </div>

      <p class="bl-empty" v-if="!candidates.length">
        没有可选的角色了：当前剧本的镇民与外来者可能都已上场。
      </p>
    </div>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import Token from "../Token";
import { bluffCandidates } from "../../logic/grimoire";

export default {
  name: "BluffsModal",
  components: { Modal, Token },
  props: {
    players: { type: Array, default: () => [] }
  },
  data() {
    return { active: 0, search: "" };
  },
  computed: {
    bluffs() {
      return this.$store.state.players.bluffs || [];
    },
    /** 三个格子：缺的补 null */
    slots() {
      const list = this.bluffs.map(id => this.roleById(id)).filter(Boolean);
      return [list[0] || null, list[1] || null, list[2] || null];
    },
    filled() {
      return this.slots.filter(Boolean).length;
    },
    pickedIds() {
      return this.slots.filter(Boolean).map(role => String(role.id));
    },
    candidates() {
      const keyword = this.search.trim().toLowerCase();
      return bluffCandidates(this.$store.state.roles, this.players).filter(
        role => !keyword || String(role.name || "").toLowerCase().includes(keyword)
      );
    }
  },
  methods: {
    roleById(id) {
      if (!id) return null;
      return this.$store.state.roles.get(String(id)) || null;
    },
    write(list) {
      this.$root.$emit("grimoire:mark", "恶魔伪装");
      this.$store.commit("players/setBluffs", list);
    },
    pick(role) {
      const next = this.slots.map(item => (item ? String(item.id) : ""));
      // 已经占着别的格子：先清掉那一格，避免同一个角色出现两次
      const at = next.indexOf(String(role.id));
      if (at === this.active) return;
      if (at >= 0) next[at] = "";
      next[this.active] = String(role.id);
      this.write(next);
      // 自动跳到下一个空格，三张通常一口气选完
      const empty = next.findIndex(item => !item);
      if (empty >= 0) this.active = empty;
    },
    clearSlot(i) {
      const next = this.slots.map(item => (item ? String(item.id) : ""));
      next[i] = "";
      this.write(next);
      this.active = i;
    }
  }
};
</script>

<style lang="scss" scoped>
.bl-panel {
  width: 820px;
  max-width: 100%;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  padding: 4px 6px 10px;
  color: #eee9dd;
  text-align: left;
}

.bl-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(201, 173, 126, 0.22);
  h3 {
    text-align: left;
    font-size: 0.95em;
    letter-spacing: 3px;
    margin: 0;
  }
  p {
    margin: 4px 0 0;
    font-size: 0.66em;
    color: #a5a5a5;
  }
}
.bl-show {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 14px;
  border-radius: 14px;
  border: 1px solid rgba(201, 173, 126, 0.7);
  background: linear-gradient(180deg, #3a2c14, #150e05);
  color: #ffd9a0;
  font-size: 0.72em;
  cursor: pointer;
  &:hover:not(:disabled) {
    color: #fff;
    border-color: #ffdfae;
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.bl-slots {
  display: flex;
  gap: 14px;
  justify-content: center;
  padding: 12px 0 6px;
}
.bl-slot {
  position: relative;
  width: 108px;
  padding: 8px 6px 6px;
  border-radius: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.03);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  transition: border-color 160ms, background 160ms;
  &.filled {
    border-style: solid;
    border-color: rgba(201, 173, 126, 0.45);
  }
  &.active {
    border-color: #ffce8a;
    box-shadow: 0 0 0 1px rgba(255, 206, 138, 0.35);
    background: rgba(255, 206, 138, 0.07);
  }
}
.bl-slot-no {
  position: absolute;
  left: 4px;
  top: 2px;
  font-size: 0.6em;
  color: #8a8a8a;
}
.bl-slot-token {
  width: 62px;
  aspect-ratio: 1/1;
}
.bl-slot-empty {
  width: 62px;
  height: 62px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.62em;
  color: #7d7d7d;
}
.bl-slot-name {
  font-size: 0.68em;
  color: #efe9dc;
}
.bl-clear {
  position: absolute;
  right: 2px;
  top: 2px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.65);
  color: #d9a0a0;
  cursor: pointer;
  line-height: 1;
  &:hover {
    color: #fff;
    background: #7a2b2b;
  }
}

.bl-tools {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 2px;
}
.bl-search {
  width: 200px;
  padding: 4px 9px;
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
.bl-tip {
  font-size: 0.62em;
  color: #818181;
}

.bl-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(88px, 1fr));
  gap: 8px 4px;
  overflow-y: auto;
  padding: 4px 2px 8px;
}
.bl-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  padding: 4px 2px;
  border-radius: 9px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  span {
    font-size: 0.64em;
    color: #ece7dc;
  }
  em {
    font-style: normal;
    font-size: 0.54em;
    letter-spacing: 1px;
    color: #7c9fc4;
    &.outsider {
      color: #8fb87a;
    }
  }
  &:hover {
    background: rgba(255, 206, 138, 0.08);
  }
  &.used {
    opacity: 0.35;
  }
}
.bl-token {
  width: clamp(46px, 7vw, 62px);
  aspect-ratio: 1/1;
}
.bl-empty {
  padding: 18px 4px;
  font-size: 0.7em;
  color: #8f8f8f;
}
</style>
