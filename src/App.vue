<template>
  <div id="app">
    <!-- 照抄源码 Gradients.vue：交换/移动/取消图标的填充色就靠这三个渐变 -->
    <div id="gradients">
      <svg width="0" height="0">
        <linearGradient id="demon" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stop-color="#ce0100" stop-opacity="1"></stop>
          <stop offset="100%" stop-color="#000" stop-opacity="1"></stop>
        </linearGradient>
      </svg>
      <svg width="0" height="0">
        <linearGradient id="townsfolk" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stop-color="#1f65ff" stop-opacity="1"></stop>
          <stop offset="100%" stop-color="#000" stop-opacity="1"></stop>
        </linearGradient>
      </svg>
      <svg width="0" height="0">
        <linearGradient id="default" x1="50%" y1="100%" x2="50%" y2="0%">
          <stop offset="0%" stop-color="#4e4e4e" stop-opacity="1"></stop>
          <stop offset="100%" stop-color="#000" stop-opacity="1"></stop>
        </linearGradient>
      </svg>
    </div>
    <header class="topbar">
      <div class="brand">
        <div class="crest">{{ initial }}</div>
        <div class="brand-text">
          <h1>血染钟楼 · 线下角色分发器</h1>
          <p>
            <span class="script-name">{{ scriptMeta.name }}</span>
            <span class="sep">·</span>
            <span>{{ scriptMeta.author }}</span>
            <span class="sep">·</span>
            <span>{{ roleCount }} 个角色</span>
            <span class="sep">·</span>
            <span class="seats-tag">{{ players.length }} 人局</span>
          </p>
        </div>
      </div>
      <div class="top-actions">
        <button class="button tool" @click="openPanel('night')" title="夜间行动顺序（N）">
          <font-awesome-icon icon="moon" /> 夜序
        </button>
        <!-- 天数：专门一个按钮，只有这里能改阶段；夜序面板里不再有箭头 -->
        <button
          class="button tool"
          @click="openSettings('day')"
          :title="`调整天数：现在是第 ${night} ${isNight ? '夜' : '天'}`"
        >
          <font-awesome-icon :icon="isNight ? 'moon' : 'sun'" />
          第{{ night }}{{ isNight ? "夜" : "天" }}
        </button>
        <button class="button tool" @click="startNewGame()" title="新开一局：清空座位，从第一夜开始">
          <font-awesome-icon icon="redo-alt" /> 新局
        </button>
        <button class="button tool" @click="openPanel('bluffs')" title="恶魔伪装三张牌（B）">
          <font-awesome-icon icon="eye" /> 伪装
          <span class="tool-badge" v-if="bluffRoles.length">{{ bluffRoles.length }}</span>
        </button>
        <button class="button tool" @click="openPanel('fabled')" title="传奇 / 奇遇角色">
          <font-awesome-icon icon="book-open" /> 传奇
        </button>
        <button
          class="button tool"
          @click="openPanel('jinx')"
          :title="jinxList.length ? `本剧本的 ${jinxList.length} 条相克` : '本剧本没有相克'"
        >
          <font-awesome-icon icon="link" /> 相克
        </button>
        <button
          class="button tool"
          :class="{ on: timerOpen || timerLeft !== null }"
          @click="timerOpen = !timerOpen"
          title="公聊 / 私聊计时（T）"
        >
          <font-awesome-icon icon="stopwatch" /> {{ timerLabel }}
        </button>
        <button
          class="button tool"
          :class="{ on: playerView }"
          @click="togglePlayerView"
          :title="playerView ? '恢复显示角色牌（H）' : '遮住所有角色牌，把屏幕给别人看（H）'"
        >
          <font-awesome-icon :icon="playerView ? 'eye-slash' : 'eye'" />
          {{ playerView ? "遮罩中" : "遮罩" }}
        </button>
        <button
          class="button tool"
          :class="{ on: voteOpen }"
          @click="openPanel('vote')"
          title="提名 / 投票 / 处决（V）"
        >
          <font-awesome-icon icon="vote-yea" /> 投票
          <span class="tool-badge" v-if="voteLog.length">{{ voteLog.length }}</span>
        </button>

        <span class="tb-sep"></span>

        <!-- 设置拆成独立按钮：点哪个就只看那一项 -->
        <button class="button tool" @click="openSettings('count')" title="玩家人数">
          <font-awesome-icon icon="users" /> {{ players.length }} 人
        </button>
        <button class="button tool" @click="openSettings('script')" title="剧本 / 导入 JSON">
          <font-awesome-icon icon="book" /> 剧本
        </button>
        <button class="button tool" @click="openSettings('scale')" title="座位牌大小">
          <font-awesome-icon icon="sliders-h" /> 大小
        </button>
        <button
          class="button tool"
          :class="{ disabled: !history.length }"
          @click="undo"
          :title="history.length ? `撤销：${lastHistory}` : '还没有可撤销的操作'"
        >
          <font-awesome-icon icon="undo" /> 撤销
        </button>
      </div>

      <!--
        全端唯一入口：右上角一个齿轮（照源码 Menu.vue 的 `#controls > .menu`）。
        上面那排 13 个按钮只有大屏才排得下，以前是「宽屏摆一排 / 窄屏藏起来换齿轮」，
        等于同一套功能两份 UI 再拿屏幕宽度去猜。现在统一收进这一个齿轮菜单，
        宽窄靠布局自己适应，不再有任何宽度判断。
      -->
      <button
        class="m-gear"
        :class="{ open: mMenuOpen }"
        @click.stop="mMenuOpen = !mMenuOpen"
        title="菜单"
      >
        <font-awesome-icon icon="cog" />
      </button>

      <div class="m-panel" v-if="mMenuOpen" @click.stop>
        <div class="m-head" @click="mMenuOpen = false">
          <span>菜单</span>
          <font-awesome-icon icon="times" />
        </div>

        <!--
          一级菜单：横向五个图标，照源码 Menu.vue 的 `li.tabs` ——
          魔典 / 联机 / 玩家 / 角色 / 帮助，连顺序都一样（book-open、
          broadcast-tower、users、theater-masks、question）。
          每一页里只有一个二级分组标题（源码 `li.headline` 的蓝→黑→红横幅），
          标题下面才是竖排条目（源码 `.options > li`）。
          之前是自己按「本局 / 信息 / 对局」又分了三个组，等于同一个页签里
          塞了三个三级菜单，源码没有这种套法。
        -->
        <div class="m-tabs">
          <button
            class="m-tab"
            :class="{ on: mTab === 'grimoire' }"
            @click="mTab = 'grimoire'"
            title="魔典"
          >
            <font-awesome-icon icon="book-open" />
          </button>
          <button
            class="m-tab"
            :class="{ on: mTab === 'session', synced: !!cloud.user }"
            @click="mTab = 'session'"
            title="联机"
          >
            <font-awesome-icon icon="broadcast-tower" />
          </button>
          <button
            class="m-tab"
            :class="{ on: mTab === 'players' }"
            @click="mTab = 'players'"
            title="玩家"
          >
            <font-awesome-icon icon="users" />
          </button>
          <button
            class="m-tab"
            :class="{ on: mTab === 'characters' }"
            @click="mTab = 'characters'"
            title="角色"
          >
            <font-awesome-icon icon="theater-masks" />
          </button>
          <button
            class="m-tab"
            :class="{ on: mTab === 'help' }"
            @click="mTab = 'help'"
            title="帮助"
          >
            <font-awesome-icon icon="question" />
          </button>
        </div>

        <!-- 魔典（源码 grimoire）：全局开关与对局操作 -->
        <template v-if="mTab === 'grimoire'">
          <div class="m-group">魔典</div>
          <button class="m-item" @click="menuPick('night')">
            <font-awesome-icon icon="moon" /><span>夜序</span>
          </button>
          <button class="m-item" @click="menuPick('day')">
            <font-awesome-icon :icon="isNight ? 'moon' : 'sun'" />
            <span>第{{ night }}{{ isNight ? "夜" : "天" }}</span>
          </button>
          <button class="m-item" @click="menuPick('vote')">
            <font-awesome-icon icon="vote-yea" /><span>提名 / 投票</span>
            <em v-if="voteLog.length">{{ voteLog.length }}</em>
          </button>
          <button class="m-item" @click="menuPick('timer')">
            <font-awesome-icon icon="stopwatch" /><span>计时</span>
            <em v-if="timerLeft !== null">{{ timerLabel }}</em>
          </button>
          <button class="m-item" @click="menuPick('mask')">
            <font-awesome-icon :icon="playerView ? 'eye-slash' : 'eye'" />
            <span>{{ playerView ? "取消遮罩" : "遮罩" }}</span>
          </button>
          <button
            class="m-item"
            :class="{ off: !history.length }"
            @click="menuPick('undo')"
          >
            <font-awesome-icon icon="undo" /><span>撤销</span>
            <em>{{ lastHistory || "无" }}</em>
          </button>
          <button class="m-item" @click="menuPick('new')">
            <font-awesome-icon icon="redo-alt" /><span>新开一局</span>
          </button>
        </template>

        <!-- 联机（源码 session）：只有云同步这一项，和大厅/房间同属联机范畴 -->
        <template v-else-if="mTab === 'session'">
          <div class="m-group">联机</div>
          <button class="m-item" @click="menuPick('cloud')">
            <font-awesome-icon icon="cloud" />
            <span>{{ cloud.user ? "云端存档 / 剧本" : "登录 / 云同步" }}</span>
            <em>{{ cloud.user ? "已登录" : "未登录" }}</em>
          </button>
        </template>

        <!-- 玩家（源码 players）：座位与人数、牌大小、标记 -->
        <template v-else-if="mTab === 'players'">
          <div class="m-group">玩家</div>
          <button class="m-item" @click="menuPick('addSeat')">
            <font-awesome-icon icon="plus" /><span>添加座位</span>
            <em>{{ players.length }}/15</em>
          </button>
          <button class="m-item" @click="menuPick('count')">
            <font-awesome-icon icon="users" /><span>玩家人数</span>
            <em>{{ players.length }}</em>
          </button>
          <button class="m-item" @click="menuPick('scale')">
            <font-awesome-icon icon="sliders-h" /><span>座位牌大小</span>
            <em>{{ seatScalePercent }}%</em>
          </button>
          <button class="m-item" @click="menuPick('clearMarks')">
            <font-awesome-icon icon="eraser" /><span>清空标记</span>
            <em v-if="reminderCount">{{ reminderCount }}</em>
          </button>
        </template>

        <!-- 角色（源码 characters）：配置角色、伪装、传奇、剧本 -->
        <template v-else-if="mTab === 'characters'">
          <div class="m-group">角色</div>
          <button class="m-item" @click="menuPick('roles')">
            <font-awesome-icon icon="dice" /><span>配置角色</span>
            <em>{{ assignedCount }}/{{ players.length }}</em>
          </button>
          <button class="m-item" @click="menuPick('bluffs')">
            <font-awesome-icon icon="eye" /><span>伪装身份</span>
            <em v-if="bluffRoles.length">{{ bluffRoles.length }}</em>
          </button>
          <button class="m-item" @click="menuPick('quick')">
            <font-awesome-icon icon="comment-dots" /><span>快捷唤醒短语</span>
            <em>{{ quickPhrases.length }}</em>
          </button>
          <button class="m-item" @click="menuPick('fabled')">
            <font-awesome-icon icon="book-open" /><span>传奇角色</span>
          </button>
          <button class="m-item" @click="menuPick('script')">
            <font-awesome-icon icon="book" /><span>剧本 / 导入</span>
          </button>
        </template>

        <!-- 帮助（源码 help）：参考类信息，相克表就在这里 -->
        <template v-else>
          <div class="m-group">帮助</div>
          <button class="m-item" @click="menuPick('jinx')">
            <font-awesome-icon icon="link" /><span>相克</span>
            <em v-if="jinxList.length">{{ jinxList.length }}</em>
          </button>
        </template>
      </div>
      <div class="m-backdrop" v-if="mMenuOpen" @click="mMenuOpen = false"></div>
    </header>

    <main class="stage" ref="stage">
      <!-- 圆桌：源码 townsquare 的 ul.circle.size-N，座位是 li，靠 rotate 从圆心放射 -->
      <ul
        ref="circle"
        class="circle"
        :class="'size-' + players.length"
        :style="[
          orientation,
          ringStyle,
          { '--seat-vh': seatVh, '--seat-size': seatPx + 'px' }
        ]"
      >
        <li
          class="seat"
          v-for="(player, index) in players"
          :key="player.id"
          :class="{
            'has-role': !!player.role.id,
            'is-dead': !!player.role.id && player.isDead,
            'is-masked': playerView && !!player.role.id,
            'has-marks': !playerView && (player.reminders || []).length > 0,
            'menu-open': menuIndex === index,
            'op-from': swapIndex === index || moveIndex === index,
            'op-swap': swapIndex > -1,
            'op-move': moveIndex > -1
          }"
          :style="seatZoom"
        >
          <!-- 牌本体 = 源码 .player：:before 的 padding-top 100% 撑出正方形 -->
          <div
            class="player"
            :class="[player.role.team, { dead: !!player.role.id && player.isDead }]"
          >
            <div class="seatNum">{{ index + 1 }}</div>

            <!--
              交换/移动待选图标（源码 Player.vue 的 .overlay：swap ⇄ / move ↻ /
              cancel ⊗）：点名字菜单选「交换座位」或「移动玩家」后，菜单关闭，
              所有座位的牌上浮出图标——点目标玩家的图标完成操作，点发起者
              自己的 ⊗ 取消。遮罩模式下不出现，玩家视角不能改座位。
              样式照抄源码：图标本体放大到牌面的 50%×60%，白色描边 + 灰黑渐变。
            -->
            <div class="overlay" v-if="!playerView">
              <font-awesome-icon
                v-if="swapIndex === index || moveIndex === index"
                icon="times-circle"
                class="cancel"
                title="取消"
                @click.stop="confirmSeatOp(index)"
              />
              <font-awesome-icon
                v-else-if="swapIndex > -1"
                icon="exchange-alt"
                class="swap"
                :title="`和「${players[swapIndex].name}」换位`"
                @click.stop="confirmSeatOp(index)"
              />
              <font-awesome-icon
                v-else-if="moveIndex > -1"
                icon="redo-alt"
                class="move"
                :title="`把「${players[moveIndex].name}」移到这里（中间的座位依次挪动）`"
                @click.stop="confirmSeatOp(index)"
              />
            </div>

            <template v-if="player.role.id">
              <!-- 源码 Player.vue 的 DOM 顺序：shroud → life → night-order → token。
                   层叠完全靠这个顺序：布幡和黑布都垫在角色牌下面，牌面永远看得见 -->
              <div
                class="shroud"
                v-if="!playerView"
                :class="{ dead: player.isDead }"
                :title="player.isDead ? '点击复活' : '点击盖帷幕'"
                @click.stop="toggleDeath(player)"
              ></div>

              <!-- 生命牌：源码 .life。平时转到背面看不见，死亡时换成 death.png -->
              <div class="life"></div>

              <!-- 夜序：照抄源码排版。左右两枚圆形编号牌，悬停才出提示文字 -->
              <template v-if="!playerView">
                <div
                  class="night-order first"
                  v-if="seatOrder(player).first"
                  :class="{ done: seatOrder(player).doneFirst }"
                >
                  <em :title="seatOrder(player).firstTitle"
                    >{{ seatOrder(player).first }}.</em
                  >
                  <span v-if="seatOrder(player).firstText">{{
                    seatOrder(player).firstText
                  }}</span>
                </div>
                <div
                  class="night-order other"
                  v-if="seatOrder(player).other"
                  :class="{ done: seatOrder(player).doneOther }"
                >
                  <em :title="seatOrder(player).otherTitle"
                    >{{ seatOrder(player).other }}.</em
                  >
                  <span v-if="seatOrder(player).otherText">{{
                    seatOrder(player).otherText
                  }}</span>
                </div>
              </template>

              <!-- 牌面：换角色热区（上半被帷幕盖住，点下半才换角色）。
                   魔典不画「认知覆盖」角标：牌上挂小图标等于把真实身份摊在桌上，
                   身份信息改由「是酒鬼」这类标记表达（配置界面仍然要显示） -->
              <Token
                v-if="!playerView"
                :role="player.role"
                :show-cover="false"
                @click.native.stop="openPicker(index)"
              />
              <!-- 遮罩模式：把牌面换成「?」，屏幕转给玩家看时不会泄漏身份。
                   说书人临时要看某个人的身份/token：点一下亮出牌面和标记，再点一下盖回去 -->
              <div
                v-else-if="revealedSeats.includes(index)"
                class="reveal-face"
                title="点击盖回遮罩"
                @click.stop="toggleReveal(index)"
              >
                <Token :role="player.role" :show-cover="false" />
              </div>
              <div
                v-else
                class="mask-face"
                :title="player.role.id ? '点击亮出身份和标记' : ''"
                @click.stop="toggleReveal(index)"
              >?</div>

              <!--
                死因角标：只有一个字太小看不懂，鼠标移上去浮出完整一句
                （挂在 .seat 上的：处 = 死于处决，死 = 死于某个角色 / 能力）。
                手机没有 hover，点一下同样把这句话用提示条打出来。
              -->
              <span
                class="death-flag"
                v-if="!playerView && deathCause(player)"
                :data-tip="deathCause(player).text"
                :title="deathCause(player).text"
                @click.stop="notify(deathCause(player).text, 'err')"
                >{{ deathCause(player).char }}</span
              >

              <!-- 遗言票：源码 Player.vue 的 .has-vote（vote-yea 图标，牌右上角） -->
              <font-awesome-icon
                icon="vote-yea"
                v-if="player.isDead && !playerView"
                :class="player.isVoteless ? 'secret-no-vote' : 'has-vote'"
                :title="
                  player.isVoteless
                    ? '遗言票已用，点击恢复'
                    : '遗言票还在，用过之后点一下标记'
                "
                @click.stop="toggleGhostVote(player)"
              />
            </template>

            <div v-else class="empty-seat" @click="openPicker(index)">
              <span>{{ index + 1 }}</span>
            </div>

            <!-- 名字：点这里出二级菜单（改名 / 换角色 / 换座位…） -->
            <button
              class="seat-name"
              :class="{
                dead: player.isDead && player.role.id,
                empty: !player.role.id,
                active: menuIndex === index
              }"
              :title="`${player.name} · 点击打开菜单`"
              @click.stop="toggleSeatMenu(index)"
            >
              <span>{{ player.name }}</span>
            </button>

            <!-- 名字的二级菜单 -->
            <div
              class="seat-menu"
              :class="{ flip: menuFlipLeft(index) }"
              :style="menuShiftStyle"
              v-if="menuIndex === index"
              @click.stop
            >
              <template v-if="menuMode === 'main'">
                <button class="sm-item" @click="openPicker(index)">
                  <font-awesome-icon icon="dice" /> 换角色
                </button>
                <button class="sm-item" @click="startSwap(index)">
                  <font-awesome-icon icon="exchange-alt" /> 交换座位
                </button>
                <button class="sm-item" @click="startMove(index)">
                  <font-awesome-icon icon="redo-alt" /> 移动玩家
                </button>
                <button class="sm-item" @click="startRename">
                  <font-awesome-icon icon="address-card" /> 改名
                </button>
                <button
                  class="sm-item"
                  v-if="player.role.id"
                  @click="menuDeath(player)"
                >
                  <font-awesome-icon :icon="player.isDead ? 'heartbeat' : 'skull'" />
                  {{ player.isDead ? "复活" : "标记死亡" }}
                </button>
                <button
                  class="sm-item"
                  v-if="player.isDead"
                  @click="menuGhostVote(player)"
                >
                  <font-awesome-icon icon="vote-yea" />
                  {{ player.isVoteless ? "恢复死亡票" : "死亡票已用" }}
                </button>
                <button
                  class="sm-item"
                  v-if="player.role.id"
                  @click="openReminders(index)"
                >
                  <font-awesome-icon icon="tags" /> 放置标记
                </button>
                <button
                  class="sm-item danger"
                  v-if="player.role.id"
                  @click="clearSeatRole(player)"
                >
                  <font-awesome-icon icon="eraser" /> 清空角色
                </button>
              </template>

              <template v-else>
                <p class="sm-cap">新的名字</p>
                <input
                  class="sm-input"
                  v-model="menuName"
                  maxlength="12"
                  @keyup.enter="confirmRename"
                />
                <div class="sm-row">
                  <button class="sm-item" @click="confirmRename">确定</button>
                  <button class="sm-item" @click="menuMode = 'main'">取消</button>
                </div>
              </template>
            </div>
          </div>

            <!--
              提示标记：源码 Player.vue 里 .reminder 是 .player 的**兄弟**、
              li 的直接子元素。li 已经被转到了座位角度上，标记跟着 li 的
              文档流往下排，方向自然就是「朝圆心」，所以不算角度、不翻转、
              也不做反旋转。最后一片是加号，悬停座位才浮上来。
            -->
            <template v-if="!playerView">
              <div
                class="reminder"
                v-for="item in reminderChips(player)"
                :key="item.key"
                :class="{ reversed: item.reversed }"
                :title="`${item.name}${item.reversed ? '（已翻转）' : ''} · 点击移除 · 右键翻转`"
                @click.stop="removeReminder(player, item.index)"
                @contextmenu.prevent.stop="flipReminder(player, item.index)"
              >
                <span class="icon" :style="item.iconStyle"></span>
                <span class="text">{{ item.name }}</span>
              </div>
              <div
                class="reminder add"
                :class="{ active: reminderIndex === index }"
                :title="`为「${player.name}」放置提示标记`"
                @click.stop="openReminders(index)"
              >
                <span class="icon"></span>
              </div>
            </template>
            <!-- 遮罩模式下点开的那一个座位：标记只展示，不给操作（玩家视角不能改魔典） -->
            <template v-else-if="revealedSeats.includes(index)">
              <div
                class="reminder"
                v-for="item in reminderChips(player)"
                :key="'rv' + item.key"
                :class="{ reversed: item.reversed }"
                :title="`${item.name}${item.reversed ? '（已翻转）' : ''}`"
              >
                <span class="icon" :style="item.iconStyle"></span>
                <span class="text">{{ item.name }}</span>
              </div>
            </template>
          </li>
      </ul>

      <div class="center">
        <!-- 阶段：只显示，不当按钮用。改天数走顶栏那个「第 N 夜」按钮 -->
        <div class="phase">
          <button
            class="phase-label"
            :class="{ day: !isNight }"
            :title="`点击调整天数（现在是第 ${night} ${isNight ? '夜' : '天'}）`"
            @click="openSettings('day')"
          >
            第 {{ night }} {{ isNight ? "夜" : "天" }}
          </button>
        </div>
        <div class="count-big">{{ players.length }}</div>
        <div class="count-label">名玩家</div>
        <div class="center-status" :class="{ done: assignedCount === players.length }">
          {{ assignedCount }} / {{ players.length }} 已分配
        </div>
        <!-- 有死亡之后才出现，不占空局面的位置 -->
        <div class="center-life" v-if="deadCount">
          <span class="alive">存活 {{ aliveCount }}</span>
          <span class="divider">·</span>
          <span class="dead">死亡 {{ deadCount }}</span>
        </div>
        <!-- 计时器：公聊 / 私聊，倒计时直接摆在桌子中央 -->
        <div
          class="timer-display"
          v-if="timerLeft !== null"
          :class="{ warn: timerLeft <= 10, paused: !timerRunning }"
        >
          <span class="t-label">{{ timerKind === "public" ? "公聊" : "私聊" }}</span>
          <span class="t-time">{{ timerText }}</span>
          <button class="t-btn" @click="pauseTimer">
            {{ timerRunning ? "暂停" : "继续" }}
          </button>
          <button class="t-btn" @click="stopTimer">结束</button>
        </div>
        <button class="button center-btn" @click="openRoles">
          <font-awesome-icon icon="dice" />
          {{ assignedCount ? "重新配置角色" : "开始配置角色" }}
        </button>
      </div>
    </main>

    <footer class="statusbar">
      <div class="tips">
        <span class="tip"><b>1</b> 配置角色界面里，左侧 <b>7/7</b> 的 + / − 调整该阵营目标人数（如 7/8），<b>骰子</b>只随机这一个阵营。</span>
        <span class="tip"><b>2</b> 只有四个阵营的「已选 / 目标」全部相等，且目标总和等于玩家人数时，随机分配与抽取按钮才可点击。</span>
        <span class="tip"><b>3</b> 右上角齿轮里是全部功能：横向五个分类（魔典 / 联机 / 玩家 / 角色 / 帮助），每一页只有一个分组标题，下面竖排条目。「魔典」管夜序、天数、投票、计时、遮罩、撤销、新开一局；「联机」管云同步；「玩家」管添加座位、人数、牌大小、清空标记；「角色」管配置角色、伪装身份、传奇角色、剧本导入；「帮助」管相克。</span>
        <span class="tip"><b>4</b> 「适应配置调整」会先按设置调整改人数，再把酒鬼/提线木偶等认知覆盖角色换成一张伪装牌；伪装牌右上角的小图标就是它的真实身份。</span>
        <span class="tip"><b>5</b> 分配完角色后：<b class="inline">点牌子上半部分</b>盖帷幕（再点一次复活），<b class="inline">点下半部分</b>换角色，<b class="inline">点名字</b>打开菜单（改名 / 交换座位 / 移动玩家等，座位类操作选完菜单后点目标牌上的图标完成），牌子下方中间的 <b class="inline">+</b> 放提示标记。</span>
      </div>
    </footer>

    <!-- ================= 设置子窗口（每个按钮只打开对应的一项） ================= -->
    <!--
      以前这几项用的是「从右边滑出来、占满整屏高度」的抽屉，和夜序 / 伪装 /
      相克 / 投票那几个居中的子窗口长得完全不一样。现在统一走同一个窗口壳
      （Modal.vue），标题、最大化、关闭按钮的位置和别的窗口一致，
      里面的内容一点没动。
    -->
    <Modal name="settings" v-if="settingsOpen" @close="settingsOpen = false">
      <div class="settings-panel">
        <div class="sp-head">
          <h3>{{ settingsTitle }}</h3>
        </div>

        <div class="sp-body">
            <!-- 玩家人数 -->
            <section class="sp-section" v-if="settingsTab === 'count'">
              <h4><font-awesome-icon icon="users" /> 玩家人数</h4>
              <!--
                人数控件上面多一个「添加座位」：点一次在末尾补一个空座位。
                和下面的 +/− 是一回事（都是调人数），只是不用先想「现在几个人」。
              -->
              <div class="sp-row add-seat-row">
                <button
                  class="button add-seat"
                  :class="{ disabled: players.length >= 15 }"
                  @click="addSeat"
                  :disabled="players.length >= 15"
                  :title="players.length >= 15 ? '已经是 15 人上限' : '在末尾加一个空座位'"
                >
                  <font-awesome-icon icon="plus" /> 添加座位
                </button>
                <span class="add-seat-note">在末尾加一个空座位</span>
              </div>
              <div class="seats-ctl">
                <button
                  class="step"
                  @click="changeCount(-1)"
                  :disabled="players.length <= 5"
                  title="减少玩家"
                >
                  −
                </button>
                <b>{{ players.length }}</b>
                <button
                  class="step"
                  @click="changeCount(1)"
                  :disabled="players.length >= 15"
                  title="增加玩家"
                >
                  +
                </button>
                <span class="lbl">人（5–15）</span>
              </div>
              <p class="hint">
                加减人数只增删<strong>末尾</strong>的座位：已有的角色、标记、生死状态都保留，不会清空魔典。
                加完人再点「配置角色」补上配比即可。
              </p>
            </section>

            <!-- 调整天数：专门一节，和夜序面板分开 -->
            <section class="sp-section" v-if="settingsTab === 'day'">
              <h4><font-awesome-icon :icon="isNight ? 'moon' : 'sun'" /> 调整天数</h4>
              <p class="hint">
                现在是<strong>第 {{ night }} {{ isNight ? "夜" : "天" }}</strong>。
                阶段顺序：第 N 夜 → 第 N 天 → 第 N+1 夜。
              </p>
              <div class="seats-ctl">
                <button
                  class="step"
                  @click="stepPhase(-1)"
                  :disabled="!canStepBack"
                  :title="canStepBack ? '回到上一个阶段' : '已经是第一夜，不能再往前'"
                >
                  −
                </button>
                <b>第 {{ night }} {{ isNight ? "夜" : "天" }}</b>
                <button
                  class="step"
                  @click="stepPhase(1)"
                  :disabled="night >= 99 && !isNight"
                  title="进入下一个阶段"
                >
                  +
                </button>
              </div>
              <p class="hint">
                第一夜不能再往前退。新开一局（或导入新剧本）总是从第一夜开始。
              </p>
            </section>

            <!-- 剧本 -->
            <section class="sp-section" v-if="settingsTab === 'script'">
              <h4><font-awesome-icon icon="book" /> 剧本</h4>
              <div class="script-card">
                <div class="sc-name">{{ scriptMeta.name }}</div>
                <div class="sc-sub">
                  {{ scriptMeta.author }} · {{ roleCount }} 个角色
                </div>
              </div>
              <div class="sp-row">
                <label class="button file-btn">
                  <font-awesome-icon icon="file-import" /> 导入 JSON 剧本
                  <input
                    type="file"
                    accept=".json,application/json"
                    @change="importScript"
                  />
                </label>
                <button class="button" @click="reloadBuiltinScript">
                  <font-awesome-icon icon="undo" /> 内置剧本
                </button>
              </div>
              <p class="hint">
                支持标准剧本 JSON（含 <code>_meta</code> 与角色的
                <code>id / name / ability / team</code> 等字段）。导入后角色库、相克关系与配置会一起更新，座位会重置。
              </p>
            </section>

            <!-- 座位牌大小 -->
            <section class="sp-section" v-if="settingsTab === 'scale'">
              <h4><font-awesome-icon icon="sliders-h" /> 座位牌大小</h4>
              <div class="scale-row">
                <input
                  type="range"
                  min="70"
                  max="180"
                  step="5"
                  v-model.number="seatScalePercent"
                  @input="persistSettings"
                />
                <span class="scale-val">{{ seatScalePercent }}%</span>
              </div>
              <p class="hint">觉得角色圈太小就拖大；人多的局调小一点可以避免相邻座位相撞。</p>
            </section>

            <!--
              快捷唤醒短语：说书人半夜叫醒玩家时要说的话。
              每句话点开是一个「填空窗口」，填完在同一个窗口里全屏展示，
              关掉展示退回这个列表（下一步通常就是下一位玩家）。
            -->
            <section class="sp-section" v-if="settingsTab === 'quick'">
              <h4><font-awesome-icon icon="comment-dots" /> 快捷唤醒短语</h4>
              <p class="hint">
                点一句话 → 把里面的空位填上（角色 / 善良·邪恶 / 数字）→ 点「展示给玩家」全屏放出来。
                关掉展示就退回这里，接着放下一位。
              </p>
              <div class="qp-list">
                <button
                  v-for="(item, idx) in quickPhrases"
                  :key="item.key"
                  class="qp-item"
                  @click="openQuickPhrase(item)"
                >
                  <span class="qp-no">{{ idx + 1 }}</span>
                  <span class="qp-text">
                    <template v-for="(seg, j) in item.seg">
                      <span v-if="!isSlot(seg)">{{ seg }}</span>
                      <em
                        v-else
                        :key="'qp-slot-' + j"
                        class="qp-slot"
                        :class="slotType(seg)"
                        >{{ slotLabel(slotType(seg)) }}</em
                      >
                    </template>
                  </span>
                  <font-awesome-icon class="qp-go" icon="chevron-right" />
                </button>
              </div>
            </section>

            <!--
              「配置角色」不再挂在设置面板底部：
              它和「改几个人」「换剧本」不是一回事，硬塞在人数面板里每次都会
              被顺手点错。现在它是齿轮菜单「角色」分组里的独立入口
              （桌子中央也还留着「重新配置角色」按钮）。
            -->
        </div>
      </div>
    </Modal>

    <transition name="toast-fade">
      <div class="toast" v-if="toast" :class="[toastType, { 'with-undo': !!undoBar }]">{{ toast }}</div>
    </transition>

    <!-- 自动清理标记后的撤回条：右下角一个「撤回」小字，5 秒后自己消失 -->
    <transition name="toast-fade">
      <div class="undo-bar" v-if="undoBar">
        <span class="ub-text">{{ undoBar.text }}</span>
        <button class="ub-undo" @click="undoRemoved">
          <!-- ↩（U+21A9 + 文本呈现选择符），手机上「撤回」消息就是它 -->
          <span class="ub-undo-icon">&#8617;&#65038;</span>
          <span class="ub-undo-text">撤回</span>
        </button>
      </div>
    </transition>

    <!-- 计时器的小面板：挂在工具条下方，不挡桌子 -->
    <div class="timer-panel" v-if="timerOpen" @click.stop>
      <h4>计时</h4>
      <div class="tp-row">
        <button @click="startTimer('public', 180)">公聊 3 分</button>
        <button @click="startTimer('private', 60)">私聊 1 分</button>
      </div>
      <div class="tp-row">
        <button @click="startTimer('public', 300)">公聊 5 分</button>
        <button @click="startTimer('public', 600)">公聊 10 分</button>
      </div>
      <div class="tp-row">
        <button v-if="timerLeft !== null" @click="stopTimer">结束计时</button>
      </div>
      <p class="tp-hint">倒计时会显示在桌子中央，最后 10 秒变红。</p>
    </div>

    <RolesModal />
    <DrawModal />
    <RemindersModal
      v-if="reminderIndex >= 0 && reminderPlayer"
      :player="reminderPlayer"
      :players="players"
      :index="reminderIndex"
      @close="closeReminders"
    />

    <!-- 逐座换角色 / 改名 / 笔记 -->
    <RolePickerModal
      v-if="pickerIndex >= 0 && pickerPlayer"
      :player="pickerPlayer"
      :players="players"
      :index="pickerIndex"
      @close="closePicker"
      @removed="onRoleRemindersRemoved"
    />

    <!-- 夜序（天数在顶栏的「第 N 夜」按钮里调，这里只读） -->
    <NightOrderModal
      v-if="nightOpen"
      :players="players"
      :night="night"
      :is-night="isNight"
      @close="nightOpen = false"
    />

    <!-- 恶魔伪装 -->
    <BluffsModal
      v-if="bluffsOpen"
      :players="players"
      @close="bluffsOpen = false"
      @preview="showBluffPreview"
    />

    <!-- 传奇 / 奇遇 -->
    <FabledModal v-if="fabledOpen" @close="fabledOpen = false" />

    <!-- 相克规则 -->
    <JinxModal v-if="jinxOpen" @close="jinxOpen = false" />

    <!-- 提名 / 投票 / 处决 -->
    <VoteModal
      v-if="voteOpen"
      :players="players"
      :log="voteLog"
      @record="pushVote"
      @close="voteOpen = false"
    />

    <!-- 云同步：登录、云端存档、云端剧本。本机存档照旧，这里只是额外的异地备份 -->
    <CloudModal
      v-if="cloudOpen"
      :make-game="cloudGameRow"
      :make-script="cloudScriptRow"
      @restore-save="applyCloudSave"
      @restore-script="applyCloudScript"
      @close="cloudOpen = false"
    />

    <!-- 快捷唤醒短语：填空窗口 + 全屏展示 -->
    <QuickWakeModal
      v-if="quickPhrase"
      :phrase="quickPhrase"
      :players="players"
      @close="quickPhrase = null"
    />

    <!-- 给恶魔看的三张伪装牌：全屏、只有牌面 -->
    <transition name="panel-fade">
      <div class="bluff-preview" v-if="bluffPreview" @click="bluffPreview = false">
        <p class="bp-title">本局给你的伪装角色</p>
        <div class="bp-tokens">
          <div class="bp-token" v-for="role in bluffRoles" :key="'pv-' + role.id">
            <Token :role="role" :show-corner="false" />
            <span>{{ role.name }}</span>
          </div>
        </div>
        <p class="bp-hint">展示完成后，将设备交回说书人 · 点任意处关闭</p>
      </div>
    </transition>
  </div>
