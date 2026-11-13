<template>
  <Modal name="jinx" @close="$emit('close')">
    <div class="jx-panel">
      <header class="jx-head">
        <h3>相克</h3>
        <p>
          本剧本里的相克规则。相克条目在剧本 JSON 里是独立的
          <code>team: "jinx" / "a jinxed"</code> 记录，不是角色，不会出现在换角色列表里。
        </p>
      </header>

      <ul class="jx-list" v-if="list.length">
        <li class="jx-row" v-for="item in list" :key="item.id">
          <div class="jx-pair">
            <template v-for="(side, si) in item.sides">
              <span class="jx-side" :key="item.id + '-' + si">
                <!-- 角色图标：和夜序面板同一套查表，本地 icons/<id>.png 优先 -->
                <span
                  class="jx-ico"
                  v-if="side.icon"
                  :style="{ backgroundImage: `url(${side.icon})` }"
                ></span>
                <span class="jx-name">{{ side.name }}</span>
              </span>
              <span class="jx-amp" v-if="si < item.sides.length - 1">×</span>
            </template>
          </div>
          <p class="jx-text">{{ item.ability || "这条相克没有写说明。" }}</p>
        </li>
      </ul>

      <p class="jx-empty" v-else>
        当前剧本没有相克规则。导入带相克的剧本 JSON 后，这里会自动列出来。
      </p>
    </div>
  </Modal>
</template>

<script>
import Modal from "./Modal";
import { roleIconUrl } from "../../logic/roleIcon";

export default {
  name: "JinxModal",
  components: { Modal },
  computed: {
    /** 相克条目的 name 是「维齐尔&调查员」，拆成两边各自找角色和图标 */
    list() {
      const roles = Array.from(this.$store.state.roles.values());
      const byName = new Map();
      roles.forEach(role => {
        if (role && role.name) byName.set(String(role.name), role);
        if (role && role.id) byName.set(String(role.id), role);
      });
      return (this.$store.state.scriptJinxes || []).map(item => {
        const names = String(item.name || "")
          .split(/[&＆和]/)
          .map(text => text.trim())
          .filter(Boolean);
        const sides = (names.length ? names : [item.name || "?"]).map(name => {
          const role = byName.get(name);
          return { name, icon: this.iconOf(role) };
        });
        return Object.assign({}, item, { sides });
      });
    }
  },
  methods: {
    iconOf(role) {
      if (!role) return "";
      // 图标全走图床：剧本自带 image 优先，缺图退到阵营占位图
      return roleIconUrl(role);
    }
  }
};
</script>

<style lang="scss" scoped>
.jx-panel {
  width: 680px;
  max-width: 100%;
  max-height: 78vh;
  overflow-y: auto;
  padding: 4px 6px 10px;
  color: #eee9dd;
  text-align: left;
}

.jx-head {
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(201, 173, 126, 0.22);
  h3 {
    margin: 0;
    text-align: left;
    font-size: 0.95em;
    letter-spacing: 4px;
  }
  p {
    margin: 4px 0 0;
    font-size: 0.64em;
    line-height: 1.6;
    color: #a5a5a5;
    code {
      padding: 0 3px;
      border-radius: 3px;
      color: #ffce8a;
      background: rgba(255, 206, 138, 0.12);
    }
  }
}

.jx-list {
  list-style: none;
  margin: 10px 0 0;
  padding: 0;
}

.jx-row {
  padding: 9px 12px;
  margin-bottom: 8px;
  border-radius: 10px;
  border: 1px solid rgba(201, 173, 126, 0.22);
  background: rgba(255, 255, 255, 0.035);
  &:last-child {
    margin-bottom: 0;
  }
  .jx-pair {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }
  .jx-side {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  /* 最左边那张角色图标 */
  .jx-ico {
    width: 40px;
    height: 26px;
    border-radius: 4px;
    background-size: cover;
    background-position: center;
    background-repeat: no-repeat;
    border: 1px solid rgba(255, 255, 255, 0.14);
    background-color: rgba(0, 0, 0, 0.35);
    flex: none;
  }
  .jx-amp {
    color: #8d8d8d;
    font-size: 0.7em;
  }
  .jx-name {
    font-size: 0.8em;
    letter-spacing: 1px;
    color: #ffd9a0;
  }
  .jx-text {
    margin: 5px 0 0;
    font-size: 0.68em;
    line-height: 1.6;
    color: #cfc7b8;
  }
}

.jx-empty {
  padding: 20px 4px;
  font-size: 0.7em;
  color: #8f8f8f;
}
</style>
