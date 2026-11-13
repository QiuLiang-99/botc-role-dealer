<template>
  <Modal name="vote" @close="$emit('close')">
    <div class="vt-panel">
      <header class="vt-head">
        <div class="vt-crest"><font-awesome-icon icon="vote-yea" /></div>
        <div class="vt-titles">
          <h3>提名与投票</h3>
          <p>
            <span>存活 {{ aliveCount }} 人</span>
            <span class="vt-dot">·</span>
            <span>通过需 {{ threshold }} 票</span>
            <span class="vt-dot">·</span>
            <span :class="passed ? 'vt-ok' : 'vt-no'">
              {{ voteCount }} 票{{ passed ? "，通过" : "" }}
            </span>
          </p>
        </div>
      </header>

      <div class="vt-steps">
        <section class="vt-step">
          <h4>1. 谁提名</h4>
          <div class="vt-seats">
            <button
              v-for="(player, index) in seated"
              :key="'n1-' + player.id"
              class="vt-seat"
              :class="{
                on: nominator === index,
                dead: player.isDead,
                off: player.isDead && player.isVoteless
              }"
              :disabled="player.isDead"
              :title="
                player.isDead
                  ? `${player.name} 已死亡，死人不能再提名（只能投一次票）`
                  : player.name
              "
              @click="setNominator(index)"
            >
              <b>{{ index + 1 }}</b>
              <span>{{ player.name }}</span>
            </button>
          </div>
        </section>

        <section class="vt-step">
          <h4>2. 提名谁</h4>
          <div class="vt-seats">
            <button
              v-for="(player, index) in seated"
              :key="'n2-' + player.id"
              class="vt-seat"
              :class="{ on: nominee === index, dead: player.isDead }"
              :disabled="player.isDead"
              :title="
                player.isDead
                  ? `${player.name} 已死亡，不能被提名`
                  : player.name
              "
              @click="setNominee(index)"
            >
              <b>{{ index + 1 }}</b>
              <span>{{ player.name }}</span>
              <i class="vt-team" :class="player.role.team">{{
                teamLabel(player.role.team)
              }}</i>
            </button>
          </div>
        </section>
      </div>

      <section class="vt-voting" v-if="ready">
        <h4>
          3. 举手的人
          <small>点座位记一票，再点取消；死者只能用一次死亡票</small>
        </h4>

        <div class="vt-nomline">
          <span class="vt-blue">{{ nominatorName }}</span> 提名了
          <span class="vt-gold">{{ nomineeName }}</span>
        </div>

        <div class="vt-voters">
          <button
            v-for="(player, index) in seated"
            :key="'v-' + player.id"
            class="vt-voter"
            :class="{
              on: votes.includes(index),
              dead: player.isDead,
              spent: player.isDead && player.isVoteless && !votes.includes(index),
              ghost: player.isDead && votes.includes(index)
            }"
            :title="voterTitle(player, index)"
            @click="toggleVote(index)"
          >
            <b>{{ index + 1 }}</b>
            <span>{{ player.name }}</span>
            <i v-if="player.isDead" class="vt-mark">
              {{ votes.includes(index) ? "死亡票" : player.isVoteless ? "票已用" : "有票" }}
            </i>
          </button>
        </div>

        <div class="vt-result" :class="{ pass: passed, fail: !passed }">
          <b>{{ voteCount }}</b> / {{ threshold }} 票
          <span>{{ passed ? "达到门槛，可以处决" : `还差 ${threshold - voteCount} 票` }}</span>
        </div>

        <div class="vt-actions">
          <button class="vt-btn" :class="{ disabled: !voteCount }" @click="resetVotes">
            重新计票
          </button>
          <button class="vt-btn ghost" @click="record">
            记录结果
          </button>
          <button
            class="vt-btn danger"
            :disabled="!nomineePlayer || nomineePlayer.isDead"
            @click="execute"
          >
            <font-awesome-icon icon="skull" />
            标记处决 {{ nomineeName }}
          </button>
        </div>
      </section>

      <p class="vt-hint" v-else>
        先各点一个座位：左边是发起提名的人，右边是被提名的人。
      </p>

      <section class="vt-log" v-if="log.length">
        <h4>本局投票记录 <small>最新在上</small></h4>
        <ul>
          <li v-for="(item, i) in log" :key="'lg-' + i" :class="{ pass: item.passed }">
            <span class="vl-time">{{ item.time }}</span>
            <span class="vl-who">
              <em>{{ item.nominator }}</em> 提名 <em>{{ item.nominee }}</em>
            </span>
            <span class="vl-num">{{ item.votes }}/{{ item.threshold }}</span>
            <span class="vl-res">{{ item.passed ? "通过" : "未通过" }}</span>
          </li>
        </ul>
      </section>
    </div>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import { TEAM_CN } from "../../logic/grimoire";

