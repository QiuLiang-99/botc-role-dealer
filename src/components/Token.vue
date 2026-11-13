<template>
  <div class="token" @click="setRole" :class="[role.id, { 'has-setup': role.setup }]" 
  :style="tokenBackground"
  >
    <span class="icon" v-if="role.id" :style="iconStyle"></span>
    <span
      class="leaf-left"
      v-if="role.firstNight || role.firstNightReminder"
    ></span>
    <span
      class="leaf-right"
      v-if="role.otherNight || role.otherNightReminder"
    ></span>
    <span v-if="reminderLeaves" :class="['leaf-top' + reminderLeaves]"></span>
    <span class="leaf-orange" v-if="role.setup"></span>
    <svg v-if="showName" viewBox="0 0 150 150" class="name">
      <path
        d="M 13 75 C 13 160, 138 160, 138 75"
        id="curve"
        fill="transparent"
      />
      <text
        width="150"
        x="66.6%"
        text-anchor="middle"
        class="label mozilla"
        :font-size="role.name | nameToFontSize"
      >
        <textPath xlink:href="#curve">
          {{ role.name }}
        </textPath>
      </text>
    </svg>
    <div class="edition" :class="[`edition-${role.edition}`, role.team]"></div>
    <!-- 右上角角标：认知覆盖的伪装牌图标 + 设置调整带来的调整量 -->
    <div class="corner" v-if="showCorner && ((role.coverOf && showCover) || tag)">
      <div
        class="cover"
        v-if="role.coverOf && showCover"
        :style="coverStyle"
        :title="coverTitle"
      ><template v-if="!role.coverOf.image">{{ coverInitial }}</template></div>
      <div class="tag" v-if="tag" :title="tagTitle || `该角色带来的设置调整：${tag}`">{{ tag }}</div>
    </div>
    <div class="ability" v-if="role.ability">
      {{ role.ability }}
    </div>
  </div>
</template>

<script>
import { mapState } from "vuex";
import tokenImage from "../assets/token.png";
import { roleIconUrl } from "../logic/roleIcon";

export default {
  name: "Token",
  props: {
    role: {
      type: Object,
      default: () => ({})
    },
    id: {
      type: String,
      default: ""
    },
    image: {
      type: String,
      default: ""
    },
    // 设置调整小字（只在配置界面传入）：这个角色带来了什么调整
    tag: {
      type: String,
      default: ""
    },
    // 小字的悬停说明：取值范围、为什么取这个值
    tagTitle: {
      type: String,
      default: ""
    },
    /**
     * 是否显示右上角角标（伪装牌图标 / 设置调整小字）。
     * 配置界面和魔典要显示；盲抽是给玩家看的，必须关掉，否则等于把
     * 「这张牌其实是某个角色的伪装」直接写在他眼前。
     */
    showCorner: {
      type: Boolean,
      default: true
    },
    /**
     * 是否画「认知覆盖」的伪装牌小图标。
     * 和 showCorner 分开，是因为两个界面需求不同：
     *   配置界面 → 要看见「这张牌其实是酒鬼」，方便说书人配比；
     *   魔典     → 不要，牌上挂一枚小图标等于把真实身份写在桌上，
     *              魔典只靠「是酒鬼」这个标记来表达。
     * 魔典传 false，配置界面用默认 true，两边互不影响。
     */
    showCover: {
      type: Boolean,
      default: true
    },
    /**
     * 是否画牌上的弧形名字。
     * 传奇面板这类「一屏几十张牌」的场合关掉，名字改成悬停显示，避免糊成一片。
     */
    showName: {
      type: Boolean,
      default: true
    }
  },
  computed: {
    coverStyle() {
      const cover = this.role.coverOf;
      return cover && cover.image ? { backgroundImage: `url(${cover.image})` } : {};
    },
    coverInitial() {
      const cover = this.role.coverOf;
      return cover && cover.name ? cover.name.slice(0, 1) : "?";
    },
    coverTitle() {
      const cover = this.role.coverOf;
      if (!cover) return "";
      return `这张牌的牌面是「${this.role.name}」：抽到它的人其实是「${cover.name}」，他会以为自己就是${this.role.name}。`;
    },
    reminderLeaves: function() {
      return (
        (this.role.reminders || []).length +
        (this.role.remindersGlobal || []).length
      );
    },
    tokenBackground() {
      return (!!this.id && !!this.image) ? {} : {backgroundImage: `url(${tokenImage})`}
    },
    /*
     * 图标解析顺序收在 logic/roleIcon.js 里（剧本图片 → 阵营占位图，全部走图床）。
     * 这里只保留「用插画」这个开关：关掉它就不返回图片地址，纯文字占位。
     * 以前是 imageAlt 优先，自定义剧本会被塞 good.png（蓝色大拇指），
     * 关掉「用插画」时整桌都是大拇指。
     */
    iconStyle() {
      const url = roleIconUrl(this.role, {
        allowRemote: this.grimoire.isImageOptIn
      });
      return url ? { backgroundImage: `url(${url})` } : {};
    },
    ...mapState(["grimoire"])
  },
  data() {
    return {};
  },
  filters: {
    nameToFontSize: name => (name && name.length > 10 ? "90%" : "110%")
  },
  methods: {
    setRole() {
      this.$emit("set-role");
    }
  }
};
</script>

