<template>
  <Modal name="role-picker" @close="$emit('close')">
    <div class="rp-panel" v-if="player">
      <header class="rp-head">
        <div class="rp-seat" :class="{ dead: player.isDead }">{{ index + 1 }}</div>
        <div class="rp-titles">
          <h3>
            <input
              class="rp-name-input"
              v-model="nameDraft"
              maxlength="12"
              @change="saveName"
              @keyup.enter="$event.target.blur()"
              title="直接改座位名"
            />
            <span class="rp-now" :class="roleTeam">{{ roleName }}</span>
          </h3>
          <p>
            <template v-if="coverName">
              牌面是伪装牌，真实身份「{{ coverName }}」
            </template>
            <template v-else>点击下面的圆牌即可换角色</template>
            <span class="rp-dot">·</span>
            {{ (player.reminders || []).length }} 个标记
          </p>
        </div>
      </header>

      <section class="rp-note">
        <label>说书人笔记</label>
        <textarea
          v-model="noteDraft"
          rows="2"
          maxlength="200"
          placeholder="只给自己看：这个座位的关键信息、承诺、状态来源…"
          @change="saveNote"
        ></textarea>
      </section>

      <!-- 座位状态的快捷开关：放在内容区，不占窗口按钮那一行 -->
      <div class="rp-quick-row">
        <button
          class="rp-mini"
          :class="{ on: player.isDead }"
          :title="player.isDead ? '恢复存活' : '标记死亡'"
          @click="toggleDeath"
        >
          <font-awesome-icon :icon="player.isDead ? 'skull' : 'heartbeat'" />
          {{ player.isDead ? "已死亡" : "存活" }}
        </button>
        <button
          class="rp-mini"
          :class="{ on: !player.isVoteless }"
          :disabled="!player.isDead"
          :title="player.isDead ? '死亡票是否还能用' : '存活玩家不需要死亡票'"
          @click="toggleVote"
        >
          <font-awesome-icon icon="vote-yea" />
          {{ player.isVoteless ? "无票" : "有票" }}
        </button>
        <button class="rp-mini" title="清空这个座位的角色" @click="clearRole">
          <font-awesome-icon icon="eraser" /> 清空
        </button>
        <span class="rp-quick-tip">
          换座位在座位名字的菜单里
        </span>
      </div>

      <div class="rp-tools">
        <input
          class="rp-search"
          v-model="search"
          placeholder="搜索角色名或能力"
        />
        <div class="rp-tabs">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="rp-tab"
            :class="{ on: team === tab.key }"
            @click="team = tab.key"
          >
            {{ tab.label }}
          </button>
        </div>
        <button
          class="rp-tab"
          :class="{ on: hideUsed }"
          @click="hideUsed = !hideUsed"
        >
          只看不在场
        </button>
      </div>

      <p class="rp-count">
        共 {{ list.length }} 个候选角色
        <span class="rp-tip">已在场的角色会淡化，仍可重复选择</span>
      </p>

      <div class="rp-grid">
        <button
          v-for="role in list"
          :key="role.id"
          class="rp-card"
          :class="{ used: !!usedBy(role), current: role.id === currentId }"
          :title="(role.ability || '')"
          @click="assign(role)"
        >
          <div class="rp-token">
            <Token :role="role" :show-corner="false" />
            <span class="rp-used" v-if="usedBy(role)">{{ usedBy(role) }}号</span>
          </div>
          <div class="rp-card-name">{{ role.name }}</div>
          <div class="rp-card-team" :class="role.team">{{ teamLabel(role.team) }}</div>
        </button>
      </div>

      <p class="rp-empty" v-if="!list.length">没有匹配的角色，换个关键词或类型试试。</p>
    </div>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import Token from "../Token";
import { TEAM_CN, buildUsage, pickRoles } from "../../logic/grimoire";
import { sweepRoleReminders, identityReminders } from "../../logic/reminders";