</template>

<script>
import { mapState } from "vuex";
import Token from "./components/Token";
import RolesModal from "./components/modals/RolesModal";
import DrawModal from "./components/modals/DrawModal";
import RemindersModal from "./components/modals/RemindersModal";
import NightOrderModal from "./components/modals/NightOrderModal";
import RolePickerModal from "./components/modals/RolePickerModal";
import BluffsModal from "./components/modals/BluffsModal";
import FabledModal from "./components/modals/FabledModal";
import JinxModal from "./components/modals/JinxModal";
import VoteModal from "./components/modals/VoteModal";
import Modal from "./components/modals/Modal";
import CloudModal from "./components/modals/CloudModal";
import QuickWakeModal from "./components/modals/QuickWakeModal";
import { snapSeats, nightOrderOf, isDeathMark } from "./logic/grimoire";
import { sweepRoleReminders, describeRemoved } from "./logic/reminders";
import { QUICK_PHRASES, isSlot, slotType, slotLabel } from "./logic/phrases";
import { cloudState, initCloud, refreshCloud } from "./cloud/state";
import script from "./data/script.json";

const BUILTIN_SCRIPT = script;
const LS_SCALE = "botc.seatScale";
const LS_COUNT = "botc.playerCount";
const LS_SCRIPT = "botc.script";
const LS_GAME = "botc.game";

