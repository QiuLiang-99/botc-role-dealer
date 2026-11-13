<template>
  <Modal name="cloud" @close="$emit('close')">
    <div class="cl-panel">
      <header class="cl-head">
        <h3><font-awesome-icon icon="cloud" /> 云同步</h3>
        <p>
          把当前这局和剧本存到云端，换台设备、换个浏览器重新登录就能接着开。
          不登录也能照常用，本机存档一直是独立保存的。
        </p>
      </header>

      <!-- 账号：未登录时只有一句说明 + 一个登录按钮，不做多余表单 -->
      <section class="cl-account" :class="{ on: !!user }">
        <template v-if="user">
          <span class="cl-avatar">
            <img v-if="user.avatarUrl" :src="user.avatarUrl" alt="" />
            <b v-else>{{ initial }}</b>
          </span>
          <div class="cl-who">
            <strong>{{ displayName }}</strong>
            <em>已登录，云端数据只属于这个账号</em>
          </div>
          <button class="cl-btn ghost" :disabled="busy" @click="onSignOut">
            退出登录
          </button>
        </template>

        <template v-else>
          <div class="cl-who">
            <strong>还没登录</strong>
            <em>登录后才会把牌局上传，数据按账号隔离</em>
          </div>
          <button
            class="cl-btn primary"
            :disabled="busy || !supported"
            @click="onSignIn"
          >
            <font-awesome-icon icon="sign-in-alt" /> 使用 WorkBuddy 登录
          </button>
        </template>
      </section>

      <p class="cl-err" v-if="error">
        <font-awesome-icon icon="exclamation-triangle" /> {{ error }}
      </p>
      <p class="cl-note" v-if="note">
        <font-awesome-icon icon="check" /> {{ note }}
      </p>

      <!-- 云端牌局存档 -->
      <section class="cl-sec">
        <h4>
          <font-awesome-icon icon="bookmark" /> 牌局存档
          <small v-if="user">{{ saves.length }} 份</small>
        </h4>
        <div class="cl-row">
          <button
            class="cl-btn primary"
            :disabled="busy || !user"
            @click="onSaveGame"
          >
            <font-awesome-icon icon="cloud-upload-alt" /> 把当前这局存到云端
          </button>
          <button
            class="cl-btn ghost"
            :disabled="busy || !user"
            @click="onRefresh"
          >
            <font-awesome-icon icon="sync-alt" /> 刷新
          </button>
        </div>

        <ul class="cl-list" v-if="saves.length">
          <li v-for="row in saves" :key="row.id">
            <div class="cl-item-main">
              <b>{{ row.title }}</b>
              <em>
                {{ row.script_name || "未知剧本" }} · {{ row.player_count || "?" }}人
                · 第{{ row.night || 1 }}{{ row.is_night ? "夜" : "天" }} ·
                {{ when(row.created_at) }}
              </em>
            </div>
            <button class="cl-mini" :disabled="busy" @click="onRestoreSave(row)">
              恢复
            </button>
            <button
              class="cl-mini danger"
              :disabled="busy"
              @click="onDeleteSave(row)"
            >
              删除
            </button>
          </li>
        </ul>
        <p class="cl-empty" v-else-if="!user">登录后显示你在云端的存档。</p>
        <p class="cl-empty" v-else-if="!busy">云端还没有存档。</p>
      </section>

      <!-- 云端剧本库 -->
      <section class="cl-sec">
        <h4>
          <font-awesome-icon icon="book" /> 剧本库
          <small v-if="user">{{ scripts.length }} 份</small>
        </h4>
        <div class="cl-row">
          <button
            class="cl-btn primary"
            :disabled="busy || !user"
            @click="onSaveScript"
          >
            <font-awesome-icon icon="cloud-upload-alt" /> 把当前剧本存到云端
          </button>
        </div>

        <ul class="cl-list" v-if="scripts.length">
          <li v-for="row in scripts" :key="row.id">
            <div class="cl-item-main">
              <b>{{ row.name }}</b>
              <em>
                {{ row.author || "未知作者" }} · {{ row.role_count || "?" }} 个角色 ·
                {{ when(row.created_at) }}
              </em>
            </div>
            <button class="cl-mini" :disabled="busy" @click="onRestoreScript(row)">
              载入
            </button>
            <button
              class="cl-mini danger"
              :disabled="busy"
              @click="onDeleteScript(row)"
            >
              删除
            </button>
          </li>
        </ul>
        <p class="cl-empty" v-else-if="!user">登录后显示你在云端的剧本。</p>
        <p class="cl-empty" v-else-if="!busy">云端还没有剧本。</p>
      </section>

      <footer class="cl-foot">
        <button class="cl-btn ghost" :disabled="busy || !user" @click="onSelfTest">
          <font-awesome-icon icon="stethoscope" /> 连接自检
        </button>
        <span class="cl-tip">
          自检会写入一条临时记录、立刻读回再删掉，用来确认「写入 → 读回 → 删除」整条链路通；
          不会留下任何数据。
        </span>
      </footer>
    </div>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import { cloud } from "../../cloud";