export default {
  name: "RolePickerModal",
  components: { Modal, Token },
  props: {
    player: { type: Object, default: null },
    players: { type: Array, default: () => [] },
    index: { type: Number, default: -1 }
  },
  data() {
    return {
      search: "",
      team: "all",
      // 换角色的绝大多数场景是「找一张还不在场的牌」，默认就把已在场的藏起来
      hideUsed: true,
      nameDraft: "",
      noteDraft: "",
      tabs: [
        { key: "all", label: "全部" },
        { key: "townsfolk", label: "镇民" },
        { key: "outsider", label: "外来者" },
        { key: "minion", label: "爪牙" },
        { key: "demon", label: "恶魔" }
      ]
    };
  },
  computed: {
    currentId() {
      return (this.player && this.player.role && this.player.role.id) || "";
    },
    roleName() {
      return (this.player && this.player.role && this.player.role.name) || "空座位";
    },
    roleTeam() {
      return (this.player && this.player.role && this.player.role.team) || "";
    },
    coverName() {
      const role = (this.player && this.player.role) || {};
      return (role.coverOf && role.coverOf.name) || "";
    },
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
    }
  },
  mounted() {
    this.nameDraft = (this.player && this.player.name) || "";
    this.noteDraft = (this.player && this.player.note) || "";
  },
  methods: {
    teamLabel(team) {
      return TEAM_CN[team] || team;
    },
    /** 已在场的座位号（真实身份或牌面被别人占着都算） */
    usedBy(role) {
      const seats = this.usage.get(String(role.id));
      if (!seats) return "";
      const others = seats.filter(seat => seat !== this.index + 1);
      return others.length ? others.join("、") : "";
    },
    mark(label) {
      this.$root.$emit("grimoire:mark", label);
    },
    saveName() {
      const name = String(this.nameDraft || "").trim() || this.index + 1 + "号";
      if (name === this.player.name) return;
      this.mark(`改名 ${this.player.name} → ${name}`);
      this.$store.commit("players/update", {
        player: this.player,
        property: "name",
        value: name
      });
    },
    saveNote() {
      if (this.noteDraft === (this.player.note || "")) return;
      this.mark(`${this.player.name} 的说书人笔记`);
      this.$store.commit("players/update", {
        player: this.player,
        property: "note",
        value: this.noteDraft
      });
    },
    toggleDeath() {
      const next = !this.player.isDead;
      this.mark(`${this.player.name} ${next ? "死亡" : "复活"}`);
      this.$store.commit("players/update", {
        player: this.player,
        property: "isDead",
        value: next
      });
      if (!next) return;
      // 死亡时这个角色自己带来的非全局标记失效（可能挂在别人身上，扫全场），
      // 交给上层弹可撤回的提示条
      const oldRole = this.player.role || {};
      const groups = sweepRoleReminders(
        this.players,
        oldRole,
        this.$store.commit.bind(this.$store)
      );
      if (!groups.length) return;
      this.$emit("removed", {
        index: this.index,
        playerName: this.player.name,
        roleName: oldRole.name || "",
        groups,
        dead: true
      });
    },
    toggleVote() {
      if (!this.player.isDead) return;
      this.mark(`${this.player.name} 死亡票${this.player.isVoteless ? "恢复" : "标记已用"}`);
      this.$store.commit("players/update", {
        player: this.player,
        property: "isVoteless",
        value: !this.player.isVoteless
      });
    },
    clearRole() {
      if (!this.currentId) return;
      this.mark(`清空 ${this.player.name} 的角色`);
      // 只清「这个角色自己带来的、非全局」的标记（扫全场，别人的座位也扫），
      // 别人的标记（中毒等）留着，清掉的交给上层弹可撤回的提示条
      const oldRole = this.player.role || {};
      const groups = sweepRoleReminders(
        this.players,
        oldRole,
        this.$store.commit.bind(this.$store)
      );
      this.$store.commit("players/update", {
        player: this.player,
        property: "role",
        value: {}
      });
      if (groups.length) {
        this.$emit("removed", {
          index: this.index,
          playerName: this.player.name,
          roleName: oldRole.name || "",
          groups
        });
      }
      this.$store.commit("players/update", {
        player: this.player,
        property: "isDead",
        value: false
      });
      this.$store.commit("players/update", {
        player: this.player,
        property: "isVoteless",
        value: false
      });
    },
    /** 换座位不在这里做：点座位名字出的菜单里才有 */
    assign(role) {
      if (String(role.id) === String(this.currentId)) {
        this.$emit("close");
        return;
      }
      this.mark(`${this.player.name} 换角色 → ${role.name}`);
      // 换角色只清旧角色带来的非全局标记；新角色如果是认知覆盖（酒鬼之类），
      // 顺手把真实身份的全局标记挂好，省得说书人自己再找
      const oldRole = this.player.role || {};
      // 旧角色带来的标记可能挂在别人身上，扫全场一起摘掉
      const groups = sweepRoleReminders(
        this.players,
        oldRole,
        this.$store.commit.bind(this.$store)
      );
      // 换角色必须复制一份：Map 里的角色对象是共享的，直接挂到玩家上会让
      // 两个人的 coverOf / selected 互相污染
      const next = Object.assign({}, role, { selected: 1 });
      this.$store.commit("players/update", {
        player: this.player,
        property: "role",
        value: next
      });
      // 自己座位上剩下的标记 + 新角色认知覆盖要挂的全局标记
      this.$store.commit("players/update", {
        player: this.player,
        property: "reminders",
        value: (this.player.reminders || []).concat(
          identityReminders(next, this.$store.state.roles)
        )
      });
      if (groups.length) {
        this.$emit("removed", {
          index: this.index,
          playerName: this.player.name,
          roleName: oldRole.name || "",
          groups
        });
      }
      // 选完就收起来：说书人手下就一个人，面板留着只会挡住桌子
      this.$emit("close");
    }
  }
};
</script>