// 注意：setCustomRoles 会把 "_meta" 的 id 清洗成 "meta"，
// 所以剧本元信息必须在任何 commit 之前先取出来。
const metaOf = (list, fallback) => {
  const meta =
    (list || []).find(
      entry => entry && (entry.id === "_meta" || entry.id === "meta")
    ) || {};
  return {
    name: meta.name || fallback || "自定义剧本",
    author: meta.author || "未知作者"
  };
};

const BUILTIN_META = metaOf(BUILTIN_SCRIPT, "死亡笔记");

export default {
  components: {
    Token,
    RolesModal,
    DrawModal,
    RemindersModal,
    NightOrderModal,
    RolePickerModal,
    BluffsModal,
    FabledModal,
    JinxModal,
    VoteModal,
    CloudModal,
    QuickWakeModal,
    Modal
  },
  data() {
    return {
      /** 手机齿轮菜单是否展开（源码 Menu.vue 的 grimoire.isMenuOpen） */
      mMenuOpen: false,
      /** 齿轮菜单的一级分类（源码 Menu.vue 的 tab：grimoire / session / players …） */
      mTab: "grimoire",
      /** 舞台可用宽高（去掉 padding）：圆桌直径 = 这两者的较小值 */
      stageH: 0,
      stageW: 0,
      /** 窗口宽高：源码用 data 里的 windowWidth / windowHeight 判断横竖屏，这里同源 */
      winW: 0,
      winH: 0,
      settingsOpen: false,
      // 设置被拆成几个按钮，面板里只显示对应的一项
      settingsTab: "count",
      /** 正在填的快捷唤醒短语（null = 没开），见 logic/phrases.js */
      quickPhrase: null,
      seatScalePercent: 100,
      scriptMeta: { ...BUILTIN_META },
      toast: "",
      toastType: "ok",
      toastTimer: null,
      // 自动清理标记后的撤回条：{ text, index, removed: [] }
      undoBar: null,
      undoTimer: null,
      // 正在放标记的座位下标，-1 表示没打开
      reminderIndex: -1,
      // 正在换角色的座位下标
      pickerIndex: -1,
      // 座位名字的二级菜单：打开的是哪个座位、当前是哪一层
      menuIndex: -1,
      menuMode: "main",
      menuName: "",
      /* 交换座位 / 移动玩家（源码 TownSquare 的 swap / move）：
         进入待选状态后不弹窗，所有座位的 token 上浮出操作图标，
         点目标玩家的图标完成，点发起者自己的 ⊗ 取消。-1 表示没在待选 */
      swapIndex: -1,
      moveIndex: -1,
      /* 菜单弹出后的视口修正量：座位贴着屏幕边时把它推进来，别飞出舞台/被顶栏压住 */
      menuShift: { x: 0, y: 0 },
      saveTimer: null,
      /* ---------- 魔典：面板与阶段 ---------- */
      nightOpen: false,
      bluffsOpen: false,
      fabledOpen: false,
      jinxOpen: false,
      bluffPreview: false,
      // 遮罩：把角色牌换成「?」，方便把屏幕转给玩家看
      playerView: false,
      // 遮罩模式下被点开的座位列表。点「?」亮牌，再点同一个盖回去，
      // 可以同时亮多个（一个一个给玩家看牌）
      revealedSeats: [],
      night: 1,
      isNight: true,
      history: [],
      // 圆桌直径：按舞台实际可用宽高算，避免挤成两行的标题栏盖住顶部座位
      /* ---------- 提名 / 投票 ---------- */
      voteOpen: false,
      voteLog: [],
      /* ---------- 计时器 ---------- */
      timerOpen: false,
      timerLeft: null,
      timerRunning: false,
      timerKind: "public",
      timerHandle: null,
      /* ---------- 云同步 ---------- */
      // 云同步面板是否打开（真正的数据都在 src/cloud/state.js 里）
      cloudOpen: false,
      // 当前剧本的原始 JSON：导入时留下原文，云端「存剧本」才有东西可传
      scriptRaw: null
    };
  },
  computed: {
    /** 云同步的共享状态。用 computed 暴露，模板里才能跟着登录/列表变化重绘 */
    cloud() {
      return cloudState;
    },
    initial() {
      return (this.scriptMeta.name || "血").slice(0, 1);
    },
    /* 名字菜单的视口修正：只在需要挪的时候才写 transform，默认还是纯 translateY(-50%) */
    menuShiftStyle() {
      const { x, y } = this.menuShift;
      if (!x && !y) return null;
      return {
        transform: `translateY(calc(-50% + ${y}px)) translateX(${x}px)`
      };
    },
    /** 能不能往后退：第一夜之前没有阶段 */
    canStepBack() {
      return this.night > 1 || !this.isNight;
    },
    /** 夜序序号表：座位牌和夜序面板共用（源码 players/nightOrder getter） */
    nightRanks() {
      return nightOrderOf(this.players);
    },
    /** 盲抽窗口是否打开：打开时是给玩家看的，界面上不能留任何剧透信息 */
    drawOpen() {
      return !!(this.$store.state.modals && this.$store.state.modals.draw);
    },
    seatScale() {
      return (this.seatScalePercent / 100).toFixed(2);
    },
    /**
     * 牌径：照抄 townsquare Player.vue 的 zoom computed —— 按人数分档给 vh，
     * 再乘用户自己调的缩放（顶栏「大小」按钮）。
     */
    seatVh() {
      const n = this.players.length || 1;
      const base = n < 7 ? 18 : n <= 10 ? 16 : n <= 15 ? 14 : 12;
      const scale = Number(this.seatScale) || 1;
      let vh = base * scale;
      /*
       * 源码只按 vh 分档给牌径，但它的圆桌铺满整个视口；
       * 我们上下还有顶栏和提示条，圆桌只有舞台那么高。
       * 人多时牌会压到邻居，所以再按圆周上分到的弦长收一下：
       * 牌径 ≤ 弦长 的 98%，保证相邻两张牌之间留一道缝。
       *
       * 竖屏（手机）：源码 Player.vue 的 zoom 在这里把单位换成 vw
       * （`windowWidth > windowHeight ? "vh" : "vw"`）。
       * 手机竖屏 vh 比 vw 大一倍多，还按 vh 给牌径的话，一张牌比屏幕
       * 一半还宽，左右两侧的座位直接被顶出屏幕。
       */
      const portrait = this.isPortrait;
      // 圆桌直径 = 舞台的短边（见 ringSide），弦长约束必须按它算
      const d = this.ringSide || Math.min(window.innerWidth, window.innerHeight);
      const chordRatio = 2 * Math.sin(Math.PI / n) * 0.98;
      const maxPx = (chordRatio * d) / (2 + chordRatio);
      // 换算成 seatZoom 实际用的那个单位：横屏 vh、竖屏 vw
      const unitPx = (portrait ? window.innerWidth : window.innerHeight) / 100;
      vh = Math.min(vh, maxPx / unitPx);
      return Number(vh.toFixed(2));
    },
    /** 圆桌直径：舞台可用宽高取小，保证正圆且两个方向都放得下 */
    ringSide() {
      if (this.stageW && this.stageH) return Math.min(this.stageW, this.stageH);
      return Math.min(
        window.innerWidth,
        (this.stageH || window.innerHeight)
      );
    },
    /** 竖屏（宽 ≤ 高）。源码 zoom 的 unit 和 orientation 都按这个分叉 */
    isPortrait() {
      const w = this.winW || window.innerWidth;
      const h = this.winH || window.innerHeight;
      return w <= h;
    },
    /**
     * 照抄源码 TownSquare.vue 的 orientation：
     *   width > height ? "height: 100%" : "height: (w/h)*100%"
     * 意图是让圆桌始终是正方形、边长等于短边 —— 源码的容器铺满视口，
     * 所以竖屏时 ratio*100% 正好等于屏宽。
     * 我们上下有顶栏、容器高不等于视口高，照那个百分比算会偏小，
     * 竖屏下直接按宽度撑成正方（aspect-ratio 已在 .circle 上），结果一致。
     */
    orientation() {
      const w = this.winW || window.innerWidth;
      const h = this.winH || window.innerHeight;
      return w > h ? { height: "100%" } : { height: "auto", width: "100%" };
    },
    /**
     * 量到舞台尺寸后，直接把圆桌锁成 ringSide × ringSide 的正圆。
     * 光靠 CSS 的 aspect-ratio，舞台比圆桌矮时宽高会各自生效，
     * 圆就被拉成椭圆（座位按 li 的 height:50% 定半径，横向直接冲出去）。
     */
    ringStyle() {
      if (!this.stageW || !this.stageH) return {};
      return { width: this.ringSide + "px", height: this.ringSide + "px" };
    },
    seatZoom() {
      // 源码 Player.vue 的 zoom：横屏 vh、竖屏 vw
      return { width: this.seatVh + (this.isPortrait ? "vw" : "vh") };
    },
    /**
     * 牌径的真实像素值。
     * CSS 里的 --seat-size 以前写死 `var(--seat-vh) * 1vh`，
     * 但竖屏时牌宽是用 vw 给的，两者差 2 倍多 —— 座位号、夜序牌、
     * 标记圆片全部按这个值算，于是手机上统统被放大了一倍多，
     * 挤得整个圆桌看着「太大」。这里按牌宽实际用的单位算回 px。
     */
    seatPx() {
      const unit = this.isPortrait ? window.innerWidth : window.innerHeight;
      return Number(((this.seatVh * unit) / 100).toFixed(2));
    },
    assignedCount() {
      return this.players.filter(player => player.role.id).length;
    },
    /** 全场提示标记总数：菜单里「清空标记」的角标，为 0 时不显示 */
    reminderCount() {
      return this.players.reduce(
        (sum, player) => sum + (player.reminders || []).length,
        0
      );
    },
    /** 真正死掉的座位数：没分配角色的空座位不算 */
    deadCount() {
      return this.players.filter(player => player.role.id && player.isDead).length;
    },
    aliveCount() {
      return this.players.filter(player => player.role.id && !player.isDead).length;
    },
    reminderPlayer() {
      return this.reminderIndex >= 0 ? this.players[this.reminderIndex] : null;
    },
    pickerPlayer() {
      return this.pickerIndex >= 0 ? this.players[this.pickerIndex] : null;
    },
    /** 恶魔伪装的三张牌（按 id 从角色库还原，刷新后仍然有效） */
    bluffRoles() {
      const ids = this.$store.state.players.bluffs || [];
      return ids
        .map(id => this.roles.get(String(id)))
        .filter(Boolean)
        .slice(0, 3);
    },
    /** 本局添加的传奇 / 奇遇角色 */
    fabledRoles() {
      const ids = this.$store.state.players.fabled || [];
      return ids.map(id => this.$store.state.fabled.get(String(id))).filter(Boolean);
    },
    lastHistory() {
      const last = this.history[this.history.length - 1];
      return last ? last.label : "";
    },
    timerText() {
      const total = Math.max(0, this.timerLeft || 0);
      const m = Math.floor(total / 60);
      const s = total % 60;
      return `${m}:${s < 10 ? "0" : ""}${s}`;
    },
    timerLabel() {
      if (this.timerLeft === null) return "计时";
      return this.timerText;
    },
    /** 本剧本的相克条目（不是角色） */
    jinxList() {
      return this.$store.state.scriptJinxes || [];
    },
    /** 设置面板的标题跟着按钮走 */
    settingsTitle() {
      if (this.settingsTab === "script") return "剧本";
      if (this.settingsTab === "scale") return "座位牌大小";
      if (this.settingsTab === "day") return "调整天数";
      if (this.settingsTab === "quick") return "快捷唤醒短语";
      return "玩家人数";
    },
    /** 快捷唤醒短语的清单（模板定义在 logic/phrases.js） */
    quickPhrases() {
      return QUICK_PHRASES;
    },
    /** 第一夜用首夜顺序，其余夜晚用「其他夜晚」顺序 */
    nightFirst() {
      return this.night <= 1;
    },
    roleCount() {
      const teams = ["townsfolk", "outsider", "minion", "demon"];
      return Array.from(this.roles.values()).filter(role =>
        teams.includes(role.team)
      ).length;
    },
    ...mapState(["roles"]),
    ...mapState("players", ["players"])
  },
  methods: {
    /** 记下舞台高度：圆桌是 height:100% + 正方，半径由它决定 */
    measureStage() {
      /*
       * 量舞台的**可用**宽高（减掉 padding）：圆桌是正圆，
       * 直径只能取这两个里的较小值，否则短边一卡，圆就被压成椭圆，
       * 座位按 li 的 height:50% 算半径，横向就冲出屏幕 —— 手机上看着「圈太大」。
       */
      const el = this.$refs.stage;
      if (el) {
        const cs = getComputedStyle(el);
        const padX =
          (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
        const padY =
          (parseFloat(cs.paddingTop) || 0) + (parseFloat(cs.paddingBottom) || 0);
        this.stageW = Math.max(0, Math.floor(el.clientWidth - padX));
        this.stageH = Math.max(0, Math.floor(el.clientHeight - padY));
      }
      this.winW = window.innerWidth;
      this.winH = window.innerHeight;
    },
    /* ---------- 魔典：存活 / 死亡 / 提示标记 ---------- */
    /**
     * 座位牌上的两个夜序编号牌（照抄 townsquare 的 .night-order first / other）。
     * 数字是「排序后的第几个行动」，不是角色 json 里的原始编号 ——
     * 和源码 players/nightOrder getter 同一套算法。
     * 进度读 player.nightDone，和夜序面板是同一份数据，那边打勾这边就变绿。
     */
    seatOrder(player) {
      const role = player.role || {};
      const rank = this.nightRanks.get(player) || { first: 0, other: 0 };
      const done = player.nightDone || {};
      const doneFirst = !!done["f" + this.night];
      const doneOther = !!done["o" + this.night];
      return {
        first: rank.first,
        other: rank.other,
        firstText: role.firstNightReminder || "",
        otherText: role.otherNightReminder || "",
        firstTitle: `首夜第 ${rank.first} 位${doneFirst ? "（已处理）" : ""}`,
        otherTitle: `其他夜第 ${rank.other} 位${doneOther ? "（已处理）" : ""}`,
        doneFirst,
        doneOther
      };
    },
    /**
     * 牌下方那一列标记圆片：照抄源码，一个标记一枚木圆片，
     * 上半是它的角色图标，下半压一行名字。
     */
    reminderChips(player) {
      const list = player.reminders || [];
      return list.map((item, index) => ({
        key: `${item.name || "?"}-${index}`,
        name: item.name || "",
        reversed: !!item.reversed,
        iconStyle: item.image ? { backgroundImage: `url(${item.image})` } : null,
        index
      }));
    },
    /**
     * 死因角标：只有 {char, text} 两个字段，模板里直接取值。
     * deathBy 是一个字符串字段，为了能记住「死于哪个角色」改成带前缀：
     *   ""            —— 只标了死亡，死因不明（不显示角标）
     *   "exec"        —— 投票面板点的处决
     *   "role:<id>"   —— 天亮时结算的「死亡」标记，来源角色就是 id
     *   "other"       —— 兼容早期存档里的「能力 / 夜晚」
     */
    deathCause(player) {
      if (!player || !player.isDead) return null;
      const by = String(player.deathBy || "");
      if (!by) return null;
      if (by === "exec") return { char: "处", text: "死于处决" };
      if (by.indexOf("role:") === 0) {
        const role = this.roles.get(by.slice(5));
        return {
          char: "死",
          text: role && role.name ? `死于${role.name}` : "死于角色能力"
        };
      }
      return { char: "死", text: "死于能力或夜晚" };
    },
    /** 点圆牌：存活 ↔ 死亡。再点一次就是撤回，误触没有不可逆的代价 */
    toggleDeath(player) {
      if (!player.role.id) return;
      const next = !player.isDead;
      const index = this.players.indexOf(player);
      this.mark(`${player.name} ${next ? "标记死亡" : "恢复存活"}`);
      this.$store.commit("players/update", {
        player,
        property: "isDead",
        value: next
      });
      /*
       * 死因必须跟着生死一起清：以前这里只改 isDead，人被复活后
       * deathBy 还留着上一次的 "exec"，再点死就凭空又变成「死于处决」。
       * 手动点死没有可靠来源，一律记空（不显示角标）；要处决就走投票面板，
       * 要记角色死因就靠「死亡」标记在天亮时结算。
       */
      if (String(player.deathBy || "")) {
        this.$store.commit("players/update", {
          player,
          property: "deathBy",
          value: ""
        });
      }
      // 复活时把死亡票状态一起复原，否则会留下「活着但没有票」的脏数据
      if (!next && player.isVoteless) {
        this.$store.commit("players/update", {
          player,
          property: "isVoteless",
          value: false
        });
      }
      // 死了，这个角色自己带来的标记就失效了（「干扰项」「保护」这类，
      // 不管挂在自己身上还是别人身上都要摘掉）；
      // 全局标记（「是酒鬼」）和别的角色挂上来的标记不动
      const groups = next ? this.dropRoleReminders(player.role) : [];
      if (groups.length) {
        this.showUndoBar(
          `${player.name} 已死亡，自动移除「${player.role.name}」带来的标记：${describeRemoved(
            groups,
            index
          )}`,
          groups
        );
        return;
      }
      this.notify(
        next
          ? `${player.name} 标记为死亡（再点一次圆牌可复活）。`
          : `${player.name} 已恢复存活。`,
        next ? "err" : "ok"
      );
    },
    /** 死亡票：死亡玩家各有一票，用掉之后点一下标记 */
    toggleGhostVote(player) {
      if (!player.isDead) return;
      const used = !player.isVoteless;
      this.mark(`${player.name} 死亡票${used ? "标记已用" : "恢复"}`);
      this.$store.commit("players/update", {
        player,
        property: "isVoteless",
        value: used
      });
      this.notify(
        used ? `${player.name} 的死亡票已用掉。` : `${player.name} 的死亡票恢复可用。`,
        used ? "err" : "ok"
      );
    },
    /** 座位上的标记右键翻转：和纸质魔典把标记翻过来是一个意思 */
    flipReminder(player, index) {
      const list = (player.reminders || []).map(item => Object.assign({}, item));
      const item = list[index];
      if (!item) return;
      if (item.reversed) this.$delete(item, "reversed");
      else item.reversed = true;
      this.mark(`${player.name} ${item.reversed ? "翻转" : "恢复"}标记「${item.name}」`);
      this.$store.commit("players/update", {
        player,
        property: "reminders",
        value: list
      });
    },
    /**
     * 点自己身上的标记 = 直接摘掉这一枚。
     * 源码 Player.vue 里两件事是分开的：`.reminder` 绑 removeReminder，
     * 只有末尾那个 `.reminder.add` 才打开标记面板。这里照做。
     */
    removeReminder(player, index) {
      const list = (player.reminders || []).map(item => Object.assign({}, item));
      const item = list[index];
      if (!item) return;
      list.splice(index, 1);
      this.mark(`${player.name} 移除标记「${item.name}」`);
      this.$store.commit("players/update", {
        player,
        property: "reminders",
        value: list
      });
      this.notify(`已移除「${item.name}」`, "ok");
    },
    /** 投票记录：只留最近 20 条，跟整局存档一起落盘 */
    pushVote(entry) {
      if (!entry) return;
      this.voteLog.unshift(entry);
      if (this.voteLog.length > 20) this.voteLog.pop();
      this.scheduleSave();
    },
    /* ---------- 座位名字的二级菜单 ---------- */
    /**
     * 点名字出菜单（原仓库的 player > .name + ul.menu）。
     * 换角色、换座位、改名、死亡票这些都在这里，名字本身不再直接跳去换角色。
     */
    toggleSeatMenu(index) {
      if (this.menuIndex === index) {
        this.closeSeatMenu();
        return;
      }
      this.closePanels();
      this.settingsOpen = false;
      this.reminderIndex = -1;
      this.pickerIndex = -1;
      const player = this.players[index];
      this.menuName = (player && player.name) || "";
      this.menuMode = "main";
      this.menuShift = { x: 0, y: 0 };
      this.menuIndex = index;
    },
    /**
     * 菜单是相对座位牌绝对定位的，圆环上贴着上边缘的座位会把菜单顶出舞台
     * （.stage 有 overflow:hidden，超出的部分直接被裁，还会被顶栏压住），
     * 贴着左右边缘的座位会把菜单推出屏幕。这里量一次实际矩形，按视口夹回来。
     * li 上的 `> *` 已经把菜单反向旋转到屏幕坐标系，所以这里算出来的位移可以直接用。
     */
    nudgeSeatMenu() {
      this.$nextTick(() => {
        const el = this.$el.querySelector(".seat-menu");
        if (!el || this.menuIndex < 0) return;
        const stage = this.$refs.stage
          ? this.$refs.stage.getBoundingClientRect()
          : { top: 0, height: window.innerHeight };
        const pad = 8;
        const r = el.getBoundingClientRect();
        let dx = 0;
        let dy = 0;
        if (r.right > window.innerWidth - pad) dx = window.innerWidth - pad - r.right;
        if (r.left + dx < pad) dx = pad - r.left;
        if (r.height >= stage.height - pad * 2) {
          dy = stage.top + pad - r.top;
        } else if (r.top < stage.top + pad) {
          dy = stage.top + pad - r.top;
        } else if (r.bottom > stage.top + stage.height - pad) {
          dy = stage.top + stage.height - pad - r.bottom;
        }
        this.menuShift = { x: Math.round(dx), y: Math.round(dy) };
      });
    },
    /** 菜单高度会随「主菜单 / 交换座位 / 改名」变化，每次切换都重新夹一次 */
    watchSeatMenuShift() {
      if (this.menuIndex < 0) return;
      this.menuShift = { x: 0, y: 0 };
      this.nudgeSeatMenu();
    },
    closeSeatMenu() {
      this.menuIndex = -1;
      this.menuMode = "main";
    },
    /** 座位在圆环右半边时，菜单朝左弹，不会飞出屏幕 */
    menuFlipLeft(index) {
      const total = this.players.length || 1;
      const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
      return Math.cos(angle) > 0.3;
    },
    /**
     * 标记圆片往哪边堆：座位在圆桌下半圈就往上堆。
     * 否则 5～8 人局里最下面那个座位的标记会堆到舞台外面被裁掉。
     */
    startRename() {
      const player = this.players[this.menuIndex];
      if (!player) return;
      this.menuName = player.name || "";
      this.menuMode = "rename";
    },
    confirmRename() {
      const player = this.players[this.menuIndex];
      if (!player) return;
      const name = String(this.menuName || "").trim() || this.menuIndex + 1 + "号";
      if (name !== player.name) {
        this.mark(`改名 ${player.name} → ${name}`);
        this.$store.commit("players/update", {
          player,
          property: "name",
          value: name
        });
      }
      this.closeSeatMenu();
    },
    menuDeath(player) {
      this.toggleDeath(player);
      this.closeSeatMenu();
    },
    menuGhostVote(player) {
      this.toggleGhostVote(player);
      this.closeSeatMenu();
    },
    /** 清空这个座位的角色与状态（座位本身留着） */
    clearSeatRole(player) {
      if (!player.role || !player.role.id) return;
      const index = this.players.indexOf(player);
      const oldRole = player.role;
      this.mark(`清空 ${player.name} 的角色`);
      // 先把这个角色带来的非全局标记从全场摘下来（别人挂的标记留着），再清角色
      const groups = this.dropRoleReminders(oldRole);
      this.$store.commit("players/update", {
        player,
        property: "role",
        value: {}
      });
      this.$store.commit("players/update", {
        player,
        property: "isDead",
        value: false
      });
      this.$store.commit("players/update", {
        player,
        property: "isVoteless",
        value: false
      });
      this.closeSeatMenu();
      if (groups.length) {
        this.showUndoBar(
          `${player.name} 的角色已清空，自动移除「${oldRole.name}」带来的标记：${describeRemoved(
            groups,
            index
          )}`,
          groups
        );
      }
    },
    /** 两个座位连人带牌整体交换 */
    /* ---------- 交换座位 / 移动玩家（源码 TownSquare 的 swapPlayer / movePlayer）----------
       两步式：先点菜单进入待选（记录发起座位），再点目标玩家牌上的图标完成。
       不弹窗，和源码一样靠 token 上浮出的 ⇄ / ↻ / ✕ 图标操作。 */
    startSwap(from) {
      this.closeSeatMenu();
      this.moveIndex = -1;
      this.swapIndex = this.swapIndex === from ? -1 : from;
      if (this.swapIndex > -1)
        this.notify("点击目标玩家的 ⇄ 完成交换，点发起者自己的 ⊗ 取消。", "ok");
    },
    startMove(from) {
      this.closeSeatMenu();
      this.swapIndex = -1;
      this.moveIndex = this.moveIndex === from ? -1 : from;
      if (this.moveIndex > -1)
        this.notify("点击目标玩家的 ↻ 完成移动，点发起者自己的 ⊗ 取消。", "ok");
    },
    /* 点了某个座位牌上的操作图标：是发起者自己 → 取消；否则完成交换/移动 */
    confirmSeatOp(index) {
      if (this.swapIndex > -1) {
        const from = this.swapIndex;
        if (index === from) {
          this.swapIndex = -1;
          return;
        }
        const a = this.players[from];
        const b = this.players[index];
        if (!a || !b) return;
        this.mark(`${a.name} 与 ${b.name} 换位（${from + 1} ↔ ${index + 1}）`);
        this.$store.commit("players/swap", [from, index]);
        this.notify(
          `「${a.name}」换到 ${index + 1} 号，「${b.name}」换到 ${from + 1} 号。`,
          "ok"
        );
        this.swapIndex = -1;
      } else if (this.moveIndex > -1) {
        const from = this.moveIndex;
        if (index === from) {
          this.moveIndex = -1;
          return;
        }
        const p = this.players[from];
        if (!p || !this.players[index]) return;
        this.mark(`「${p.name}」从 ${from + 1} 号移到 ${index + 1} 号`);
        this.$store.commit("players/move", [from, index]);
        this.notify(`「${p.name}」移到 ${index + 1} 号，中间的座位依次挪动。`, "ok");
        this.moveIndex = -1;
      }
    },
    /* ---------- 逐座换角色 ---------- */    openPicker(index) {
      const player = this.players[index];
      if (!player) return;
      // 换角色开面板时取消交换/移动的待选（源码 cancel()）
      this.swapIndex = -1;
      this.moveIndex = -1;
      this.clearToast();
      this.closePanels();
      this.closeSeatMenu();
      this.reminderIndex = -1;
      this.pickerIndex = index;
    },
    closePicker() {
      this.pickerIndex = -1;
    },
    /* ---------- 面板互斥 ---------- */
    /**
     * 所有大面板一次只开一个。
     * 之前直接写 `xxxOpen = true`，点「伪装」再点「传奇」会两个弹窗叠在一起，
     * 底下的内容透过 0.8 的黑色背景仍然看得见，非常乱。
     */
    closePanels() {
      this.nightOpen = false;
      this.bluffsOpen = false;
      this.fabledOpen = false;
      this.jinxOpen = false;
      this.voteOpen = false;
    },
    openPanel(name) {
      this.closePanels();
      this.reminderIndex = -1;
      this.pickerIndex = -1;
      this.closeSeatMenu();
      this.clearToast();
      const key = name + "Open";
      if (key in this.$data) this[key] = true;
    },
    /** 快捷键用：已经开着就关上，否则打开（并且关掉其他的） */
    togglePanel(name) {
      const key = name + "Open";
      const wasOpen = !!this[key];
      this.openPanel(name);
      if (wasOpen) this[key] = false;
    },
    /* ---------- 阶段（第几夜 / 第几天） ---------- */
    /**
     * 天亮结算：夜里挂上的「死亡」标记，到白天就要真的死人。
     * 标记本身是角色能力挂上去的（小恶魔 / 涡流 / 卡扎力 / 月之子…），
     * 所以死因记成这枚标记的 role 字段，鼠标悬停显示「死于小恶魔」这种。
     * 先只读地扫一遍桌面：有没有人要结算，决定要不要存撤销快照
     * （没有标记的天数变化不该占一条撤销记录）。
     */
    pendingDeathMarks() {
      const out = [];
      this.players.forEach(player => {
        const marks = (player.reminders || [])
          .map((item, at) => ({ item, at }))
          // 只认名字正好是「死亡」的标记；「选择死」「死亡票」这类不算
          .filter(({ item }) => isDeathMark(item));
        if (marks.length) out.push({ player, marks });
      });
      return out;
    },
    /**
     * 执行上面那份结算清单：摘掉「死亡」标记 + 判死 + 记死因。
     * 已经死的人只摘标记、不改死因（先死的那个原因才是真的）。
     */
    settleDeathMarks(pending) {
      const notes = [];
      (pending || []).forEach(({ player, marks }) => {
        const keep = (player.reminders || []).filter(item => !isDeathMark(item));
        this.$store.commit("players/update", {
          player,
          property: "reminders",
          value: keep
        });
        // 标记的 role 是来源角色 id；自定义标记是 "custom"，查不到就退到「能力」
        const source = marks
          .map(({ item }) => (item && item.role) || "")
          .find(id => id && id !== "custom");
        const role = source ? this.roles.get(String(source)) : null;
        if (!player.isDead) {
          this.$store.commit("players/update", {
            player,
            property: "isDead",
            value: true
          });
          // 死亡票：刚死的人这一票还没用，显式给回 false，避免继承旧状态
          this.$store.commit("players/update", {
            player,
            property: "isVoteless",
            value: false
          });
          this.$store.commit("players/update", {
            player,
            property: "deathBy",
            value: source ? `role:${source}` : "other"
          });
        }
        notes.push(
          `${player.name}${role && role.name ? ` 死于${role.name}` : " 死亡"}`
        );
      });
      return notes;
    },
    /**
     * 阶段移动：第 N 夜 → 第 N 天 → 第 N+1 夜。
     * 第一夜（night === 1 且 isNight）就是起点，再往前没有任何阶段，
     * 所以左按钮直接禁用，点了也不会有效果。
     */
    stepPhase(delta) {
      if (delta < 0) {
        if (!this.canStepBack) return;
        if (!this.isNight) {
          // 第 N 天 → 第 N 夜
          this.isNight = true;
        } else {
          // 第 N 夜 → 第 N-1 天
          this.isNight = false;
          this.night = Math.max(1, this.night - 1);
        }
      } else if (this.isNight) {
        // 第 N 夜 → 第 N 天：天亮了，先把「死亡」标记结算成真死人。
        // 快照要在改之前存，撤销才能把标记和活人一起还回去
        const pending = this.pendingDeathMarks();
        if (pending.length) this.mark(`第 ${this.night} 夜结束，结算死亡标记`);
        this.isNight = false;
        const notes = this.settleDeathMarks(pending);
        if (notes.length) {
          this.notify(`天亮了：${notes.join("、")}（标记已移除）`, "err");
        }
      } else {
        // 第 N 天 → 第 N+1 夜
        this.isNight = true;
        this.night = Math.min(99, this.night + 1);
      }
      this.scheduleSave();
    },
    togglePhase() {
      // 走同一套逻辑，避免从别处跳阶段时漏掉天亮结算
      this.stepPhase(this.isNight ? 1 : -1);
    },
    /**
     * 手机齿轮菜单：每一项都只是转调原来那个按钮的处理函数，
     * 桌面端那排按钮的逻辑一行没动。
     */
    menuPick(kind) {
      /*
       * 只有「会打开另一个窗口」的项才需要收起菜单；
       * 添加座位 / 清空标记 / 撤销是在原地改桌面，收起来反而要再点一次齿轮才能接着做，
       * 所以这三项保持菜单开着。
       */
      if (["addSeat", "clearMarks", "undo"].indexOf(kind) === -1) {
        this.mMenuOpen = false;
      }
      switch (kind) {
        case "new":
          return this.startNewGame();
        case "timer":
          this.timerOpen = !this.timerOpen;
          return;
        case "mask":
          return this.togglePlayerView();
        case "undo":
          return this.history.length ? this.undo() : undefined;
        case "addSeat":
          return this.addSeat();
        case "clearMarks":
          return this.clearAllMarks();
        case "day":
          return this.openSettings("day");
        case "roles":
          // 配置角色是独立入口，不再塞在「人数」面板里
          return this.openRoles();
        case "count":
        case "script":
        case "scale":
        case "quick":
          return this.openSettings(kind);
        case "cloud":
          return this.openCloud();
        default:
          return this.openPanel(kind);
      }
    },
    /* ---------- 云同步（可选：不登录也能照常用本机存档） ---------- */
    openCloud() {
      this.cloudOpen = true;
      cloudState.error = "";
      cloudState.note = "";
      // 已登录就把最新列表拉一遍，面板一打开看到的就是云端现状
      if (cloudState.user) refreshCloud();
    },
    /**
     * 点「存到云端」的那一刻才取快照。
     * 做成方法传下去而不是 computed：不然每次重绘都要给全场座位拍一次照。
     */
    cloudGameRow() {
      const name = this.scriptMeta.name || "自定义剧本";
      return {
        title: `${name} · ${this.players.length}人 · 第${this.night}${
          this.isNight ? "夜" : "天"
        }`,
        scriptName: name,
        playerCount: this.players.length,
        night: this.night,
        isNight: this.isNight,
        payload: {
          version: 2,
          night: this.night,
          isNight: this.isNight,
          bluffs: this.$store.state.players.bluffs || [],
          fabled: this.$store.state.players.fabled || [],
          votes: this.voteLog,
          scriptName: name,
          seats: snapSeats(this.players)
        }
      };
    },
    cloudScriptRow() {
      const raw = this.scriptRaw || BUILTIN_SCRIPT;
      if (!Array.isArray(raw)) return null;
      return {
        name: this.scriptMeta.name || "自定义剧本",
        author: this.scriptMeta.author || "",
        roleCount: this.roleCount,
        payload: raw
      };
    },
    /** 从云端恢复一份牌局：人数不同就按存档重建座位，再逐座回填 */
    applyCloudSave(row) {
      const data = (row && row.payload) || {};
      const seats = data.seats;
      if (!Array.isArray(seats) || !seats.length) {
        this.notify("这份存档没有座位数据，没法恢复。", "err");
        return;
      }
      if (seats.length !== this.players.length) {
        this.$store.commit("players/initSeats", seats.length);
      }
      seats.forEach((seat, index) => this.applySeat(index, seat));
      this.night = Math.max(1, Number(data.night) || 1);
      this.isNight = data.isNight !== false;
      // 剧本换过之后，存档里的伪装 / 传奇 id 可能已经不存在，读不到就丢掉
      this.$store.commit(
        "players/setBluffs",
        (data.bluffs || []).filter(id => this.roles.has(String(id)))
      );
      this.$store.commit(
        "players/setFabled",
        (data.fabled || []).filter(id => this.$store.state.fabled.has(String(id)))
      );
      if (Array.isArray(data.votes)) this.voteLog = data.votes.slice(0, 20);
      this.history = [];
      this.reminderIndex = -1;
      this.pickerIndex = -1;
      this.closeSeatMenu();
      this.persistGame();
      this.persistSettings();
      this.cloudOpen = false;
      this.notify(`已从云端恢复「${row.title || "这份存档"}」。`, "ok");
    },
    applyCloudScript({ meta, payload }) {
      if (!this.applyScript(payload, (meta && meta.name) || "")) return;
      this.persistScript(payload);
      // 和本地导入剧本一致：换剧本就是新开一局
      this.startNewGame(true);
      this.cloudOpen = false;
      this.notify(
        `已从云端载入剧本「${this.scriptMeta.name}」，并新开一局。`,
        "ok"
      );
    },
    /* ---------- 遮罩 / 恶魔伪装 ---------- */
    togglePlayerView() {
      this.playerView = !this.playerView;
      // 开关遮罩都要把亮牌收掉，回到全遮的状态
      this.revealedSeats = [];
      this.swapIndex = -1;
      this.moveIndex = -1;
      if (this.playerView) {
        // 遮罩期间不能留任何面板，否则面板里还是会把身份写出来
        this.reminderIndex = -1;
        this.pickerIndex = -1;
        this.closeSeatMenu();
        this.nightOpen = false;
        this.bluffsOpen = false;
        this.voteOpen = false;
        this.notify("遮罩已打开：所有角色牌都变成「?」。再点一次恢复。", "ok");
      } else {
        this.notify("已恢复显示角色牌。", "ok");
      }
    },
    /** 遮罩模式下点「?」：亮出这个座位的牌面和标记；再点一下盖回去。多个座位可同时亮着 */
    toggleReveal(index) {
      if (!this.playerView) return;
      const i = this.revealedSeats.indexOf(index);
      if (i > -1) {
        this.revealedSeats.splice(i, 1);
      } else {
        this.revealedSeats.push(index);
      }
    },
    showBluffPreview() {
      this.bluffsOpen = false;
      this.clearToast();
      this.bluffPreview = true;
    },
    openReminders(index) {
      const player = this.players[index];
      // 源码里空座位也能放标记（全局标记、别人的标记都可能落在这里），
      // 所以这里只要求座位存在，不要求已经有角色
      if (!player) return;
      this.swapIndex = -1;
      this.moveIndex = -1;
      this.clearToast();
      this.closePanels();
      this.closeSeatMenu();
      this.reminderIndex = index;
    },
    closeReminders() {
      this.reminderIndex = -1;
    },
    /* ---------- 操作记录 / 撤销 ---------- */
    /**
     * 每次会改动整桌状态的动作，先存一份「动作之前」的快照。
     * 存整桌而不是 diff，是因为死亡、换角色、标记都会互相影响，
     * 分别写逆操作容易漏；快照最多 40 份，几个人局的内存开销可以忽略。
     */
    mark(label) {
      this.history.push({
        label: String(label || "操作"),
        snap: snapSeats(this.players),
        night: this.night,
        isNight: this.isNight,
        // 伪装牌和传奇角色不在座位上，得单独存一份，否则撤销还原不回来
        bluffs: (this.$store.state.players.bluffs || []).slice(),
        fabled: (this.$store.state.players.fabled || []).slice()
      });
      if (this.history.length > 40) this.history.shift();
    },
    /** 把一个快照座位写回当前座位（撤销、读档共用同一套还原规则） */
    applySeat(index, seat) {
      const player = this.players[index];
      if (!player || !seat) return;
      // 角色按 id 从角色库重新取：快照里的对象可能是旧剧本的，直接用会串戏。
      // 只支持自定义剧本，剧本里没有的 id（中途入场的旅行者这类）就不还原角色
      const base = seat.id ? this.roles.get(String(seat.id)) || null : null;
      const role = base ? Object.assign({}, base, { selected: 1 }) : {};
      if (base && seat.cover) role.coverOf = seat.cover;
      this.$store.commit("players/restoreSeat", {
        index,
        seat: {
          n: seat.n,
          role,
          d: seat.d,
          db: seat.db,
          v: seat.v,
          note: seat.note,
          r: (seat.r || []).map(item => ({
            role: item.role,
            name: item.name,
            reversed: !!item.reversed
          })),
          nd: seat.nd || {}
        }
      });
    },
    restoreEntry(entry) {
      if (!entry) return;
      if (entry.snap.length !== this.players.length) {
        this.notify("座位数已经变过，这条记录还原不了。", "err");
        return;
      }
      entry.snap.forEach((seat, index) => this.applySeat(index, seat));
      this.$store.commit("players/setBluffs", entry.bluffs || []);
      this.$store.commit("players/setFabled", entry.fabled || []);
      this.night = entry.night;
      this.isNight = entry.isNight;
      this.reminderIndex = -1;
      this.pickerIndex = -1;
    },
    undo() {
      if (!this.history.length) {
        this.notify("没有可撤销的操作。", "err");
        return;
      }
      const entry = this.history.pop();
      this.restoreEntry(entry);
      this.notify(`已撤销：${entry.label}`, "ok");
    },
    /* ---------- 计时器 ---------- */
    startTimer(kind, seconds) {
      this.clearTimer();
      this.timerKind = kind;
      this.timerLeft = Math.max(0, Math.round(seconds));
      this.timerRunning = true;
      this.timerOpen = false;
      this.timerHandle = setInterval(this.tickTimer, 1000);
    },
    tickTimer() {
      if (!this.timerRunning) return;
      if (this.timerLeft > 0) {
        this.timerLeft -= 1;
        if (this.timerLeft === 0) {
          this.timerRunning = false;
          this.clearTimer(true);
          this.timerLeft = 0;
          this.notify(
            `${this.timerKind === "public" ? "公聊" : "私聊"}时间到。`,
            "err"
          );
        }
      }
    },
    pauseTimer() {
      if (this.timerLeft === null) return;
      this.timerRunning = !this.timerRunning;
    },
    stopTimer() {
      this.clearTimer();
      this.timerLeft = null;
      this.timerRunning = false;
    },
    clearTimer(keepLeft) {
      if (this.timerHandle) {
        clearInterval(this.timerHandle);
        this.timerHandle = null;
      }
      if (!keepLeft) this.timerRunning = false;
    },
    /* ---------- 键盘快捷键 ---------- */
    onKeydown(event) {
      const el = event.target;
      const tag = (el && el.tagName ? el.tagName : "").toLowerCase();
      if (tag === "input" || tag === "textarea" || (el && el.isContentEditable)) {
        return;
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        this.undo();
        return;
      }
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      switch (event.key.toLowerCase()) {
        case "n":
          this.togglePanel("night");
          break;
        case "b":
          this.togglePanel("bluffs");
          break;
        case "t":
          this.timerOpen = !this.timerOpen;
          break;
        case "v":
          this.togglePanel("vote");
          break;
        case "h":
          this.togglePlayerView();
          break;
        case "escape":
          this.closePanels();
          this.mMenuOpen = false;
          this.timerOpen = false;
          this.bluffPreview = false;
          this.reminderIndex = -1;
          this.pickerIndex = -1;
          this.closeSeatMenu();
          break;
        default:
          break;
      }
    },
    /* ---------- 整局存档：刷新页面不丢死亡状态与标记 ---------- */
    scheduleSave() {
      if (this.saveTimer) clearTimeout(this.saveTimer);
      this.saveTimer = setTimeout(this.persistGame, 250);
    },
    persistGame() {
      this.saveTimer = null;
      // 空局面不覆盖上一次的有效存档
      if (!this.players.some(player => player.role.id)) return;
      try {
        localStorage.setItem(
          LS_GAME,
          JSON.stringify({
            version: 2,
            night: this.night,
            isNight: this.isNight,
            bluffs: this.$store.state.players.bluffs || [],
            fabled: this.$store.state.players.fabled || [],
            votes: this.voteLog,
            // 座位快照复用撤销用的同一份结构：名字、角色、死亡、死因、
            // 死亡票、笔记、标记（含翻转）、夜序进度都会一起存下来
            seats: snapSeats(this.players)
          })
        );
      } catch (e) {
        /* 隐私模式下存不下就算了，界面上仍然可玩 */
      }
    },
    restoreGame() {
      let data;
      try {
        const raw = localStorage.getItem(LS_GAME);
        if (!raw) return;
        data = JSON.parse(raw);
      } catch (e) {
        return;
      }
      // 旧版存的是裸数组（只有座位），新版外面包了一层 meta
      const seats = Array.isArray(data) ? data : data && data.seats;
      // 人数变了就整局作废：座位对不上，硬套会把角色塞错人
      if (!Array.isArray(seats) || seats.length !== this.players.length) return;
      seats.forEach((seat, index) => this.applySeat(index, seat));
      if (Array.isArray(data)) return;
      this.night = Math.max(1, Number(data.night) || 1);
      this.isNight = data.isNight !== false;
      // 剧本换过之后，旧伪装 / 传奇角色的 id 可能已经不存在了，读不到就丢掉
      this.$store.commit(
        "players/setBluffs",
        (data.bluffs || []).filter(id => this.roles.has(String(id)))
      );
      this.$store.commit(
        "players/setFabled",
        (data.fabled || []).filter(id => this.$store.state.fabled.has(String(id)))
      );
      if (Array.isArray(data.votes)) this.voteLog = data.votes.slice(0, 20);
    },
    /**
     * 添加座位：照源码 Menu.vue 的 addPlayer —— 只往末尾补一个空座位，
     * 已在桌上的人、角色、标记、死亡状态全部原样留着。
     */
    addSeat() {
      if (this.players.length >= 15) {
        this.notify("最多 15 个座位（剧本配比上限）。", "err");
        return;
      }
      this.$store.commit("players/addSeat", 15);
      this.persistSettings();
      this.notify(`已添加一个空座位：现在 ${this.players.length} 人。`, "ok");
    },
    /**
     * 改人数：只增删末尾座位。
     * 以前这里是 initSeats 重建整桌，等于「改人数=清空魔典」，纯属自创；
     * 源码里改人数只是加/减一个 li，已有玩家不受影响。
     */
    changeCount(delta) {
      const from = this.players.length;
      const next = from + delta;
      if (next < 5 || next > 15) return;
      // 减人是从末尾砍的，砍掉的座位上要是已经有角色，得说一声
      const dropped =
        delta < 0 ? this.players.slice(next).filter(p => p.role && p.role.id) : [];
      this.$store.commit("players/resizeSeats", next);
      this.persistSettings();
      if (dropped.length) {
        this.notify(
          `现在是 ${next} 人，末尾 ${dropped.length} 个带角色的座位已被移除。`,
          "err"
        );
      }
    },
    openRoles() {
      if (this.players.length < 5) return;
      this.$store.commit("toggleModal", "roles");
    },
    openRolesFromSettings() {
      this.settingsOpen = false;
      this.openRoles();
    },
    openSettings(tab) {
      this.settingsTab = tab || "count";
      this.settingsOpen = true;
      this.closeSeatMenu();
    },
    /** 打开某一条短语的填空窗口（设置窗口留在后面，关掉展示就退回列表） */
    openQuickPhrase(phrase) {
      this.quickPhrase = phrase;
    },
    isSlot(seg) {
      return isSlot(seg);
    },
    slotType(seg) {
      return slotType(seg);
    },
    slotLabel(type) {
      return slotLabel(type);
    },
    /**
     * 清空标记：把全场所有座位上的提示标记（连同说书人自己那一份）清掉，
     * 角色、生死、名字、笔记一个都不动 —— 所以它不叫「重置座位」，
     * 也不再挂在「玩家人数」面板里（那是改人数的地方，两件事）。
     * 走 mark()，点错了还能 Ctrl+Z 撤回。
     */
    clearAllMarks() {
      const total = this.reminderCount;
      if (!total) {
        this.notify("现在场上没有标记。", "err");
        return;
      }
      this.mark("清空全场标记");
      this.$store.commit("players/clearMarks");
      this.reminderIndex = -1;
      this.notify(`已清空全场 ${total} 个标记，角色和生死状态都保留。`, "ok");
    },
    /**
     * 新开一局：座位清空、伪装/传奇/投票记录全部归零，阶段回到第一夜。
     * 导入剧本也用这一套，所以「导入 = 新开一局」是同一个行为。
     */
    startNewGame(silent) {
      const count = this.players.length || 9;
      this.$store.commit("players/initSeats", count);
      this.$store.commit("players/setBluffs", []);
      this.$store.commit("players/setFabled", []);
      this.voteLog = [];
      this.history = [];
      this.night = 1;
      this.isNight = true;
      this.reminderIndex = -1;
      this.pickerIndex = -1;
      this.menuIndex = -1;
      this.swapIndex = -1;
      this.moveIndex = -1;
      this.nightOpen = false;
      this.bluffsOpen = false;
      this.fabledOpen = false;
      this.jinxOpen = false;
      this.voteOpen = false;
      /*
       * 设置窗口（玩家人数 / 调整天数 / 剧本 / 座位牌大小）不动：
       * 它里面的「内置剧本」「导入 JSON」都走这个方法，以前这里顺手把 settingsOpen
       * 置 false，等于点一下就把设置关掉，想接着改别的还得重新打开。
       * 设置窗口自己的关闭按钮/背景点击照旧能关。
       */
      try {
        localStorage.removeItem(LS_GAME);
      } catch (e) {
        /* ignore */
      }
      if (!silent) {
        this.notify("已新开一局：座位清空，从第一夜开始。", "ok");
      }
    },
    /** 立刻清掉提示条（进入盲抽这类"给别人看"的界面前调用） */
    clearToast() {
      if (this.toastTimer) clearTimeout(this.toastTimer);
      this.toastTimer = null;
      this.toast = "";
    },
    notify(message, type = "ok") {      this.toast = message;
      this.toastType = type;
      if (this.toastTimer) clearTimeout(this.toastTimer);
      // 长提示（设置调整结算会列出角色与配比）多留一点阅读时间
      const duration = String(message).length > 40 ? 6200 : 3400;
      this.toastTimer = setTimeout(() => {
        this.toast = "";
        this.toastTimer = null;
      }, duration);
    },
    /* ---------- 标记自动清理（死亡 / 换角色） ---------- */
    /**
     * 清掉「这个角色自己带来的、非全局」的标记，**扫全场**。
     * 标记不一定挂在这个角色自己的座位上：僧侣的「保护」在别人身上、
     * 占卜师的「干扰项」也在别人身上，只清自己那一格是漏的。
     * 全局标记（remindersGlobal，如「是酒鬼」）是身份信息，必须留下；
     * 别的角色挂上来的标记（比如中毒）也不属于这个人，同样留下。
     * 返回 [{ index, name, items }]，交给撤回条。
     */
    dropRoleReminders(role) {
      return sweepRoleReminders(
        this.players,
        role || {},
        this.$store.commit.bind(this.$store)
      );
    },
    /** 弹撤回条：5 秒后自己消失，点「撤回」把标记原样放回各自座位 */
    showUndoBar(text, groups) {
      const list = (Array.isArray(groups) ? groups : []).filter(
        group => group && group.items && group.items.length
      );
      if (!list.length) return;
      this.undoBar = { text, groups: list };
      if (this.undoTimer) clearTimeout(this.undoTimer);
      this.undoTimer = setTimeout(() => {
        this.undoBar = null;
        this.undoTimer = null;
      }, 5000);
    },
    undoRemoved() {
      const bar = this.undoBar;
      if (!bar) return;
      if (this.undoTimer) clearTimeout(this.undoTimer);
      this.undoTimer = null;
      this.undoBar = null;
      let count = 0;
      (bar.groups || []).forEach(group => {
        const player = this.players[group.index];
        if (!player) return;
        const list = (player.reminders || []).slice();
        (group.items || []).forEach(item => {
          const dup = list.some(
            exist => exist.role === item.role && exist.name === item.name
          );
          if (!dup) {
            list.push(item);
            count += 1;
          }
        });
        this.$store.commit("players/update", {
          player,
          property: "reminders",
          value: list
        });
      });
      this.notify(`已撤回：${count} 个标记已放回原座位。`, "ok");
    },
    /** 换角色 / 面板里标死亡后清完标记的回调 */
    onRoleRemindersRemoved(payload) {
      if (!payload || !payload.groups || !payload.groups.length) return;
      const names = describeRemoved(payload.groups, payload.index);
      const what = payload.dead
        ? `${payload.playerName} 已死亡`
        : `${payload.playerName} 换了角色`;
      this.showUndoBar(
        `${what}，已移除「${payload.roleName || "原角色"}」带来的标记：${names}`,
        payload.groups
      );
    },
    persistSettings() {
      try {
        localStorage.setItem(LS_SCALE, String(this.seatScalePercent));
        localStorage.setItem(LS_COUNT, String(this.players.length));
      } catch (e) {
        /* 隐私模式下 localStorage 可能不可写，忽略即可 */
      }
    },
    persistScript(data) {
      try {
        localStorage.setItem(LS_SCRIPT, JSON.stringify(data));
      } catch (e) {
        this.notify("剧本太大，本机没存下（本次仍可正常使用）。", "err");
      }
    },
    /**
     * 载入一份剧本 JSON。
     * 角色解析完全复用原仓库的 setCustomRoles，这里只做校验与界面状态同步。
     */
    applyScript(data, fileName, silent = false) {
      const fail = message => {
        if (!silent) this.notify(message, "err");
        return false;
      };
      if (!Array.isArray(data)) {
        return fail("这不是一个剧本 JSON（顶层应为数组）。");
      }
      if (!data.some(entry => entry && entry.id && entry.id !== "_meta")) {
        return fail("这个 JSON 里没有找到角色定义（缺少 id 字段）。");
      }
      // 元信息先取，commit 之后 _meta 会被清洗
      const nextMeta = metaOf(data, (fileName || "").replace(/\.json$/i, ""));
      try {
        this.$store.commit("setCustomRoles", data);
      } catch (err) {
        return fail("读取剧本失败：" + (err && err.message ? err.message : err));
      }
      if (!this.$store.state.roles.size) {
        return fail("这个剧本里没有可用的镇民 / 外来者 / 爪牙 / 恶魔角色。");
      }
      this.scriptMeta = nextMeta;
      // 存一份原文：云端「把当前剧本存上去」直接用，不用再从 localStorage 反解析
      this.scriptRaw = data;
      // 旧剧本的待抽取角色作废
      this.$store.commit("session/setDrawRoles", []);
      return true;
    },
    importScript(event) {
      const input = event.target;
      const file = input.files && input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        input.value = "";
        let data;
        try {
          data = JSON.parse(String(reader.result));
        } catch (e) {
          this.notify("无法解析这个文件，请确认是合法的 JSON。", "err");
          return;
        }
        if (!this.applyScript(data, file.name)) return;
        this.persistScript(data);
        // 导入剧本 = 新开一局（用户要求）：座位清空、阶段回第一夜
        this.startNewGame(true);
        this.notify(
          `已载入「${this.scriptMeta.name}」，共 ${this.roleCount} 个角色。已新开一局，从第一夜开始。`,
          "ok"
        );
      };
      reader.onerror = () => this.notify("读取文件失败，请重试。", "err");
      reader.readAsText(file, "utf-8");
    },
    reloadBuiltinScript() {
      if (!this.applyScript(BUILTIN_SCRIPT, "死亡笔记")) return;
      try {
        localStorage.removeItem(LS_SCRIPT);
      } catch (e) {
        /* ignore */
      }
      this.startNewGame(true);
      this.notify(`已恢复内置剧本「${this.scriptMeta.name}」，并新开一局。`, "ok");
    },
    restoreSettings() {
      let count = 12;
      try {
        const savedCount = Number(localStorage.getItem(LS_COUNT));
        if (savedCount >= 5 && savedCount <= 15) count = savedCount;
        const savedScale = Number(localStorage.getItem(LS_SCALE));
        if (savedScale >= 70 && savedScale <= 180) {
          this.seatScalePercent = savedScale;
        }
        const rawScript = localStorage.getItem(LS_SCRIPT);
        if (rawScript) {
          this.applyScript(JSON.parse(rawScript), "", true);
        } else {
          // 第一次打开（或清过缓存）时角色库是空的，必须先把内置剧本装进去，
          // 否则所有座位牌都是空圆
          this.applyScript(BUILTIN_SCRIPT, "死亡笔记", true);
        }
      } catch (e) {
        /* 设置损坏时退回默认值 */
      }
      this.$store.commit("players/initSeats", count);
    }
  },
  watch: {
    // 盲抽界面是给玩家看的：一打开就把提示条清掉，
    // 否则「认知覆盖 酒鬼 → 伪装牌「xx」」这种结算信息会留在屏幕上，等于当场剧透
    drawOpen(isOpen) {
      if (isOpen) {
        this.clearToast();
        // 标记面板同样会写着真实身份，必须一起关掉
        this.reminderIndex = -1;
        // 投票面板带阵营标签，给玩家看之前也要收起
        this.voteOpen = false;
      }
    },
    // 不管从哪个入口打开菜单，都统一量一次位置再夹回视口
    menuIndex(v) {
      if (v >= 0) {
        this.menuShift = { x: 0, y: 0 };
        this.nudgeSeatMenu();
      }
    },
    // 主菜单 ⇄ 交换座位 ⇄ 改名，高度不一样，每次切换都把菜单重新夹回视口
    menuMode() {
      this.watchSeatMenuShift();
    },
    // 角色分配、死亡、标记、座位数任何一项变化都落一次盘（防抖 250ms）
    players: {
      deep: true,
      handler() {
        this.scheduleSave();
      }
    }
  },
  mounted() {
    this.restoreSettings();
    // 存档要在角色库载入之后还原，否则拿不到角色对象
    this.restoreGame();
    // 允许子组件（如配置角色弹窗）通过 $root 发提示
    this.$root.$on("notify", this.notify);
    // 子面板（标记、换角色、伪装、传奇）统一把「动作之前的快照」交给这里，
    // 否则撤销只记得住圆牌上的操作，面板里做的事全都不可回退
    this.$root.$on("grimoire:mark", this.mark);
    // 圆桌直径依赖头部/底部的实际高度，窗口尺寸一变就得重算
    this.$nextTick(this.measureStage);
    window.addEventListener("resize", this.measureStage);
    // 快捷键（N/B/T/V/H/Esc/Ctrl+Z）：只写在 methods 里是不会被调用的
    window.addEventListener("keydown", this.onKeydown);
    // 云服务：恢复登录态、处理登录回跳。失败只影响云同步面板，本机魔典照常
    initCloud();
  },
  beforeDestroy() {
    this.$root.$off("notify", this.notify);
    this.$root.$off("grimoire:mark", this.mark);
    window.removeEventListener("keydown", this.onKeydown);
    window.removeEventListener("resize", this.measureStage);
    if (this.toastTimer) clearTimeout(this.toastTimer);
    if (this.undoTimer) clearTimeout(this.undoTimer);
    if (this.saveTimer) clearTimeout(this.saveTimer);
  }
};
</script>

