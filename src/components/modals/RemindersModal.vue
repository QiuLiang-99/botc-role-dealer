<template>
  <Modal name="reminder" @close="$emit('close')">
    <div class="rm-panel" v-if="player">
      <header class="rm-head">
        <div class="rm-seat" :class="{ dead: player.isDead }">
          {{ seatLabel }}
        </div>
        <div class="rm-titles">
          <h3>放置提示标记</h3>
          <p>
            <span class="rm-role">{{ roleName }}</span>
            <span class="rm-dot">·</span>
            <span class="rm-count">已放 {{ own.length }} 个</span>
            <template v-if="coverName">
              <span class="rm-dot">·</span>
              <span class="rm-cover">牌面是伪装牌，真实身份「{{ coverName }}」</span>
            </template>
          </p>
        </div>
      </header>

      <div class="rm-current" v-if="own.length">
        <span class="rm-cap">已放置</span>
        <div
          class="rm-on"
          v-for="(item, index) in own"
          :key="'on-' + index"
          :class="{ reversed: item.reversed }"
        >
          <button
            class="rm-on-name"
            :title="item.reversed ? `恢复「${item.name}」的方向` : `翻转「${item.name}」（表示相反 / 已用）`"
            @click="flipAt(index)"
          >
            <span>{{ item.name }}</span>
            <i v-if="item.reversed" class="rm-rev">↻</i>
          </button>
          <button class="rm-on-del" :title="`移除「${item.name}」`" @click="removeAt(index)">
            ×
          </button>
        </div>
      </div>
      <p class="rm-empty" v-else>
        还没有标记。下面点一个就放到这个座位上，面板会自动收起。
      </p>

      <section
        class="rm-group"
        v-for="group in groups"
        :key="group.key"
      >
        <h4>
          {{ group.title }}
          <small v-if="group.hint">{{ group.hint }}</small>
        </h4>
        <div class="rm-grid">
          <button
            v-for="item in group.items"
            :key="group.key + item.key"
            class="rm-token"
            :class="{ on: isOn(item), [item.kind || 'plain']: !!item.kind }"
            :title="isOn(item) ? `移除「${item.name}」` : `放置「${item.name}」`"
            @click="toggle(item)"
          >
            <span
              class="rm-ico"
              v-if="item.image"
              :style="{ backgroundImage: `url(${item.image})` }"
            ></span>
            <span class="rm-text">{{ item.name }}</span>
            <!-- 「死亡」这种标记好几个角色都有，同名时标出来源，免得点错 -->
            <span class="rm-from" v-if="dupNames.has(item.name) && item.roleName">
              {{ item.roleName }}
            </span>
            <span class="rm-tick" v-if="isOn(item)">✓</span>
          </button>
        </div>
      </section>

      <section class="rm-group">
        <h4>自定义 <small>不在剧本里的标记</small></h4>
        <div class="rm-custom">
          <input
            v-model="custom"
            maxlength="8"
            placeholder="例如：被保护、已猜测"
            @keyup.enter="addCustom"
          />
          <button class="rm-add" :class="{ disabled: !custom.trim() }" @click="addCustom">
            添加
          </button>
        </div>
      </section>
    </div>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import {
  buildReminderGroups,
  hasReminder,
  reminderKey
} from "../../logic/reminders";

/** 一个座位最多挂多少个提示标记（和参考魔典一致） */
const MAX_REMINDERS = 20;

// 通用标记「善良 / 邪恶 / 外来者 / 爪牙」的阵营拇指图：
// 源码是 require(`assets/icons/${role}.png`)，这四张是界面素材（拇指标志），
// 图床上对应文件是小丑面具、不是拇指，所以留在本地随构建打包
import goodIcon from "../../assets/good.png";
import evilIcon from "../../assets/evil.png";
import outsiderIcon from "../../assets/outsider.png";
import minionIcon from "../../assets/minion.png";

const GENERIC_ICONS = {
  good: goodIcon,
  evil: evilIcon,
  outsider: outsiderIcon,
  minion: minionIcon
};
const iconOf = id => GENERIC_ICONS[id] || "";

