<template>
  <transition name="modal-fade">
    <div class="modal-backdrop" @click="closeCheck">
      <div
        class="modal"
        :class="{ maximized: isMaximized, [name]: true }"
        role="dialog"
        aria-labelledby="modalTitle"
        aria-describedby="modalDescription"
        @click.stop=""
      >
        <div class="top-right-buttons" v-if="name != 'input'">
          <!-- 面板自己的功能按钮走这个插槽，排在「最大化 / 关闭」左边，
               这样永远不会和窗口按钮叠在一起 -->
          <div class="tr-tools">
            <slot name="tools"></slot>
          </div>
          <font-awesome-icon
            @click="isMaximized = !isMaximized"
            class="top-right-button"
            :icon="['fas', isMaximized ? 'window-minimize' : 'window-maximize']"
          />
          <font-awesome-icon
            @click="close"
            class="top-right-button"
            icon="times-circle"
          />
        </div>
        <div class="slot">
          <slot></slot>
        </div>
      </div>
    </div>
  </transition>
</template>

<script>
export default {
  props: {
    name: {
      type: String,
      default: ""
    },
    type: {
      type: String,
      default: ""
    }
  },
  data: function() {
    return {
      isMaximized: false
    };
  },
  methods: {
    close() {
      this.$emit("close");
    },
    closeCheck() {
      // 输入时点击背景不关闭
      if (this.name === "input" && this.type === "input") return;
      this.close();
    }
  }
};
</script>

<style lang="scss">

/* width */
::-webkit-scrollbar {
  width: 5px;
}
/* Handle */
::-webkit-scrollbar-thumb {
  background: rgb(54, 54, 54); 
  border-radius: 10px;
}

/* Handle on hover */
::-webkit-scrollbar-thumb:hover {
  background: rgb(97, 97, 97); 
}

.modal-backdrop {
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  right: 0;
  /* 0.3 太透：面板后面那张魔典背景图会透上来，卡片上的小字几乎看不清 */
  background-color: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
  display: flex;
  justify-content: center;
  align-items: center;
  /*
   * 上下各留 6% 的呼吸空间：
   * flex 居中本来就在正中，但如果窗口高度几乎等于视口高度，
   * 上面只剩几像素，「居中」看起来就是「贴顶」。这里把可视区先收进来，
   * 窗口再高也不会顶到屏幕边缘。
   */
  padding: 6vh 0;
  padding: 6dvh 0;
  box-sizing: border-box;
  z-index: 100;
}