<style lang="scss">
@use "sass:math";
@import "vars";

/* 渐变定义容器（源码 Gradients.vue 的 scoped 样式） */
#gradients svg {
  position: absolute;
  z-index: -1;
}

/* 交换/移动待选时发起者座位的光圈（.op-from .player:after 用） */
@keyframes opPulse {
  0%,
  100% {
    opacity: 0.35;
  }
  50% {
    opacity: 1;
  }
}

@font-face {
  font-family: "Papyrus";
  src: url("assets/fonts/papyrus.woff2") format("woff2"),
    url("assets/fonts/papyrus.woff") format("woff"),
    url("assets/fonts/papyrus.ttf") format("truetype");
}

@font-face {
  font-family: PiratesBay;
  src: url("assets/fonts/piratesbay.ttf");
  font-display: swap;
}

html,
body {
  font-size: 1.2em;
  line-height: 1.4;
  background: url("assets/background.jpg") center center;
  background-size: cover;
  color: white;
  height: 100%;
  font-family: "Roboto Condensed", "Noto Sans SC", "PingFang SC",
    "Microsoft YaHei", sans-serif;
  -webkit-font-smoothing: antialiased;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

* {
  box-sizing: border-box;
  position: relative;
}

h1,
h2,
h3,
h4,
h5 {
  margin: 0;
  text-align: center;
  font-family: PiratesBay, "Noto Sans SC", sans-serif;
  letter-spacing: 1px;
  font-weight: normal;
}

ul {
  list-style-type: none;
  margin: 0;
  padding: 0;
}

#app {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: rgba(0, 0, 0, 0.35);
}