export default {
  name: "RemindersModal",
  components: { Modal },
  props: {
    // 正在编辑的座位（store 里的玩家对象引用）
    player: {
      type: Object,
      default: null
    },
    players: {
      type: Array,
      default: () => []
    },
    index: {
      type: Number,
      default: -1
    }
  },
  data() {
    return { custom: "" };
  },
  computed: {
    own() {
      return (this.player && this.player.reminders) || [];
    },
    roleName() {
      const role = this.player && this.player.role;
      return (role && role.name) || "未分配角色";
    },
    coverName() {
      const role = this.player && this.player.role;
      return (role && role.coverOf && role.coverOf.name) || "";
    },
    seatLabel() {
      const name = (this.player && this.player.name) || "";
      return name || this.index + 1 + "号";
    },
    groups() {
      if (!this.player) return [];
      const role = this.player.role || {};
      // 源码 availableReminders 遍历的是 $store.state.roles（剧本全集）
      const allRoles = [...this.$store.state.roles.values()];
      const bluffs = this.$store.state.players.bluffs || [];
      // 源码 `players.fabled.forEach`：传奇角色入场后，它的标记也要能用。
      // 我们的 players.fabled 存的是角色 id（源码存对象），按 id 取回角色定义
      const fabled = (this.$store.state.players.fabled || [])
        .map(id => this.$store.state.fabled.get(String(id)))
        .filter(Boolean);
      return buildReminderGroups(this.players, role.id, allRoles, bluffs, fabled, {
        good: iconOf("good"),
        evil: iconOf("evil")
      });
    },
    /** 面板里重名的标记（「死亡」等），只有这些需要在圆片上标来源角色 */
    dupNames() {
      const count = new Map();
      this.groups.forEach(group =>
        group.items.forEach(item => {
          count.set(item.name, (count.get(item.name) || 0) + 1);
        })
      );
      return new Set(
        [...count.entries()].filter(([, n]) => n > 1).map(([name]) => name)
      );
    }
  },
  methods: {
    isOn(item) {
      return !!this.player && hasReminder(this.player, item);
    },
    write(list, label) {
      if (label) this.$root.$emit("grimoire:mark", label);
      this.$store.commit("players/update", {
        player: this.player,
        property: "reminders",
        value: list
      });
      // 说书人版标记：不含自定义，换设备/复盘时也能还原
      this.$store.commit("players/update", {
        player: this.player,
        property: "stReminders",
        value: list.filter(item => item.role !== "custom")
      });
    },
    toggle(item) {
      const list = [...this.own];
      const key = reminderKey(item);
      const at = list.findIndex(exist => reminderKey(exist) === key);
      if (at >= 0) {
        list.splice(at, 1);
      } else {
        // 一个座位挂 20 个以上就分不清了，和参考魔典一样设个上限
        if (list.length >= MAX_REMINDERS) {
          this.$root.$emit(
            "notify",
            `这个座位已经有 ${MAX_REMINDERS} 个标记了，先移除几个。`,
            "err"
          );
          return;
        }
        list.push({
          role: item.role,
          name: item.name,
          image: item.image || "",
          imageAlt: item.imageAlt || ""
        });
      }
      this.write(
        list,
        `${this.player.name} ${at >= 0 ? "移除" : "放置"}标记「${item.name}」`
      );
      // 圆片在桌上比较小，放完给一句明确回执：放到谁身上了、放的是什么
      this.$root.$emit(
        "notify",
        at >= 0
          ? `已从「${this.seatLabel}」移除「${item.name}」`
          : `已把「${item.name}」放到「${this.seatLabel}」`,
        "ok"
      );
      // 放完就收起面板：说书人是一次放一个，留着面板只会挡住桌子
      this.$emit("close");
    },
    /** 翻转：纸质魔典里把标记翻过来就是「相反 / 已用」，这里用 reversed 记 */
    flipAt(index) {
      const list = this.own.map(item => Object.assign({}, item));
      const item = list[index];
      if (!item) return;
      if (item.reversed) this.$delete(item, "reversed");
      else item.reversed = true;
      this.write(
        list,
        `${this.player.name} ${item.reversed ? "翻转" : "恢复"}标记「${item.name}」`
      );
    },
    removeAt(index) {
      const list = [...this.own];
      const [gone] = list.splice(index, 1);
      this.write(list, `${this.player.name} 移除标记「${(gone && gone.name) || ""}」`);
    },
    addCustom() {
      const name = this.custom.trim();
      if (!name) return;
      const list = [...this.own];
      if (list.length >= MAX_REMINDERS) {
        this.$root.$emit(
          "notify",
          `这个座位已经有 ${MAX_REMINDERS} 个标记了，先移除几个。`,
          "err"
        );
        return;
      }
      if (!list.some(item => item.name === name)) {
        list.push({ role: "custom", name });
        this.write(list, `${this.player.name} 添加自定义标记「${name}」`);
      }
      this.custom = "";
      this.$emit("close");
    }
  }
};
</script>

<style lang="scss" scoped>
/* 深色石板 + 金色 chrome，取自在线魔典的视觉语言：
   #1e2934 底 / #c9ad7e 金边 / #eee9dd 米白字 */