import {
  cloudState,
  friendlyError,
  signInCloud,
  signOutCloud,
  refreshCloud,
  saveGame,
  loadSave,
  deleteSave,
  saveScript,
  loadScript,
  deleteScript,
  runAction
} from "../../cloud/state";

export default {
  name: "CloudModal",
  components: { Modal },
  props: {
    /** 由 App 提供：点「存到云端」时才取当前局面，避免每次渲染都算一遍快照 */
    makeGame: { type: Function, default: null },
    makeScript: { type: Function, default: null }
  },
  computed: {
    supported() {
      return cloudState.supported;
    },
    busy() {
      return cloudState.busy;
    },
    user() {
      return cloudState.user;
    },
    error() {
      return cloudState.error;
    },
    note() {
      return cloudState.note;
    },
    saves() {
      return cloudState.saves;
    },
    scripts() {
      return cloudState.scripts;
    },
    displayName() {
      return (this.user && this.user.name) || "我的账号";
    },
    initial() {
      const name = (this.user && this.user.name) || "";
      return name ? name.slice(0, 1) : "我";
    }
  },
  methods: {
    when(value) {
      if (!value) return "";
      const date = new Date(value);
      if (isNaN(date.getTime())) return "";
      const pad = n => String(n).padStart(2, "0");
      return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
      )} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
    },
    onSignIn() {
      signInCloud();
    },
    onSignOut() {
      signOutCloud();
    },
    onRefresh() {
      refreshCloud();
    },
    async onSaveGame() {
      if (!this.makeGame) return;
      const row = this.makeGame();
      if (!row) return;
      await runAction("已存到云端，换设备登录后可以恢复。", () =>
        saveGame(row)
      );
      await refreshCloud();
    },
    async onSaveScript() {
      if (!this.makeScript) return;
      const row = this.makeScript();
      if (!row) return;
      await runAction("剧本已存到云端。", () => saveScript(row));
      await refreshCloud();
    },
    async onRestoreSave(row) {
      const full = await runAction("", () => loadSave(row.id));
      if (!full) return;
      if (!full.payload || !Array.isArray(full.payload.seats)) {
        cloudState.error = "这份存档的数据不完整，没法恢复。";
        return;
      }
      this.$emit("restore-save", full);
    },
    async onDeleteSave(row) {
      const ok = await runAction("已从云端删除这份存档。", () =>
        deleteSave(row.id)
      );
      if (ok) await refreshCloud();
    },
    async onRestoreScript(row) {
      const full = await runAction("", () => loadScript(row.id));
      if (!full) return;
      if (!Array.isArray(full.payload)) {
        cloudState.error = "这份剧本的数据不完整，没法载入。";
        return;
      }
      this.$emit("restore-script", { meta: row, payload: full.payload });
    },
    async onDeleteScript(row) {
      const ok = await runAction("已从云端删除这份剧本。", () =>
        deleteScript(row.id)
      );
      if (ok) await refreshCloud();
    },
    /**
     * 连接自检：真的走一遍完整链路，不是只看「能不能读」。
     * 1) getUser()：会话拿去服务端校验，证明不是本地缓存糊出来的身份；
     * 2) 写入一条临时记录：证明 INSERT 通过、owner_id 被服务端填成本人；
     * 3) 按 id 读回：证明 SELECT 的 RLS 放行自己的行；
     * 4) 删除：证明 DELETE 权限正确，且不留垃圾数据。
     */
    async onSelfTest() {
      const stamp = `自检 ${new Date().toLocaleTimeString("zh-CN")}`;
      const ok = await runAction(
        "自检通过：身份有效，写入 → 读回 → 删除整条链路正常。",
        async () => {
          const { data: me, error: meError } = await cloud.auth.getUser();
          if (meError) throw meError;
          if (!me || !me.user) throw new Error("服务端没有返回登录身份。");

          const { data: created, error: insertError } = await cloud.database
            .from("botc_saves")
            .insert({
              title: stamp,
              payload: { selfTest: true, at: new Date().toISOString() }
            })
            .select("id, title, owner_id");
          if (insertError) throw insertError;
          const row = Array.isArray(created) ? created[0] : created;
          if (!row || !row.id) {
            throw new Error("写入没有返回记录，可能被行级权限挡下了。");
          }

          const { data: back, error: readError } = await cloud.database
            .from("botc_saves")
            .select("id, title")
            .eq("id", row.id)
            .maybeSingle();
          if (readError) throw readError;
          if (!back || back.id !== row.id) {
            throw new Error("刚写入的记录读不回来，行级权限配置有问题。");
          }

          const { data: removed, error: deleteError } = await cloud.database
            .from("botc_saves")
            .delete()
            .eq("id", row.id)
            .select("id");
          if (deleteError) throw deleteError;
          if (!Array.isArray(removed) || removed.length === 0) {
            throw new Error("临时记录没删掉，请到云服务里手动清理。");
          }
          return true;
        }
      );
      if (ok) await refreshCloud();
    }
  }
};
</script>