export default {
  name: "VoteModal",
  components: { Modal },
  props: {
    players: { type: Array, default: () => [] },
    log: { type: Array, default: () => [] }
  },
  data() {
    return {
      nominator: -1,
      nominee: -1,
      votes: []
    };
  },
  computed: {
    /** 真正坐在桌上的人（没分配角色之前不参与投票） */
    seated() {
      return this.players;
    },
    aliveCount() {
      return this.players.filter(
        player =>
          player.role.id && !player.isDead && player.role.team !== "traveler"
      ).length;
    },
    seatedCount() {
      return this.players.filter(player => player.role.id).length;
    },
    nomineePlayer() {
      return this.nominee >= 0 ? this.players[this.nominee] : null;
    },
    nominatorPlayer() {
      return this.nominator >= 0 ? this.players[this.nominator] : null;
    },
    nominatorName() {
      return (this.nominatorPlayer && this.nominatorPlayer.name) || "—";
    },
    nomineeName() {
      return (this.nomineePlayer && this.nomineePlayer.name) || "—";
    },
    /**
     * 通过门槛，和 townsquare 的 Vote.vue 一致：
     *   普通角色 → 存活人数的一半向上取整
     *   旅行者   → 全场座位的一半向上取整（旅行者不占存活名额）
     */
    threshold() {
      if (this.nomineePlayer && this.nomineePlayer.role.team === "traveler") {
        return Math.max(1, Math.ceil(this.seatedCount / 2));
      }
      return Math.max(1, Math.ceil(this.aliveCount / 2));
    },
    voteCount() {
      return this.votes.length;
    },
    passed() {
      return this.voteCount >= this.threshold;
    },
    ready() {
      // 血染钟楼允许自己提名自己，所以这里不再排除 nominator === nominee
      return this.nominator >= 0 && this.nominee >= 0;
    }
  },
  methods: {
    teamLabel(team) {
      return TEAM_CN[team] || team;
    },
    setNominator(index) {
      this.nominator = index;
      this.votes = [];
    },
    setNominee(index) {
      this.nominee = index;
      this.votes = [];
    },
    voterTitle(player, index) {
      if (!player.role.id) return "这个座位还没有角色";
      if (player.isDead) {
        return player.isVoteless
          ? `${player.name} 的死亡票已经用过了`
          : `${player.name} 已死亡，点一下用掉他的死亡票`;
      }
      return `${player.name} 投给 ${this.nomineeName}`;
    },
    /** 记一票：死者投票要消耗死亡票，并且写进撤销历史 */
    toggleVote(index) {
      const player = this.players[index];
      if (!player || !player.role.id) return;
      const at = this.votes.indexOf(index);
      if (at >= 0) {
        this.votes.splice(at, 1);
        // 取消死人这一票，死亡票还回去
        if (player.isDead && player.isVoteless) {
          this.$root.$emit("grimoire:mark", `${player.name} 取回死亡票`);
          this.$store.commit("players/update", {
            player,
            property: "isVoteless",
            value: false
          });
        }
        return;
      }
      if (player.isDead && player.isVoteless) {
        this.$root.$emit("notify", `${player.name} 的死亡票已经用过了。`, "err");
        return;
      }
      this.votes.push(index);
      if (player.isDead) {
        this.$root.$emit("grimoire:mark", `${player.name} 用掉死亡票`);
        this.$store.commit("players/update", {
          player,
          property: "isVoteless",
          value: true
        });
        this.$root.$emit("notify", `${player.name} 用掉了这一局唯一的一票。`, "ok");
      }
    },
    resetVotes() {
      // 重新计票要把这一轮死人们用掉的票还回去
      this.votes.forEach(index => {
        const player = this.players[index];
        if (player && player.isDead && player.isVoteless) {
          this.$root.$emit("grimoire:mark", `${player.name} 取回死亡票`);
          this.$store.commit("players/update", {
            player,
            property: "isVoteless",
            value: false
          });
        }
      });
      this.votes = [];
    },
    stamp() {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    },
    record() {
      if (!this.ready) return;
      this.$emit("record", {
        time: this.stamp(),
        nominator: this.nominatorName,
        nominee: this.nomineeName,
        votes: this.voteCount,
        threshold: this.threshold,
        passed: this.passed
      });
      this.$root.$emit(
        "notify",
        `已记录：${this.nominatorName} 提名 ${this.nomineeName}，${this.voteCount}/${this.threshold} 票，${
          this.passed ? "通过" : "未通过"
        }。`,
        this.passed ? "ok" : "err"
      );
    },
    execute() {
      const player = this.nomineePlayer;
      if (!player || player.isDead) return;
      this.$root.$emit("grimoire:mark", `处决 ${player.name}`);
      this.$store.commit("players/update", {
        player,
        property: "isDead",
        value: true
      });
      this.$store.commit("players/update", {
        player,
        property: "deathBy",
        value: "exec"
      });
      // 处决之后这一轮结束，票数清零重新开始
      this.votes = [];
      this.nominator = -1;
      this.nominee = -1;
      this.$root.$emit("notify", `${player.name} 已被处决。`, "err");
    }
  }
};
</script>