.rm-panel {
  /*
   * 圆片尺寸只有一个来源，电脑和手机同一套：clamp 跟着视口宽自己收放。
   * 以前 88px + 640px 断点里再写 58px，等于两套 UI；现在只留这一条，
   * 宽屏自动排更多列、窄屏自动变窄，谁也不用滚动才能看全。
   */
  --rm-token: clamp(54px, 5.2vw, 74px);
  /* 宽度给固定值 + max-width，由 Modal 的 max-width 去收：
     写 92vw 会算到弹窗内边距之外，手机上多出几像素横向滚动条（能往右拖但什么都没有） */
  width: 100%;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 4px 6px 8px;
  color: #eee9dd;
  text-align: left;
}

.rm-head {
  display: flex;
  align-items: center;
  gap: 14px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(201, 173, 126, 0.24);

  .rm-seat {
    flex: none;
    min-width: 62px;
    padding: 8px 10px;
    border-radius: 10px;
    background: linear-gradient(180deg, #2a323c, #151a20);
    border: 1px solid rgba(201, 173, 126, 0.45);
    color: #e7d2ab;
    font-size: 0.86em;
    letter-spacing: 1px;
    text-align: center;
    box-shadow: inset 0 1px rgba(255, 255, 255, 0.06);
    &.dead {
      color: #b9747a;
      border-color: rgba(185, 116, 122, 0.55);
      text-decoration: line-through;
    }
  }

  .rm-titles {
    min-width: 0;
    h3 {
      text-align: left;
      font-size: 1em;
      letter-spacing: 2px;
      color: #f5efe1;
    }
    p {
      margin: 3px 0 0;
      font-size: 0.66em;
      color: #9aa3ad;
      letter-spacing: 0.5px;
      .rm-role {
        color: #ffce8a;
      }
      .rm-dot {
        margin: 0 6px;
        opacity: 0.5;
      }
      .rm-cover {
        color: #d8a05f;
      }
    }
  }
}

.rm-current {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin: 12px 0 4px;

  .rm-cap {
    font-size: 0.62em;
    letter-spacing: 2px;
    color: #8d949c;
  }

  .rm-on {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    padding: 1px 4px 1px 1px;
    border-radius: 999px;
    border: 1px solid rgba(201, 173, 126, 0.6);
    background: rgba(201, 173, 126, 0.14);
    color: #ffe0ad;
    font-size: 0.68em;
    transition: all 160ms;

    .rm-on-name {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border: none;
      border-radius: 999px;
      background: transparent;
      color: inherit;
      font-family: inherit;
      font-size: 1em;
      cursor: pointer;
      &:hover {
        background: rgba(255, 206, 138, 0.18);
        color: #fff;
      }
    }

    .rm-on-del {
      width: 18px;
      height: 18px;
      border: none;
      border-radius: 50%;
      background: transparent;
      color: #d8a3a3;
      cursor: pointer;
      line-height: 1;
      font-size: 1em;
      &:hover {
        background: rgba(200, 60, 60, 0.35);
        color: #fff;
      }
    }

    .rm-rev {
      font-style: normal;
      font-size: 0.85em;
      color: #9fd3ff;
    }

    /* 翻转过的标记：整块变冷色 + 虚线边，一眼看出「状态相反」 */
    &.reversed {
      border-style: dashed;
      border-color: rgba(120, 170, 220, 0.7);
      background: rgba(90, 140, 200, 0.16);
      color: #bcd9f5;
    }

    i {
      font-style: normal;
      opacity: 0.65;
    }
  }
}

.rm-empty {
  margin: 12px 0 2px;
  font-size: 0.64em;
  color: #7f8790;
  letter-spacing: 0.5px;
}

.rm-group {
  margin-top: 10px;

  h4 {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin: 0 0 5px;
    text-align: left;
    font-size: 0.7em;
    letter-spacing: 2px;
    color: #c9ad7e;
    font-family: inherit;
    small {
      font-size: 0.82em;
      letter-spacing: 0;
      color: #7f8790;
      font-family: inherit;
    }
  }
}

.rm-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--rm-token), 1fr));
  gap: 7px;
  margin-top: 6px;
}