/* ---------- top bar ---------- */
.topbar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 18px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0.12));
  /* 齿轮面板是相对顶栏的 absolute，需要定位上下文；
     层级要高于菜单遮罩(55)、低于通用弹窗(100) */
  position: relative;
  z-index: 70;
  /* 工具条永远一行：标题区可以压缩，按钮区保持完整 */
  flex-wrap: nowrap;

  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    flex: 1 1 auto;
    overflow: hidden;
    .crest {
      width: 42px;
      height: 42px;
      flex: none;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: PiratesBay, serif;
      font-size: 1.35em;
      color: #ffd9a0;
      background: radial-gradient(circle at 30% 25%, #6d3b1c, #2a1207 70%);
      border: 2px solid rgba(255, 210, 150, 0.5);
      box-shadow: 0 0 14px rgba(0, 0, 0, 0.8), inset 0 0 8px rgba(255, 180, 90, 0.25);
    }
    .brand-text {
      min-width: 0;
      h1 {
        text-align: left;
        font-size: 1.15em;
        letter-spacing: 2px;
        text-shadow: 0 2px 6px #000;
        // 标题必须一行：按钮区有十几个按钮，标题一换行整条工具条就变高
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      p {
        margin: 2px 0 0;
        font-size: 0.6em;
        color: #b9b9b9;
        letter-spacing: 1px;
        // 剧本名 + 作者 + 角色数 + 人数，一行放不下就省略，别把工具条挤到第二行
        max-width: 380px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        .script-name {
          color: #ffce8a;
        }
        .sep {
          margin: 0 6px;
          opacity: 0.5;
        }
      }
    }
  }

  /*
   * 那一排 13 个工具按钮：功能已全部并入右上角齿轮菜单，这里不再显示。
   * DOM 仍然留着（键盘快捷键和既有验收脚本还引用它），但视觉上完全不存在，
   * 也刻意不再有任何「宽屏显示 / 窄屏隐藏」的断点。
   */
  .top-actions {
    display: none;
  }
}