.modal {
  /* 面板本身要接近不透明，读的是一张牌的名字与能力，不是背景图 */
  background: linear-gradient(180deg, rgba(20, 17, 13, 0.97), rgba(6, 6, 6, 0.985));
  border: 1px solid rgba(201, 173, 126, 0.16);
  padding: 10px 20px;
  border-radius: 10px;
  box-shadow: 2px 2px 20px 1px #000;
  display: flex;
  flex-direction: column;
  /*
   * 固定外框：以前窗口是「内容撑多大就多大」，点掉一行、切换一个标签，
   * 窗口宽高立刻跟着变，居中的位置也跟着跳，看着就是整窗在抖。
   * 这里把尺寸锁死，内容多少都装在这个框里，多的部分在框内滚动。
   */
  width: min(94vw, 940px);
  /*
   * 高度上限是「视口 − 上下各 6%」而不是 92vh：
   * 92vh 只剩 4% 的边距（900 高的屏幕才 36px），看起来就是贴顶。
   * 用 dvh 是因为手机上浏览器工具栏收起时 100vh 比可视高度还大，
   * 按 vh 算出来的窗口会被顶出屏幕下沿，上边自然就贴到顶上去了。
   */
  height: min(88vh, 860px);
  height: min(88dvh, 860px);
  max-width: 94vw;
  max-height: 88vh;
  max-height: 88dvh;
  overflow: hidden;

  /* 内容静态的小面板（相克 / 传奇 / 伪装 / 设置 / 输入框）保持自适应，
     它们不会在窗口里少东西，没有抖动问题，固定成大窗口反而空一大片 */
  &.input,
  &.jinx,
  &.fabled,
  &.bluffs,
  &.settings,
  /* 盲抽：牌数决定牌子块多大，窗口跟着收紧 —— 这里不需要防抖 */
  &.draw {
    width: auto;
    height: auto;
    max-width: 94vw;
    max-height: 88vh;
    max-height: 88dvh;
  }

  /* 会随点击增减内容的窗口：各自锁一个固定尺寸 */
  &.vote {
    width: min(94vw, 800px);
    height: min(90vh, 460px);
  }
  &.role-picker {
    width: min(94vw, 900px);
    height: min(90vh, 760px);
  }

  &.input {
    margin-top: -18vh;
  }

  .vote-history &,
  .night-reference &,
  .characters & {
    overflow-y: auto;
  }

  .roles &,
  .characters & {
    max-height: 100%;
    // max-width: 60%;
  }

  ul {
    list-style-type: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    align-content: center;
    align-items: center;
    justify-content: center;
    line-height: 100%;
    max-width: 95%;
  }

  > .top-right-buttons {
    position: absolute;
    z-index: 100;
    top: 15px;
    right: 20px;
    display: flex;
    align-items: center;
    gap: 16px;
    > .tr-tools {
      position: relative;
      padding-right: 16px;
      /* 和窗口按钮画一条竖线分开，避免两个按钮看起来粘在一起 */
      &:after {
        content: "";
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        width: 1px;
        height: 18px;
        background: rgba(255, 255, 255, 0.18);
      }
      display: flex;
      align-items: center;
      gap: 8px;
      /* 功能按钮自带按钮外观，这里只负责排在同一行 */
      white-space: nowrap;
    }
    > .top-right-button {
      cursor: pointer;
      width: 28px;
      &:hover {
        color: red;
      }
    }
  }

  > .slot {
    flex: 1;
    min-height: 0;
    max-height: 100%;
    position: initial;
    display: flex;
    flex-direction: column;
    /*
     * 窗口尺寸锁死之后，这里必须自己能滚 —— 否则内容比窗口高就直接被
     * .modal 的 overflow:hidden 裁掉：手机上「选择角色」最后一整排
     * 根本看不到，也没有滚动条，等于按钮点不到。
     * 面板内部自带滚动的（夜序 / 标记 / 投票）会撑满这一层，不会再套一层滚动。
     */
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    overscroll-behavior: contain;
    /* 右上角按钮占 28px，内容顶到同一行会被压住，统一让出一点空间 */
    padding-top: 22px;
  }
}



.maximized {
  background: rgba(0, 0, 0, 0.95);
  padding: 0;
  border-radius: 0;
  height: 100%;
  width: 100%;
  max-width: 100%;
  max-height: 100%;
  display: flex;
  align-content: center;
  justify-content: center;
  .roles &,
  .characters & {
    max-width: 100%;
    padding: 10px;
  }
}

.modal-fade-enter,
.modal-fade-leave-active {
  opacity: 0;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease;
}

/* 手机：面板贴边一点，把 20px 的左右留白还给内容 */
@media screen and (max-width: 640px) {
  .modal {
    max-width: 96%;
    /* 高度已经在 .modal 里按 88dvh 卡过一遍了，这里别再乘一个百分比：
       92% 是相对「已经收过 6% 上下留白」的容器算的，会把窗口缩没一截 */
    max-height: 100%;
    padding: 8px 12px;

    > .top-right-buttons {
      top: 12px;
      right: 12px;
      gap: 12px;
      > .tr-tools {
        padding-right: 12px;
      }
      > .top-right-button {
        width: 24px;
      }
    }

    > .slot {
      padding-top: 18px;
    }
  }
}
</style>