<style lang="scss" scoped>
.rp-panel {
  width: 900px;
  max-width: 100%;
  max-height: 84vh;
  display: flex;
  flex-direction: column;
  padding: 4px 6px 10px;
  color: #eee9dd;
  text-align: left;
}

.rp-head {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 4px 2px 10px;
  border-bottom: 1px solid rgba(201, 173, 126, 0.22);
  flex-wrap: wrap;
}
.rp-seat {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 1px solid rgba(201, 173, 126, 0.5);
  background: linear-gradient(180deg, #1c2631, #0a0f14);
  color: #ffd9a0;
  font-size: 1em;
  display: flex;
  align-items: center;
  justify-content: center;
  &.dead {
    color: #c98a8a;
    filter: grayscale(0.5);
  }
}
.rp-titles {
  flex: 1;
  min-width: 220px;
  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    text-align: left;
    font-size: 0.95em;
    letter-spacing: 1px;
  }
  p {
    margin: 4px 0 0;
    font-size: 0.66em;
    color: #a9a9a9;
  }
  .rp-dot {
    margin: 0 5px;
    opacity: 0.5;
  }
}
.rp-name-input {
  width: 130px;
  padding: 1px 6px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: #fff;
  font-family: inherit;
  font-size: 1em;
  &:hover,
  &:focus {
    border-color: rgba(201, 173, 126, 0.6);
    background: rgba(0, 0, 0, 0.35);
    outline: none;
  }
}
.rp-now {
  font-size: 0.78em;
  padding: 1px 8px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #d7d7d7;
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

.rp-quick-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  padding: 8px 2px 0;
}
.rp-quick-tip {
  font-size: 0.6em;
  color: #7d7d7d;
  letter-spacing: 0.5px;
}
.rp-mini {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 9px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.05);
  color: #cfcfcf;
  font-size: 0.64em;
  cursor: pointer;
  &:hover:not(:disabled) {
    color: #ffce8a;
  }
  &.on {
    color: #ffd9a0;
    border-color: rgba(201, 173, 126, 0.7);
    background: rgba(201, 173, 126, 0.14);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.rp-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 2px 2px;
  label {
    flex: none;
    padding-top: 4px;
    font-size: 0.66em;
    color: #c9ad7e;
    letter-spacing: 1px;
  }
  textarea {
    flex: 1;
    min-height: 42px;
    padding: 5px 8px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    background: rgba(0, 0, 0, 0.35);
    color: #e7e3d8;
    font-family: inherit;
    font-size: 0.68em;
    line-height: 1.5;
    resize: vertical;
    &:focus {
      outline: none;
      border-color: rgba(201, 173, 126, 0.6);
    }
  }
}

.rp-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  padding: 10px 2px 0;
}
.rp-search {
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
.rp-tabs {
  display: flex;
  gap: 4px;
}
.rp-tab {
  padding: 2px 10px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(255, 255, 255, 0.04);
  color: #c4c4c4;
  font-size: 0.64em;
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

.rp-count {
  margin: 8px 2px 4px;
  font-size: 0.62em;
  color: #8f8f8f;
  .rp-tip {
    margin-left: 8px;
    color: #6f6f6f;
  }
}

.rp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 10px 6px;
  overflow-y: auto;
  padding: 4px 2px 8px;
}
.rp-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 4px 2px 6px;
  border-radius: 10px;
  border: 1px solid transparent;
  background: transparent;
  cursor: pointer;
  transition: background 160ms, transform 160ms;
  &:hover {
    background: rgba(255, 206, 138, 0.08);
    transform: translateY(-2px);
  }
  &.used {
    opacity: 0.42;
  }
  &.current {
    border-color: rgba(201, 173, 126, 0.8);
    background: rgba(201, 173, 126, 0.1);
    opacity: 1;
  }
}
.rp-token {
  position: relative;
  width: clamp(52px, 8vw, 72px);
  aspect-ratio: 1 / 1;
}
.rp-used {
  position: absolute;
  right: -4px;
  bottom: -2px;
  padding: 0 5px;
  border-radius: 8px;
  background: rgba(10, 14, 18, 0.95);
  border: 1px solid rgba(201, 173, 126, 0.6);
  color: #ffd9a0;
  font-size: 9px;
  line-height: 1.5;
  white-space: nowrap;
}
.rp-card-name {
  font-size: 0.66em;
  color: #efeadf;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.rp-card-team {
  font-size: 0.55em;
  letter-spacing: 1px;
  color: #8d8d8d;
  &.townsfolk {
    color: #7fa9d6;
  }
  &.outsider {
    color: #8fb87a;
  }
  &.minion {
    color: #cf8b8b;
  }
  &.demon {
    color: #b47fe0;
  }
}
.rp-empty {
  padding: 20px 6px;
  font-size: 0.7em;
  color: #8f8f8f;
}
</style>