<style lang="scss" scoped>
.vt-panel {
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 8px 14px;
  color: #eee9dd;
  text-align: left;
}

.vt-head {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 2px 10px;
  border-bottom: 1px solid rgba(201, 173, 126, 0.22);
}
.vt-crest {
  flex: none;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffd9a0;
  border: 1px solid rgba(201, 173, 126, 0.5);
  background: radial-gradient(circle at 38% 30%, #313a44, #10151a 74%);
}
.vt-titles {
  h3 {
    margin: 0;
    font-size: 0.95em;
    letter-spacing: 2px;
    text-align: left;
  }
  p {
    margin: 3px 0 0;
    font-size: 0.66em;
    color: #a9a49a;
    letter-spacing: 1px;
    .vt-dot {
      margin: 0 6px;
      opacity: 0.4;
    }
    .vt-ok {
      color: #7fd39a;
    }
    .vt-no {
      color: #d98a8a;
    }
  }
}

.vt-steps {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  margin-top: 12px;
  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
}
.vt-step h4,
.vt-voting h4,
.vt-log h4 {
  margin: 0 0 7px;
  font-size: 0.68em;
  font-weight: normal;
  letter-spacing: 2px;
  color: #ffce8a;
  small {
    margin-left: 6px;
    font-size: 0.85em;
    color: #8c8c8c;
    letter-spacing: 0;
  }
}
.vt-seats,
.vt-voters {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}
.vt-seat,
.vt-voter {
  position: relative;
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px 4px 5px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: linear-gradient(180deg, rgba(40, 44, 50, 0.9), rgba(12, 14, 17, 0.9));
  color: #d9d4c8;
  font-size: 0.66em;
  cursor: pointer;
  transition: all 150ms;
  b {
    width: 17px;
    height: 17px;
    flex: none;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85em;
    color: #ffd9a0;
    background: rgba(255, 206, 138, 0.12);
  }
  &:hover {
    border-color: rgba(255, 206, 138, 0.55);
  }
  &.on {
    border-color: #ffce8a;
    background: linear-gradient(180deg, rgba(94, 70, 34, 0.95), rgba(38, 26, 12, 0.95));
    color: #ffe9c4;
    box-shadow: 0 0 12px rgba(255, 190, 110, 0.3);
  }
  &.dead {
    color: #9b8f8f;
    b {
      color: #d3a3a3;
      background: rgba(200, 120, 120, 0.14);
    }
  }
  &.off,
  &.spent {
    opacity: 0.52;
    text-decoration: line-through;
    cursor: not-allowed;
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}
.vt-team {
  font-style: normal;
  font-size: 0.85em;
  padding: 0 4px;
  border-radius: 5px;
  color: #cbbfae;
  background: rgba(255, 255, 255, 0.07);
  &.outsider {
    color: #9fd3ff;
  }
  &.minion {
    color: #f0b3c0;
  }
  &.demon {
    color: #ff9b9b;
  }
  &.traveler {
    color: #d9c4ff;
  }
}

.vt-voting {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
}
.vt-nomline {
  margin-bottom: 8px;
  font-size: 0.72em;
  color: #b9b3a8;
  .vt-blue {
    color: #9fd3ff;
  }
  .vt-gold {
    color: #ffce8a;
  }
}
.vt-voter {
  &.ghost.on {
    border-color: rgba(150, 210, 255, 0.7);
    background: linear-gradient(180deg, rgba(30, 62, 82, 0.95), rgba(10, 22, 30, 0.95));
  }
  .vt-mark {
    font-style: normal;
    font-size: 0.85em;
    color: #9fb6c8;
  }
}

.vt-result {
  margin-top: 12px;
  padding: 7px 12px;
  border-radius: 10px;
  font-size: 0.72em;
  letter-spacing: 1px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.35);
  b {
    font-size: 1.3em;
    margin-right: 2px;
  }
  span {
    margin-left: 8px;
    color: #8c8c8c;
  }
  &.pass {
    border-color: rgba(120, 220, 150, 0.45);
    color: #a9edc0;
    span {
      color: #7fc99a;
    }
  }
  &.fail {
    color: #e0b0b0;
  }
}

.vt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
}
.vt-btn {
  padding: 5px 12px;
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: linear-gradient(#3a3a3a, #0d0d0d);
  color: #e6e6e6;
  font-size: 0.66em;
  letter-spacing: 1px;
  cursor: pointer;
  &:hover:not(:disabled) {
    color: #ffce8a;
    border-color: rgba(255, 206, 138, 0.6);
  }
  &.ghost {
    background: transparent;
    color: #9fd3ff;
    border-color: rgba(150, 200, 255, 0.35);
  }
  &.danger {
    background: linear-gradient(#6d1f1f, #2a0808);
    color: #ffc7c7;
    border-color: rgba(220, 100, 100, 0.45);
  }
  &.disabled,
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }
}

.vt-hint {
  margin: 14px 0 0;
  font-size: 0.66em;
  color: #8c8c8c;
}

.vt-log {
  margin-top: 18px;
  padding-top: 12px;
  border-top: 1px dashed rgba(255, 255, 255, 0.1);
  ul {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  li {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 5px 8px;
    border-radius: 7px;
    font-size: 0.64em;
    color: #b9b3a8;
    background: rgba(255, 255, 255, 0.03);
    margin-bottom: 4px;
    &.pass {
      background: rgba(80, 160, 110, 0.12);
    }
    .vl-time {
      flex: none;
      color: #7f7f7f;
      font-variant-numeric: tabular-nums;
    }
    .vl-who {
      flex: 1;
      em {
        font-style: normal;
        color: #d9d4c8;
      }
    }
    .vl-num {
      flex: none;
      color: #ffce8a;
      font-variant-numeric: tabular-nums;
    }
    .vl-res {
      flex: none;
      width: 42px;
      text-align: right;
      color: #c98a8a;
    }
    &.pass .vl-res {
      color: #7fd39a;
    }
  }
}
</style>