/* 一枚纸质圆牌：底图和源码一样用 assets/reminder.png，不是自己画的渐变 */
.rm-token {
  position: relative;
  aspect-ratio: 1 / 1;
  padding: 5px;
  border-radius: 50%;
  border: 2px solid #2a1c0e;
  background: url("../../assets/reminder.png") center center;
  background-size: 100%;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.55);
  color: #3a2a18;
  cursor: pointer;
  overflow: hidden;
  transition: transform 160ms, box-shadow 160ms, filter 160ms;
  filter: saturate(0.9);

  &:hover {
    transform: translateY(-2px) scale(1.03);
    filter: saturate(1);
    box-shadow: 0 6px 14px rgba(0, 0, 0, 0.6);
  }

  .rm-ico {
    position: absolute;
    inset: 3%;
    border-radius: 50%;
    background-size: 104%;
    background-position: center 20%;
    background-repeat: no-repeat;
    opacity: 1;
  }

  .rm-text {
    position: relative;
    display: block;
    font-size: calc(var(--rm-token) * 0.155);
    font-weight: bold;
    line-height: 1.15;
    letter-spacing: 0.5px;
    word-break: break-all;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.55);
  }

  /* 同名标记（死亡 / 中毒…）在圆片顶部标出来源角色 */
  .rm-from {
    position: absolute;
    z-index: 2;
    left: 50%;
    top: 4%;
    transform: translateX(-50%);
    max-width: 86%;
    padding: 0 5px;
    border-radius: 999px;
    background: rgba(38, 25, 12, 0.78);
    color: #ffe6bb;
    font-size: calc(var(--rm-token) * 0.115);
    line-height: 1.5;
    letter-spacing: 0.5px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  /* 有图标时文字写在圆片下方，和纸质标记一样压在图的下缘 */
  .rm-ico + .rm-text {
    position: absolute;
    left: 50%;
    bottom: 7%;
    transform: translateX(-50%);
    width: 88%;
    padding: 0;
    border-radius: 0;
    background: none;
    color: #2f2110;
    font-size: calc(var(--rm-token) * 0.14);
    line-height: 1.05;
    text-shadow: 0 1px 0 rgba(255, 255, 255, 0.7),
      0 -1px 0 rgba(255, 255, 255, 0.5);
  }

  .rm-tick {
    position: absolute;
    right: 0;
    top: 0;
    width: calc(var(--rm-token) * 0.17);
    height: calc(var(--rm-token) * 0.17);
    border-radius: 50%;
    background: #d8a94f;
    border: 1px solid #2a1c0e;
    color: #2a1c0e;
    font-size: 0;
    box-shadow: 0 0 6px rgba(216, 169, 79, 0.8);
  }

  &.on {
    border-color: #ffd58f;
    box-shadow: 0 0 0 3px #ffce8a, 0 0 14px rgba(255, 200, 120, 0.55),
      inset 0 0 12px rgba(90, 66, 34, 0.4), 0 4px 12px rgba(0, 0, 0, 0.6);
    filter: none;
    transform: translateY(-2px);
  }

  &.poison {
    background: radial-gradient(circle at 38% 30%, #e6f3d6, #b8d69a 60%, #8fae74 100%);
  }
  &.drunk {
    background: radial-gradient(circle at 38% 30%, #f6e6cf, #e0c09a 60%, #c39d72 100%);
  }
  &.safe {
    background: radial-gradient(circle at 38% 30%, #dceaf7, #a8c8e2 60%, #7fa3c0 100%);
  }
  &.good {
    background: radial-gradient(circle at 38% 30%, #efe9d2, #d3c79f 60%, #b0a47c 100%);
  }
  &.evil {
    background: radial-gradient(circle at 38% 30%, #e8d0d2, #c78f95 60%, #a06a70 100%);
  }
}

.rm-custom {
  display: flex;
  gap: 8px;
  margin-top: 8px;

  input {
    flex: 1;
    min-width: 0;
    padding: 7px 12px;
    border-radius: 8px;
    border: 1px solid rgba(201, 173, 126, 0.35);
    background: rgba(0, 0, 0, 0.4);
    color: #eee9dd;
    font-size: 0.75em;
    outline: none;
    &::placeholder {
      color: #6d757e;
    }
    &:focus {
      border-color: rgba(201, 173, 126, 0.7);
    }
  }

  .rm-add {
    flex: none;
    padding: 0 16px;
    border-radius: 8px;
    border: 1px solid rgba(201, 173, 126, 0.55);
    background: linear-gradient(#3a4450, #1b2229);
    color: #ffd9a0;
    font-size: 0.75em;
    cursor: pointer;
    &:hover {
      color: #fff;
    }
    &.disabled {
      opacity: 0.4;
      cursor: default;
    }
  }
}

/*
 * 这里以前有一整段 @media (max-width:640px)：面板贴满、5 列、字号再收一档。
 * 那是「手机一套、电脑一套」，两边行为对不上。现在全部交给上面那套规则：
 * 圆片宽度 clamp(54px,5.2vw,74px)、网格 auto-fill、字号按 --rm-token 算，
 * 宽屏自然多列、窄屏自然少列，没有任何断点。
 */
</style>