<style scoped lang="scss">

.token {
  border-radius: 50%;
  width: 100%;
  /* 牌永远是正圆：浮层都绝对定位，高度不能靠内容撑 */
  aspect-ratio: 1 / 1;
  position: relative;
  // background: url("../assets/token.png") center center;
  background-size: 100%;
  text-align: center;
  border: 3px solid black;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: border-color 250ms;

  &:hover .name .label {
    stroke: black;
    fill: white;
    @-moz-document url-prefix() {
      &.mozilla {
        stroke: none;
        filter: drop-shadow(0 1.5px 0 black) drop-shadow(0 -1.5px 0 black)
          drop-shadow(1.5px 0 0 black) drop-shadow(-1.5px 0 0 black)
          drop-shadow(0 2px 2px rgba(0, 0, 0, 0.5));
      }
    }
  }

  .icon,
  &:before {
    background-size: 100%;
    background-repeat: no-repeat;
    background-position: center 30%;
    border-radius: 50%;
    position: absolute;
    width: 100%;
    height: 100%;
    margin-top: 3%;
  }

  span {
    position: absolute;
    width: 100%;
    height: 100%;
    background-size: 100%;
    pointer-events: none;

    &.leaf-left {
      background-image: url("../assets/leaf-left.png");
    }

    &.leaf-orange {
      background-image: url("../assets/leaf-orange.png");
    }

    &.leaf-right {
      background-image: url("../assets/leaf-right.png");
    }

    &.leaf-top1 {
      background-image: url("../assets/leaf-top1.png");
    }

    &.leaf-top2 {
      background-image: url("../assets/leaf-top2.png");
    }

    &.leaf-top3 {
      background-image: url("../assets/leaf-top3.png");
    }

    &.leaf-top4 {
      background-image: url("../assets/leaf-top4.png");
    }

    &.leaf-top5 {
      background-image: url("../assets/leaf-top5.png");
    }
  }

  .name {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    font-size: 24px; // svg fonts are relative to document font size
    .label {
      fill: black;
      stroke: white;
      stroke-width: 2px;
      paint-order: stroke;
      font-family: "Papyrus", serif;
      font-weight: bold;
      text-shadow: 0 2px 2px rgba(0, 0, 0, 0.2);
      letter-spacing: 1px;

      @-moz-document url-prefix() {
        &.mozilla {
          // Vue doesn't support scoped media queries, so we have to use a second css class
          stroke: none;
          text-shadow: none;
          filter: drop-shadow(0 1.5px 0 white) drop-shadow(0 -1.5px 0 white)
            drop-shadow(1.5px 0 0 white) drop-shadow(-1.5px 0 0 white)
            drop-shadow(0 2px 2px rgba(0, 0, 0, 0.5));
        }
      }
    }
  }

  .edition {
    position: absolute;
    right: 0;
    bottom: 5px;
    width: 30px;
    height: 30px;
    background-size: 100%;
    display: none;
  }

  .corner {
    position: absolute;
    top: -8px;
    right: -8px;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 3px;
    z-index: 8;
    pointer-events: none;

    // 带设置调整的角色右上角还有红色警告三角，角标整体左移给它让位
    .has-setup & {
      right: 22px;
    }

    // 认知覆盖的伪装牌角标：尺寸跟着圆牌走，小牌也有 24px 保底，外圈金环保证在
    // 深色纸牌上也一眼可见
    .cover {
      width: 46%;
      min-width: 24px;
      max-width: 46px;
      aspect-ratio: 1 / 1;
      border-radius: 50%;
      border: 2px solid #1b1206;
      background-color: #2b1f10;
      background-size: cover;
      background-position: center 28%;
      background-repeat: no-repeat;
      box-shadow: 0 0 0 2px #ffcf8a, 0 0 0 3.5px #1b1206,
        0 2px 6px rgba(0, 0, 0, 0.85);
      color: #ffd79a;
      font-size: 13px;
      font-weight: bold;
      line-height: 1;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .tag {
      max-width: 112px;
      padding: 1px 5px;
      border-radius: 6px;
      background: rgba(0, 0, 0, 0.82);
      border: 1px solid rgba(255, 175, 80, 0.6);
      color: #ffcf8a;
      font-size: 10px;
      font-weight: bold;
      line-height: 1.25;
      text-align: right;
      word-break: break-all;
    }
  }

  .ability {
    display: flex;
    position: absolute;
    padding: 5px 10px;
    left: 120%;
    width: 250px;
    z-index: 25;
    font-size: 80%;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 10px;
    border: 3px solid black;
    filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
    text-align: left;
    justify-items: center;
    align-content: center;
    align-items: center;
    pointer-events: none;
    opacity: 0;
    transition: opacity 200ms ease-in-out;

    &:before {
      content: " ";
      border: 10px solid transparent;
      width: 0;
      height: 0;
      border-right-color: black;
      position: absolute;
      margin-right: 2px;
      right: 100%;
    }
  }

  &:hover .ability {
    opacity: 1;
  }
}
</style>