.seats-ctl {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 15px;
  background: rgba(0, 0, 0, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 0.8em;
  width: fit-content;
  .lbl {
    color: #b9b9b9;
    margin-left: 4px;
    letter-spacing: 1px;
  }
  b {
    min-width: 26px;
    text-align: center;
    font-size: 1.15em;
    color: #ffce8a;
  }
  .step {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: linear-gradient(#4e4e4e, #0b0b0b);
    color: #fff;
    font-size: 0.95em;
    line-height: 1;
    cursor: pointer;
    &:hover:not(:disabled) {
      color: red;
    }
    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }
}

/* ---------- stage ---------- */
.stage {
  position: relative;
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 20px 20px;
  /* 圆桌尺寸由 JS 按实测宽高给出，溢出时裁掉而不是压到标题栏上 */
  overflow: hidden;
}

/* 圆桌：源码 townsquare 的 ul.circle，100% 铺满舞台 */
.circle {
  padding: 0;
  margin: 0;
  list-style: none;
  position: relative;
  height: 100%;
  max-height: 100%;
  max-width: 100%;
  aspect-ratio: 1 / 1;
  /* 牌径：JS 按源码 Player.vue 的 zoom 分档给出 vh 值 */
  --seat-size: calc(var(--seat-vh, 16) * 1vh);
  --name-h: calc(var(--seat-size) * 0.3);

  &::before {
    content: "";
    position: absolute;
    inset: 14%;
    border-radius: 50%;
    border: 1px dashed rgba(255, 255, 255, 0.08);
  }

  /* 源码 .circle > li：以圆心为旋转原点向外放射 */
  > li {
    position: absolute;
    left: 50%;
    height: 50%;
    transform-origin: 0 100%;
    pointer-events: none;
  }
}

/* 以下整段照抄 townsquare TownSquare.vue 的 @mixin on-circle */
@mixin on-circle($item-count) {
  $angle: math.div(360, $item-count);
  $rot: 0;

  @for $i from 1 through $item-count {
    &:nth-child(#{$i}) {
      transform: rotate($rot * 1deg);
      @if $i - 1 <= math.div($item-count, 2) {
        z-index: $item-count - $i + 1;
      } @else {
        z-index: $i - 1;
      }

      > * {
        transform: rotate($rot * -1deg);
      }

      .life,
      .token,
      .shroud,
      .night-order,
      .seat {
        animation-delay: ($i - 1) * 50ms;
        transition-delay: ($i - 1) * 50ms;
      }

      // move reminders closer to the sides of the circle
      $q: math.div($item-count, 4);
      $x: $i - 1;
      @if $x < $q or ($x >= math.div($item-count, 2) and $x < $q * 3) {
        .player {
          margin-bottom: -10% + 20% * (1 - math.div($x % $q, $q));
        }
      } @else {
        .player {
          margin-bottom: -10% + 20% * math.div($x % $q, $q);
        }
      }
    }
    $rot: $rot + $angle;
  }
}

@for $i from 1 through 20 {
  .circle.size-#{$i} > li {
    @include on-circle($item-count: $i);
  }
}

/*
 * 座位 = 源码 townsquare 的 .circle > li：绝对定位、以圆心为旋转原点，
 * 牌贴在 li 顶端，标记接在牌后面，于是标记天然朝桌心，不需要算角度。
 */
.seat {
  position: absolute;
  left: 50%;
  height: 50%;
  transform-origin: 0 100%;
  pointer-events: none;
  width: var(--seat-size);
  z-index: 2;

  /* 座位号：照抄源码 .player .seatNum —— top:-5%; left:8%; font-size:120%，
     压在牌面左上角里侧。以前写成 left:-13% 跑到牌外面，
     左边和右边那两张牌的号码会被舞台裁掉。 */
  .seatNum {
    position: absolute;
    left: 8%;
    top: -5%;
    z-index: 9;
    font-size: calc(var(--seat-size) * 0.2);
    line-height: 1;
    font-weight: bold;
    color: #fff;
    text-shadow: -1px -1px #000, 1px -1px #000, -1px 1px #000, 1px 1px #000,
      0 2px 4px rgba(0, 0, 0, 0.9);
    pointer-events: none;
  }

  /* ---------- 交换/移动待选图标（源码 Player.vue 的 .overlay）----------
     照抄源码：不是浮一个小圆按钮，而是把 FontAwesome 字形本身铺在牌中央
     （宽 50% 高 60%），白色描边 + 灰黑渐变填充 + 黑色投影。
     目标玩家显示 ⇄ / ↻，发起者显示 ⊗（times-circle）取消。 */
  .overlay {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    z-index: 12;

    &:after {
      content: " ";
      display: block;
      padding-top: 100%;
    }

    svg {
      position: absolute;
      filter: drop-shadow(0 0 3px black);
      z-index: 2;
      cursor: pointer;
      pointer-events: all;
      width: 50%;
      height: 60%;
      transition: all 250ms;
      * {
        stroke-width: 10px;
        stroke: #fff;
        fill: url(#default);
      }
      &:hover * {
        fill: url(#demon);
      }
    }
  }
  /* 发起者座位：待选期间一圈呼吸光，方便认出点 ✕ 取消的是谁 */
  &.op-from {
    .player:after {
      content: "";
      position: absolute;
      inset: -4px;
      border-radius: 50%;
      border: 2px solid rgba(255, 190, 110, 0.8);
      animation: opPulse 1.6s ease-in-out infinite;
      pointer-events: none;
      z-index: 11;
    }
  }

  /* ---------- 牌本体：源码 .circle .player ---------- */
  .player {
    position: relative;
    margin-left: -50%;
    margin-bottom: 10px;
    width: 100%;
    pointer-events: all;
    z-index: 1;

    /* 源码用这个 padding 撑出正方形，牌径 = li 宽 */
    &:before {
      content: " ";
      display: block;
      padding-top: 100%;
    }

    /* 源码 .player .token：牌面绝对定位盖在这个正方形上（源码只有 width，没有 height） */
    .token {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
  }

  /* 遮罩模式：牌面换成同尺寸的暗色圆牌 + 问号，不能只留一个裸字符 */
  .mask-face {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    aspect-ratio: 1 / 1;
    border-radius: 50%;
    border: 3px solid #000;
    background: radial-gradient(circle at 38% 30%, #4b4b4b, #141414 74%);
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.55),
      inset 0 0 18px rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #7a7a7a;
    font-size: calc(var(--seat-size) * 0.46);
    font-weight: bold;
    line-height: 1;
    text-shadow: 0 2px 5px rgba(0, 0, 0, 0.9);
    cursor: pointer;
    user-select: none;
  }

  /* 遮罩模式下被点开的座位：同一个位置亮出真的牌面，点一下盖回去 */
  .reveal-face {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    aspect-ratio: 1 / 1;
    cursor: pointer;
  }

  .empty-seat {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    aspect-ratio: 1 / 1;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    background: radial-gradient(circle at 40% 32%, #4a4a4a, #1d1d1d 72%);
    border: 3px solid #0b0b0b;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.6), inset 0 0 12px rgba(0, 0, 0, 0.8);
    color: #7c7c7c;
    font-size: 0.9em;
    letter-spacing: 1px;
    cursor: pointer;
    span {
      pointer-events: none;
    }
  }

  /*
   * 生命牌：源码 Player.vue 的 .life（一字不改）。
   * life.png 是牌背面，death.png 是死亡时的牌背（都是 470×470）。
   * 平时 rotateY(180deg) + backface hidden 翻在背面看不见，死亡时翻回正面。
   * 源码没给 .life 任何 z-index，它靠 DOM 顺序待在 .token 下面，
   * 所以死亡时角色牌照样看得见，不是一块黑布把牌整个糊掉。
   * 只做视觉、不吃点击（源码用 @click 切状态，我们交给 shroud / token）。
   */
  .life {
    border-radius: 50%;
    width: 100%;
    background: url("assets/life.png") center center;
    background-size: 100%;
    border: 3px solid black;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    cursor: pointer;
    transition: transform 200ms ease-in-out;
    transform: perspective(400px) rotateY(180deg);
    backface-visibility: hidden;
    position: absolute;
    left: 0;
    top: 0;
    pointer-events: none;

    &:before {
      content: " ";
      display: block;
      padding-top: 100%;
    }
  }

  .player.dead .life {
    background-image: url("assets/death.png");
    transform: perspective(400px) rotateY(0deg);
  }

  /*
   * 帷幕：整段照抄 townsquare 的 Player.vue。
   * 热区只占上 45%，所以牌的下半部分点下去是换角色（源码就是这个分工）。
   * 平时布面 opacity 0；悬停浮出半透（预览）；死了就整块盖上。
   */
  .shroud {
    top: 0;
    left: 0;
    position: absolute;
    width: 100%;
    height: 45%;
    cursor: pointer;
    transform: rotateX(0deg);
    transform-origin: top center;
    transition: transform 200ms ease-in-out;
    z-index: 6;
    filter: drop-shadow(0 0 5px rgba(0, 0, 0, 0.8));

    &:before {
      content: " ";
      background: url("assets/shroud.png") center -10px no-repeat;
      /* shroud.png 本身就是一块 233×419 的窄布幡（带燕尾下摆），
         源码 auto 110% 是等比缩放：布宽约牌宽的三分之一，从牌顶垂下来 */
      background-size: auto 110%;
      position: absolute;
      margin-left: -50%;
      width: 100%;
      height: 100%;
      left: 50%;
      top: -30%;
      opacity: 0;
      transform: perspective(400px) scale(1.5);
      transform-origin: top center;
      transition: all 200ms;
      pointer-events: none;
    }

    &:hover:before {
      opacity: 0.5;
      top: -10px;
      transform: scale(1);
    }

  }

  /* 源码 .player.dead .shroud:before：死了布落下来（opacity 1、top 0、去掉预缩放） */
  .player.dead .shroud:before {
    opacity: 1;
    top: 0;
    transform: perspective(400px) scale(1);
  }

  /*
   * 夜序：照抄 townsquare 的 .night-order。
   * 外层是一整块透明热区（pointer-events: none，点过去还是帷幕/牌面），
   * 里面一枚圆形编号牌：首夜贴左边、其他夜贴右边，一半悬在牌外；
   * 编号牌自己可悬停，悬停才弹出「首夜 / 其他夜 + 提醒文字」。
   */
  .night-order {
    /* 源码 TownSquare.vue `.night-order`：从牌顶开始、宽 100%，高度由 :after 的
       padding-top:100% 撑成一个「牌面大小的正方形」。这里不能写 inset:0 ——
       .player 的盒子里还排着名字条，inset 会把名字的高度也算进去，
       编号牌就被推到牌心下方去了（源码是相对牌面居中） */
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
    z-index: 7;
    display: flex;
    align-items: center;
    pointer-events: none;
    transition: opacity 200ms;

    /* 源码用它把外层撑成正方形（宽高比 1:1），和牌面完全对齐 */
    &:after {
      content: " ";
      display: block;
      padding-top: 100%;
    }

    em {
      /*
       * 编号牌是牌径的 30%（源码 40px / 牌宽 16vh ≈ 28%，手机 20px / 62px ≈ 32%，
       * 取中间值）。这里必须写百分比、不能写死 40px：
       * 牌径是 vh/vw 给的，人越多、屏幕越窄牌越小，写死 px 的话
       * 牌缩到 60px 时 40px 的编号牌就把整张脸盖住了。
       * 百分比相对 .night-order（宽 100%、高由 :after 撑成同宽）= 30% 牌径，
       * 电脑和手机同一套逻辑，不需要任何断点。
       */
      font-style: normal;
      position: absolute;
      width: 30%;
      height: 30%;
      border-radius: 50%;
      /* 黑边同样按牌径走（源码 3px 约等于牌径 2%），窄屏不会糊成一圈黑 */
      border: max(1px, calc(var(--seat-size) * 0.02)) solid black;
      filter: drop-shadow(0 0 6px rgba(0, 0, 0, 0.5));
      font-weight: bold;
      font-size: calc(var(--seat-size) * 0.135);
      line-height: 1;
      color: #fff;
      display: flex;
      justify-content: center;
      align-items: center;
      pointer-events: all;
      cursor: default;
      transition: background 200ms;
    }

    /* 首夜：镇民蓝 */
    &.first em {
      left: -10%;
      background: linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, #1f65ff 100%);
    }

    /* 其他夜：恶魔红 */
    &.other em {
      right: -10%;
      background: linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, #ce0100 100%);
    }

    /* 夜序面板打勾了 → 编号变绿 */
    &.done em {
      background: linear-gradient(180deg, rgba(0, 0, 0, 1) 0%, #2f9e55 100%);
    }

    /* 悬停才出现的提醒文字（源码同一个位置、同一个样式） */
    span {
      display: flex;
      position: absolute;
      padding: 5px 10px 5px 30px;
      width: 350px;
      z-index: 25;
      font-size: 0.7em;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 10px;
      border: 3px solid black;
      filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.5));
      text-align: left;
      align-items: center;
      opacity: 0;
      transition: opacity 200ms ease-in-out;
      pointer-events: none;

      &:before {
        transform: rotate(-90deg);
        transform-origin: center top;
        left: -98px;
        top: 50%;
        font-size: 100%;
        position: absolute;
        font-weight: bold;
        text-align: center;
        width: 200px;
      }

      &:after {
        content: " ";
        border: 10px solid transparent;
        width: 0;
        height: 0;
        position: absolute;
      }
    }

    &.first span {
      right: 120%;
      background: linear-gradient(
        to right,
        #1f65ff 0%,
        rgba(0, 0, 0, 0.5) 20%
      );
      &:before {
        content: "首夜";
      }
      &:after {
        border-left-color: #1f65ff;
        margin-left: 3px;
        left: 100%;
      }
    }

    &.other span {
      left: 120%;
      background: linear-gradient(
        to right,
        #ce0100 0%,
        rgba(0, 0, 0, 0.5) 20%
      );
      &:before {
        content: "其他夜";
      }
      &:after {
        right: 100%;
        margin-right: 3px;
        border-right-color: #ce0100;
      }
    }

    em:hover + span {
      opacity: 1;
    }
  }

  /* ---------- 死亡：由 .life 的 death.png 负责，牌面本身不褪色（源码如此） ---------- */

  /* ---------- 死亡票：右下角 ---------- */
  /* 源码 Player.vue 的遗言票图标：.player .has-vote / .has-vote */
  .has-vote {
    color: #fff;
    filter: drop-shadow(0 0 3px black);
    transition: opacity 250ms;
    z-index: 2;
    position: absolute;
    margin-top: -15%;
    right: 2px;
    cursor: pointer;
  }

  .secret-no-vote {
    color: red;
    filter: drop-shadow(0 0 3px black);
    transition: opacity 250ms;
    z-index: 2;
    position: absolute;
    margin-top: -15%;
    right: 2px;
    cursor: pointer;
  }

  /* ---------- 死于处决的角标 ---------- */
  .death-flag {
    position: absolute;
    right: -3%;
    top: -10%;
    z-index: 10;
    min-width: clamp(14px, calc(var(--seat-size) * 0.3), 24px);
    height: clamp(14px, calc(var(--seat-size) * 0.3), 24px);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    border: 1px solid rgba(230, 120, 120, 0.6);
    background: radial-gradient(circle at 36% 30%, #6d2222, #2a0808);
    color: #ffd6d6;
    font-size: clamp(7px, calc(var(--seat-size) * 0.13), 11px);
    /* 要能悬停才出浮字；圆点压在牌角外侧，挡不到「点牌面盖帷幕」的大块热区 */
    pointer-events: auto;
    cursor: help;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.7);

    /*
     * 悬浮说明：只有「处 / 死」一个字没人看得懂，悬停浮出完整一句。
     * 字号固定 px，不跟 --seat-size 缩：座位牌缩小是为了放得下，字是给人读的。
     * 位置往左展开（不是往上）：.stage 是 overflow:hidden，顶排座位的角标
     * 离上沿只有十几像素，气泡往上放会被舞台裁掉，等于永远看不见。
     */
    &::after {
      content: attr(data-tip);
      position: absolute;
      right: calc(100% + 6px);
      top: 50%;
      padding: 4px 9px;
      border-radius: 5px;
      border: 1px solid rgba(201, 173, 126, 0.45);
      background: rgba(12, 10, 8, 0.97);
      color: #f4ecdd;
      font-size: 12px;
      line-height: 1.4;
      letter-spacing: 0.5px;
      white-space: nowrap;
      opacity: 0;
      visibility: hidden;
      transform: translateY(-50%) translateX(3px);
      transition: opacity 120ms ease, transform 120ms ease;
      pointer-events: none;
      z-index: 40;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.75);
    }
    &:hover::after {
      opacity: 1;
      visibility: visible;
      transform: translateY(-50%) translateX(0);
    }
  }

  /*
   * 提示标记 + 加号：照抄 townsquare 的 .reminder。
   * 牌下面竖着一列木圆片，直径正好是牌的一半，圆片上半放角色图标、
   * 下半压一行标记名；最后一片是加号，平时透明，悬停座位才浮上来。
   */
  /* 源码 .circle .reminder：直径是牌的一半，排在 li 里往下堆 */
  .reminder {
    position: relative;
    width: 50%;
    height: 0;
    padding-bottom: 50%;
    box-sizing: content-box;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 5px 0 0 -25%;
    flex: none;
    border-radius: 50%;
    border: 3px solid black;
    background: url("assets/reminder.png") center center;
    background-size: 100%;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
    transition: all 200ms;
    cursor: pointer;
    pointer-events: all;

    .icon {
      position: absolute;
      top: 0;
      width: 90%;
      height: 90%;
      background-size: 100%;
      background-position: center 0;
      background-repeat: no-repeat;
      background-image: url("assets/plus.png");
      transition: opacity 200ms;
      pointer-events: none;
    }

    /* 源码 .text：压在圆片下半，黑色字 + 米色描边 */
    .text {
      line-height: 90%;
      color: black;
      font-size: 50%;
      font-weight: bold;
      text-align: center;
      margin-top: 50%;
      height: 100%;
      width: 100%;
      position: absolute;
      top: 15%;
      text-shadow: 0 1px 1px #f6dfbd, 0 -1px 1px #f6dfbd, 1px 0 1px #f6dfbd,
        -1px 0 1px #f6dfbd;
      pointer-events: none;
    }

    /* 翻转过的标记（源码里悬停盖一张 x.png） */
    &.reversed {
      filter: grayscale(0.75) brightness(0.85);
    }

    /* 加号：源码 .reminder.add —— 平时藏在下面 30px 处且透明 */
    &.add {
      opacity: 0;
      top: 30px;
      .icon {
        top: 5%;
      }
    }
  }

  /* 悬停座位 → 加号浮上来（源码 .circle li:hover .reminder.add） */
  &:hover .reminder.add,
  .reminder.add.active {
    opacity: 1;
    top: 0;
  }
  /* ---------- 名字胶囊 ---------- */
  /* 源码 Player.vue 的 .player > .name：和角色牌同一个盒子里的兄弟元素，
     排在牌的下方（文档流），不是绝对定位压进牌面里 */
  .seat-name {
    right: 10%;
    display: flex;
    justify-content: center;
    font-size: 80%;
    line-height: 170%;
    cursor: pointer;
    white-space: nowrap;
    width: 120%;
    background: rgba(0, 0, 0, 0.5);
    border: 3px solid black;
    border-radius: 10px;
    top: 5px;
    box-shadow: 0 0 5px black;
    padding: 0 4px;
    color: #fff;
    font-family: inherit;
    text-align: center;
    overflow: hidden;
    z-index: 10;
    transition: color 160ms;

    span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      text-align: center;
      flex-grow: 1;
    }

    &:hover,
    &.active {
      color: red;
    }
    &.dead {
      opacity: 0.5;
    }
    &.empty {
      color: #9a9a9a;
      background: rgba(0, 0, 0, 0.45);
    }
  }

  /*
   * 名字菜单打开时，把这一整个座位抬到最上层。
   * 圆环上每个 li 的 z-index 由 @mixin on-circle 按顺序给（1~10），
   * 菜单自身写的 z-index:60 只在这个 li 内部有效 —— li 之间的层级没变，
   * 于是排在后面的座位，它的角色牌和提示标记会直接盖在菜单上面。
   */
  &.menu-open {
    z-index: 900 !important;
  }

  /* ---------- 名字的二级菜单 ---------- */
  .seat-menu {
    position: absolute;
    left: calc(100% + 12px);
    top: 50%;
    transform: translateY(-50%);
    width: 168px;
    padding: 5px;
    border-radius: 10px;
    border: 3px solid #000;
    background: rgba(8, 8, 8, 0.96);
    box-shadow: 0 10px 26px rgba(0, 0, 0, 0.8);
    z-index: 60;
    text-align: left;

    /* 座位在圆环右半边时朝左弹，避免菜单飞出屏幕 */
    &.flip {
      left: auto;
      right: calc(100% + 12px);
    }

    .sm-item {
      display: flex;
      align-items: center;
      gap: 7px;
      width: 100%;
      padding: 5px 7px;
      border: none;
      border-radius: 7px;
      background: none;
      color: #e4ded2;
      font-family: inherit;
      font-size: calc(var(--seat-size) * 0.17);
      text-align: left;
      cursor: pointer;
      white-space: nowrap;
      &:hover {
        color: #ffce8a;
        background: rgba(255, 206, 138, 0.1);
      }
      &.danger:hover {
        color: #ff9b9b;
        background: rgba(255, 90, 90, 0.12);
      }
      svg {
        width: 0.95em;
        opacity: 0.85;
      }
    }

    .sm-cap {
      margin: 2px 4px 5px;
      font-size: calc(var(--seat-size) * 0.155);
      color: #8f8f8f;
      letter-spacing: 0.5px;
    }
    .sm-input {
      width: 100%;
      padding: 4px 7px;
      border-radius: 7px;
      border: 1px solid rgba(255, 255, 255, 0.18);
      background: rgba(255, 255, 255, 0.06);
      color: #fff;
      font-family: inherit;
      font-size: calc(var(--seat-size) * 0.17);
      outline: none;
      &:focus {
        border-color: rgba(255, 206, 138, 0.65);
      }
    }
    .sm-row {
      display: flex;
      gap: 4px;
      margin-top: 5px;
    }
  }
}

/* ---------- 桌子中央 ---------- */
.center {
  position: absolute;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%);
  text-align: center;
  width: 42%;
  z-index: 1;

  .count-big {
    font-family: PiratesBay, serif;
    font-size: 3.4em;
    line-height: 1;
    color: #fff;
    opacity: 0.14;
    letter-spacing: 2px;
  }
  .count-label {
    margin-top: -0.5em;
    font-size: 0.62em;
    letter-spacing: 6px;
    color: rgba(255, 255, 255, 0.28);
  }
  .center-status {
    margin-top: 14px;
    font-size: 0.68em;
    letter-spacing: 2px;
    color: #c9a06a;
    &.done {
      color: #7fd39a;
    }
  }
  .center-life {
    margin-top: 8px;
    font-size: 0.6em;
    letter-spacing: 1px;
    .alive {
      color: #7fd39a;
    }
    .dead {
      color: #d98a8a;
    }
    .divider {
      margin: 0 6px;
      opacity: 0.4;
    }
  }
  .center-btn {
    margin-top: 12px;
    font-size: 0.72em;
    padding: 0 16px;
    line-height: 210%;
  }
}

/* ---------- 桌子中央的阶段切换 ---------- */
.center .phase {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin-bottom: 2px;
  .phase-step {
    width: 20px;
    height: 20px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid rgba(201, 173, 126, 0.3);
    background: rgba(0, 0, 0, 0.4);
    color: #c9a06a;
    font-size: 0.7em;
    line-height: 1;
    cursor: pointer;
    &:hover {
      color: #ffe0ad;
      border-color: rgba(255, 206, 138, 0.7);
    }
  }
  .phase-label {
    min-width: 62px;
    padding: 1px 8px;
    border-radius: 10px;
    border: 1px solid rgba(120, 150, 200, 0.35);
    background: rgba(30, 46, 70, 0.5);
    color: #a9c8ee;
    font-size: 0.6em;
    letter-spacing: 2px;
    line-height: 180%;
    cursor: pointer;
    transition: all 180ms;
    &.day {
      border-color: rgba(220, 180, 110, 0.4);
      background: rgba(70, 54, 24, 0.5);
      color: #f0cf98;
    }
    &:hover {
      filter: brightness(1.2);
    }
  }
}

  /* ---------- 中央计时 ---------- */.center .timer-display {
  margin-top: 8px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 3px 10px;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.55);
  border: 1px solid rgba(201, 173, 126, 0.35);
  .t-label {
    font-size: 0.55em;
    letter-spacing: 2px;
    color: #c9a06a;
  }
  .t-time {
    font-family: PiratesBay, serif;
    font-size: 1.05em;
    letter-spacing: 1px;
    color: #ffe0ad;
  }
  .t-btn {
    padding: 0 7px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(255, 255, 255, 0.06);
    color: #cfcfcf;
    font-size: 0.52em;
    line-height: 170%;
    cursor: pointer;
    &:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.14);
    }
  }
  &.warn {
    border-color: rgba(230, 90, 90, 0.65);
    .t-time {
      color: #ff9b9b;
    }
  }
  &.paused {
    opacity: 0.65;
  }
}