<style lang="scss" scoped>
.cl-panel {
  width: 760px;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 2px 4px 14px;
  color: #eee9dd;
  text-align: left;
}

.cl-head {
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(201, 173, 126, 0.22);
  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 0;
    font-size: 0.95em;
    letter-spacing: 3px;
    color: #ffce8a;
  }
  p {
    margin: 5px 0 0;
    font-size: 0.64em;
    line-height: 1.7;
    color: #a5a5a5;
  }
}

.cl-account {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  &.on {
    border-color: rgba(201, 173, 126, 0.35);
  }
}

.cl-avatar {
  flex: none;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #3a2c14, #150e05);
  border: 1px solid rgba(255, 206, 138, 0.4);
  color: #ffd9a0;
  font-size: 0.9em;
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.cl-who {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  strong {
    font-size: 0.76em;
    color: #fff;
  }
  em {
    font-style: normal;
    font-size: 0.6em;
    color: #8f9299;
  }
}

.cl-btn {
  flex: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.05);
  color: #e9e3d6;
  font-family: inherit;
  font-size: 0.68em;
  cursor: pointer;
  transition: color 150ms, border-color 150ms, background 150ms;
  &:hover:not(:disabled) {
    color: #fff;
    border-color: rgba(255, 206, 138, 0.7);
  }
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  &.primary {
    border-color: rgba(201, 173, 126, 0.7);
    background: linear-gradient(180deg, #3a2c14, #150e05);
    color: #ffd9a0;
  }
}

.cl-err,
.cl-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  font-size: 0.66em;
  line-height: 1.6;
}
.cl-err {
  color: #e8a1a1;
}
.cl-note {
  color: #9dc78a;
}

.cl-sec {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.28);
  h4 {
    display: flex;
    align-items: baseline;
    gap: 8px;
    margin: 0 0 8px;
    font-size: 0.72em;
    letter-spacing: 2px;
    color: #c9ad7e;
    font-family: inherit;
    small {
      font-size: 0.82em;
      letter-spacing: 0;
      color: #7f8790;
    }
  }
}

.cl-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.cl-list {
  list-style: none;
  margin: 8px 0 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
  li {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 7px 9px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
  }
}

.cl-item-main {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  b {
    font-size: 0.7em;
    color: #f2ece0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  em {
    font-style: normal;
    font-size: 0.58em;
    color: #8f9299;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.cl-mini {
  flex: none;
  padding: 4px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: transparent;
  color: #dcd6c8;
  font-family: inherit;
  font-size: 0.6em;
  cursor: pointer;
  &:hover:not(:disabled) {
    color: #fff;
    border-color: rgba(255, 206, 138, 0.7);
  }
  &.danger:hover:not(:disabled) {
    color: #ffbdbd;
    border-color: rgba(220, 120, 120, 0.8);
  }
  &:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }
}

.cl-empty {
  margin: 8px 0 0;
  font-size: 0.64em;
  color: #7d838b;
}

.cl-foot {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  padding-top: 4px;
}
.cl-tip {
  font-size: 0.58em;
  color: #7d838b;
  line-height: 1.6;
}
</style>