/* ---------- 计时小面板 ---------- */
.timer-panel {
  position: fixed;
  right: 22px;
  top: 74px;
  z-index: 110;
  width: 208px;
  padding: 10px 12px 12px;
  border-radius: 12px;
  background: linear-gradient(180deg, #17130f, #070606);
  border: 1px solid rgba(255, 206, 138, 0.22);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.7);
  h4 {
    margin: 0 0 8px;
    font-size: 0.66em;
    letter-spacing: 3px;
    text-align: left;
    color: #ffce8a;
  }
  .tp-row {
    display: flex;
    gap: 6px;
    margin-top: 6px;
    button {
      flex: 1;
      padding: 4px 0;
      border-radius: 8px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: linear-gradient(#3a3a3a, #0d0d0d);
      color: #e6e6e6;
      font-size: 0.6em;
      cursor: pointer;
      &:hover {
        color: #ffce8a;
        border-color: rgba(255, 206, 138, 0.55);
      }
    }
  }
  .tp-hint {
    margin: 9px 0 0;
    font-size: 0.55em;
    line-height: 1.5;
    color: #8c8c8c;
    text-align: left;
  }
}

/* ---------- 给恶魔看的三张伪装牌 ---------- */
.bluff-preview {
  position: fixed;
  inset: 0;
  z-index: 300;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 22px;
  background: radial-gradient(circle at 50% 40%, #16110c 0%, #000 78%);
  cursor: pointer;
  .bp-title {
    font-size: 0.9em;
    letter-spacing: 6px;
    color: #c9a06a;
  }
  .bp-tokens {
    display: flex;
    gap: 28px;
    .bp-token {
      width: clamp(90px, 15vmin, 150px);
      text-align: center;
      span {
        display: block;
        margin-top: 10px;
        font-size: 0.7em;
        letter-spacing: 2px;
        color: #d8cbb4;
      }
    }
  }
  .bp-hint {
    font-size: 0.6em;
    letter-spacing: 2px;
    color: #6e6e6e;
  }
}

/* ---------- status bar ---------- */
.statusbar {
  flex: none;
  padding: 6px 22px 8px;
  background: linear-gradient(0deg, rgba(0, 0, 0, 0.72), rgba(0, 0, 0, 0));
  font-size: 0.55em;
  color: #a9a9a9;
  letter-spacing: 0.5px;

  .tips {
    display: flex;
    gap: 22px;
    justify-content: center;
    flex-wrap: wrap;
  }
  .tip {
    /* 按固定宽度分行：5 条说明排成 3 列 2 行，别让它们挤成 5 条竖排 */
    flex: 0 1 420px;
    max-width: 420px;
    // 句首的数字才画成圆标；正文里强调用的 <b> 绝不能套这个圆圈，
    // 否则「点角色圆牌」这种短语会被 15px 的圆圈挤成竖排
    > b:first-child {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: rgba(255, 206, 138, 0.16);
      color: #ffce8a;
      font-size: 0.9em;
      margin-right: 3px;
    }
    b {
      display: inline;
      width: auto;
      height: auto;
      margin: 0;
      background: none;
      border-radius: 0;
      color: #ffce8a;
      font-size: 1em;
      &.inline {
        margin: 0 2px;
      }
    }
  }
}

/* ---------- buttons (from the original App.vue) ---------- */
.button-group {
  display: flex;
  align-items: center;
  justify-content: center;
  align-content: center;
  .button {
    margin: 5px 0;
    border-radius: 0;
    &:first-child {
      border-top-left-radius: 15px;
      border-bottom-left-radius: 15px;
    }
    &:last-child {
      border-top-right-radius: 15px;
      border-bottom-right-radius: 15px;
    }
  }
}
.button {
  padding: 0;
  border: solid 0.125em transparent;
  border-radius: 15px;
  box-shadow: inset 0 1px 1px #9c9c9c, 0 0 10px #000;
  background: radial-gradient(
        at 0 -15%,
        rgba(#fff, 0.07) 70%,
        rgba(#fff, 0) 71%
      )
      0 0/ 80% 90% no-repeat content-box,
    linear-gradient(#4e4e4e, #040404) content-box,
    linear-gradient(#292929, #010101) border-box;
  color: white;
  font-weight: bold;
  text-shadow: 1px 1px rgba(0, 0, 0, 0.5);
  line-height: 170%;
  margin: 5px auto;
  cursor: pointer;
  transition: all 200ms;
  white-space: nowrap;
  &:hover {
    color: red;
  }
  &.disabled {
    color: gray;
    cursor: default;
    opacity: 0.75;
  }
  &:before,
  &:after {
    content: " ";
    display: inline-block;
    width: 10px;
    height: 10px;
  }
}

/* ---------- settings panel ---------- */
.topbar .brand-text .seats-tag {
  color: #9fd3ff;
}

.settings-backdrop {
  position: fixed;
  inset: 0;
  z-index: 120;
  display: flex;
  justify-content: flex-end;
  background: rgba(0, 0, 0, 0.55);
  backdrop-filter: blur(2px);
}

/*
 * 设置项现在住在通用子窗口（Modal.vue）里：
 * 窗口壳负责居中、边框、最大化与关闭按钮，这里只把原来那块
 * 「贴满整屏高度的右侧抽屉」收成普通内容块，宽度和夜序等窗口对齐。
 */
.modal.settings {
  width: min(460px, 94vw);

  .settings-panel {
    width: 100%;
    height: auto;
    background: none;
    border-left: 0;
    box-shadow: none;
  }

  .sp-head {
    padding: 0 0 10px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  .sp-body {
    flex: none;
    overflow: visible;
    padding: 0 0 2px;
  }
}

.settings-panel {
  width: min(420px, 92vw);
  height: 100%;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #17130f 0%, #0a0908 45%, #050505 100%);
  border-left: 1px solid rgba(255, 206, 138, 0.18);
  box-shadow: -18px 0 40px rgba(0, 0, 0, 0.65);

  .sp-head {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 18px 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    h3 {
      font-size: 0.95em;
      letter-spacing: 4px;
      text-align: left;
    }
    .sp-close {
      cursor: pointer;
      font-size: 1.15em;
      opacity: 0.55;
      &:hover {
        opacity: 1;
        color: red;
      }
    }
  }

  .sp-body {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 18px 26px;
  }

  .sp-section {
    padding: 13px 0;
    border-bottom: 1px dashed rgba(255, 255, 255, 0.08);
    &:last-child {
      border-bottom: none;
    }
    h4 {
      display: flex;
      align-items: center;
      gap: 7px;
      margin: 0 0 10px;
      font-family: inherit;
      font-size: 0.78em;
      font-weight: normal;
      letter-spacing: 2px;
      text-align: left;
      color: #ffce8a;
      svg {
        opacity: 0.85;
      }
    }
  }

  .script-card {
    padding: 10px 12px;
    border-radius: 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    .sc-name {
      color: #fff;
      letter-spacing: 1px;
    }
    .sc-sub {
      margin-top: 3px;
      font-size: 0.7em;
      color: #9a9a9a;
    }
  }

  .sp-row {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 10px;
    .button {
      margin: 0;
      padding: 0 12px;
      font-size: 0.72em;
      line-height: 210%;
    }
  }

  /* 「添加座位」摆在人数 +/− 上面，所以上面不留白、下面留一点 */
  .add-seat-row {
    margin-top: 0;
    margin-bottom: 10px;
    align-items: center;
    .add-seat {
      color: #ffce8a;
      &:hover {
        color: #fff;
      }
    }
    .add-seat-note {
      font-size: 0.64em;
      color: #8c8c8c;
    }
  }

  .file-btn {
    position: relative;
    overflow: hidden;
    display: inline-flex;
    align-items: center;
    input {
      position: absolute;
      inset: 0;
      width: 100%;
      opacity: 0;
      cursor: pointer;
    }
  }

  .hint {
    margin: 8px 0 0;
    font-size: 0.64em;
    line-height: 1.55;
    color: #8c8c8c;
    code {
      padding: 0 3px;
      border-radius: 3px;
      color: #ffce8a;
      background: rgba(255, 206, 138, 0.12);
    }
  }

  /* ---------- 快捷唤醒短语列表 ---------- */
  .qp-list {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 10px;
  }
  .qp-item {
    display: flex;
    align-items: center;
    gap: 9px;
    width: 100%;
    padding: 8px 10px;
    border-radius: 9px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.03);
    color: #e6dfd1;
    font-family: inherit;
    font-size: 0.72em;
    line-height: 1.5;
    text-align: left;
    cursor: pointer;
    transition: border-color 150ms, background 150ms;
    &:hover {
      border-color: rgba(255, 206, 138, 0.55);
      background: rgba(255, 206, 138, 0.08);
      .qp-go {
        color: #ffce8a;
        transform: translateX(2px);
      }
    }
  }
  .qp-no {
    flex: none;
    width: 17px;
    height: 17px;
    border-radius: 50%;
    border: 1px solid rgba(201, 173, 126, 0.45);
    font-size: 0.72em;
    line-height: 15px;
    text-align: center;
    color: #c9a06a;
  }
  .qp-text {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 4px;
  }
  .qp-slot {
    padding: 0 6px;
    border-radius: 8px;
    border: 1px dashed rgba(255, 206, 138, 0.5);
    background: rgba(255, 206, 138, 0.08);
    font-style: normal;
    font-size: 0.92em;
    letter-spacing: 1px;
    color: #ffce8a;
    &.align {
      border-color: rgba(150, 180, 220, 0.5);
      background: rgba(120, 160, 210, 0.1);
      color: #a9c6e8;
    }
    &.num {
      border-color: rgba(200, 170, 120, 0.5);
    }
  }
  .qp-go {
    flex: none;
    font-size: 0.8em;
    color: #5d5d5d;
    transition: color 150ms, transform 150ms;
  }

  .scale-row {
    display: flex;
    align-items: center;
    gap: 12px;
    input[type="range"] {
      flex: 1;
      accent-color: #ffce8a;
    }
    .scale-val {
      min-width: 46px;
      text-align: right;
      font-size: 0.76em;
      color: #ffce8a;
    }
  }

  .sp-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
    padding-top: 18px;
    .button {
      margin: 0;
      padding: 0 14px;
      font-size: 0.76em;
      line-height: 220%;
    }
  }
}

.panel-fade-enter-active,
.panel-fade-leave-active {
  transition: opacity 0.2s ease;
}
.panel-fade-enter,
.panel-fade-leave-to {
  opacity: 0;
}

/* ---------- toast ---------- */
.toast {
  position: fixed;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  z-index: 200;
  max-width: 86vw;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 0.76em;
  letter-spacing: 0.5px;
  background: rgba(10, 24, 14, 0.95);
  color: #b6f0c9;
  border: 1px solid rgba(90, 220, 140, 0.45);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.6);
  &.err {
    background: rgba(44, 6, 6, 0.95);
    color: #ffc0c0;
    border-color: rgba(255, 90, 90, 0.5);
  }
  /* 撤回条也在底部时，普通提示往上让一格，别叠在一起 */
  &.with-undo {
    bottom: 78px;
  }
}

/* 撤回流：自动清掉标记后贴在底部，右侧一个「撤回」小字，5 秒自己消失 */
.undo-bar {
  position: fixed;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  z-index: 201;
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: 88vw;
  padding: 9px 12px 9px 16px;
  border-radius: 12px;
  font-size: 0.72em;
  letter-spacing: 0.5px;
  background: rgba(8, 12, 16, 0.97);
  color: #ffe6c8;
  border: 1px solid rgba(255, 190, 120, 0.6);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(0, 0, 0, 0.9);

  .ub-text {
    line-height: 1.45;
  }

  /* 说书人一只手点一下就撤回，所以做成小字而不是按钮块 */
  .ub-undo {
    flex: none;
    padding: 1px 0;
    border: 0;
    background: none;
    color: #ffcf8a;
    font-family: inherit;
    font-size: 0.95em;
    letter-spacing: 1px;
    text-decoration: underline;
    cursor: pointer;
    /* 图标和文字并排，垂直居中对齐 */
    display: inline-flex;
    align-items: center;
    gap: 5px;
    &:hover {
      color: #fff3dd;
    }
  }

  /*
    撤回符 ↩：Unicode U+21A9，手机上「撤回消息」用的就是这个字形。
    用系统符号字体渲染，不用 emoji 字体，避免变成彩色方块。
  */
  .ub-undo-icon {
    /* inline-block 会切断父级 text-decoration，图标下面不会拖一道下划线 */
    display: inline-block;
    font-family: "Segoe UI Symbol", "Apple Symbols", "Noto Sans Symbols 2",
      "Segoe UI", sans-serif;
    font-size: 1.15em;
    line-height: 1;
    letter-spacing: 0;
    /* 字形基线偏下，抬半像素和汉字中线看齐 */
    transform: translateY(0.5px);
  }

  .ub-undo-text {
    letter-spacing: 1px;
  }
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.25s ease, transform 0.25s ease;
}.toast-fade-enter,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, 10px);
}

/*
 * 齿轮菜单：照源码 Menu.vue 的 `#controls > .menu` —— 右上角一个齿轮按钮，
 * 点开是「横向一级分类 + 竖向二级项」。
 *
 * 这里刻意不带任何宽度断点。以前是「>991px 摆一排 13 个按钮、<=991px 换成齿轮」，
 * 等于同一套功能做了两份 UI，再拿屏幕宽度去猜用户想要哪一份：按钮多了挤不下、
 * 齿轮又只在小屏存在。现在全端只有这一个入口（大屏小屏同一个），宽窄交给布局自己适应。
 */
.m-gear {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 44px;
  height: 44px;
  margin: 0;
  padding: 0;
  border: 3px solid #000;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.62);
  color: #ffd9a0;
  font-size: 1.15em;
  cursor: pointer;
  svg {
    filter: drop-shadow(0 0 4px #000);
  }
  &:hover,
  &.open {
    background: rgba(60, 40, 20, 0.9);
  }
}

.m-backdrop {
  display: block;
  position: fixed;
  inset: 0;
  z-index: 55;
}

/*
 * 面板挂在 .topbar 里（父级 position: relative），top: 100% 就是「顶栏下沿」，
 * 不管顶栏在手机上收紧 padding、还是在桌面上更宽，都自动贴合，不用再算高度。
 */
.m-panel {
  display: block;
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 60;
  /* 220 宽时「座位牌大小 + 100%」会折成两行，照源码的菜单宽度放宽一点 */
  width: 240px;
  max-height: calc(100dvh - 110px);
  overflow-y: auto;
  padding: 0 0 4px;
  background: rgba(0, 0, 0, 0.95);
  border: 3px solid #000;
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.8);
  -webkit-overflow-scrolling: touch;
}

.m-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 12px;
  font-size: 0.85em;
  letter-spacing: 1px;
  color: #ffce8a;
  background: linear-gradient(90deg, rgba(255, 206, 138, 0.25), rgba(0, 0, 0, 0));
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

/*
 * 一级横向分类栏：照源码 Menu.vue 的 `li.tabs` —— 一排均分图标，
 * 选中的那个铺一层从上到下的蓝色渐变，下沿一条黑边收口。
 */
.m-tabs {
  display: flex;
  border-bottom: 3px solid #000;
}

.m-tab {
  flex: 1 1 0;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0;
  border: 0;
  border-right: 3px solid #000;
  background: rgba(0, 0, 0, 0.6);
  color: #d9c39a;
  font-size: 1em;
  cursor: pointer;
  &:last-child {
    border-right: 0;
  }
  &:hover {
    color: #fff;
  }
  &.on {
    color: #fff;
    background: linear-gradient(to bottom, #1f65ff 0%, rgba(0, 0, 0, 0.5) 100%);
    svg {
      filter: drop-shadow(0 0 4px #000);
    }
  }
}

/* 二级分组标题：源码 `.headline` 的蓝→黑→红横幅 */
.m-group {
  padding: 2px 10px;
  font-size: 0.72em;
  letter-spacing: 2px;
  text-align: center;
  color: #fff;
  background: linear-gradient(
    to right,
    #1f65ff 0%,
    rgba(0, 0, 0, 0.5) 20%,
    rgba(0, 0, 0, 0.5) 80%,
    #ce0100 100%
  );
  border-bottom: 2px solid #000;
}

.m-item {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-height: 44px;
  margin: 0;
  padding: 0 12px;
  border: 0;
  background: none;
  color: #fff;
  font-family: inherit;
  font-size: 0.95em;
  text-align: left;
  cursor: pointer;
  svg {
    width: 1.15em;
    flex: none;
    color: #ffce8a;
  }
  span {
    flex: 1 1 auto;
  }
  em {
    flex: none;
    font-style: normal;
    font-size: 0.85em;
    color: #9fa9b3;
  }
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
  &:active {
    background: rgba(255, 255, 255, 0.16);
  }
  &.off {
    opacity: 0.45;
  }
}

@media screen and (max-width: 1199.98px) {
  /* 源码 media.scss 的字号阶梯，之前整段漏抄：手机上字一直按桌面的 1.2em 渲染 */
  html,
  body {
    font-size: 1.1em;
  }
}

@media screen and (max-width: 991.98px) {
  html,
  body {
    font-size: 1em;
  }
  /* 源码 #townsquare { padding: 10px } */
  .stage {
    padding: 10px;
  }
}

@media screen and (max-width: 767.98px) {
  html,
  body {
    font-size: 0.9em;
    /*
     * 手机浏览器地址栏会占用视口高度，height:100% 拿到的还是「整屏」，
     * 底部座位会被地址栏盖住 —— 用 dvh 跟住真正可见的高度。
     */
    height: 100dvh;
  }
  .topbar {
    padding: 8px 10px;
    gap: 8px;
    .brand-text h1 {
      font-size: 0.95em;
    }
    .brand-text p {
      font-size: 0.55em;
    }
  }
  .center .center-btn {
    display: none;
  }
  .statusbar {
    display: none;
  }
  .ring {
    width: min(94vmin, 560px);
  }
}

@media screen and (max-width: 575.98px) {
  /* 源码 media.scss：老手机再小一档，牌径是 vw 给的，字号跟着收 */
  html,
  body {
    font-size: 0.8em;
  }
}
</style>
