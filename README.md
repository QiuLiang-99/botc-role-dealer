# 血染钟楼 · 线下角色分发器（botc-role-dealer）

一个面向**线下跑团**的血染钟楼（Blood on the Clocktower）说书人工具：开一桌局，把手机/电脑当魔典用。界面与交互对齐开源项目 [townsquare](https://github.com/limpy01/townsquare)（botcgrimoire），在其基础上针对线下场景做了裁剪与增强。

**技术栈**：Vue 2.7 + Vuex + Vite + SCSS

**在线体验**：https://botc-role-dealer.app.workbuddy.host/?sharecode=WZOZMRMUW2

## 特性

- **自定义剧本**：上传剧本 json（角色自带名称 / 能力 / 夜序 / 图片链接），不内置官方剧本数据；角色图片走远程图床，本地零图片依赖
- **魔典操作**：盖帷幕（生死）、逐座换角色、放置提示标记（可翻转）、撤销 / 恢复、存档自动保存
- **夜序面板**：按剧本角色的首夜 / 其他夜序号排序，支持死亡标记与快捷唤醒短语（选角色 / 阵营 / 数字的填空展示屏）
- **座位管理**：添加座位、改人数不清空魔典、交换座位 / 移动玩家（点目标牌上的 ⇄ / ↻ 图标完成）、清空标记
- **玩家视角遮罩**：一键把所有牌面换成「?」，把屏幕转给玩家看；点某个「?」可单独亮出他的角色和标记
- **天亮结算**：夜转昼时自动摘除「死亡」标记、结算死亡与死因，处决角标悬浮显示死因
- **相克 / 传奇角色**：查询角色相克原因、挂载传奇角色
- **云同步**（可选）：通过 WorkBuddy 云服务存档

## 快速开始

```bash
npm install    # 安装依赖
npm run dev    # 本地开发（默认 http://localhost:5173）
npm run build  # 构建产物到 dist/
npm run preview# 本地预览构建产物
```

## 目录结构

```
├─ index.html              入口页
├─ vite.config.js          Vite 配置
├─ src/
│  ├─ App.vue              主界面（圆桌、座位、菜单、撤销等）
│  ├─ main.js              入口，注册 FontAwesome 图标与 Vuex
│  ├─ vars.scss / media.scss   全局变量与响应式断点
│  ├─ assets/              界面素材（背景、生命牌、黑布、字体等）
│  ├─ data/                数据：剧本 script.json、传奇 fabled.json、
│  │                       相克 hatred.json、人数配置 game.json
│  ├─ logic/               纯逻辑：魔典序列化 / 夜序 / 提示标记 /
│  │                       角色图标解析 / 快捷短语模板
│  ├─ store/               Vuex（players 座位状态、session 全局状态）
│  ├─ cloud/               WorkBuddy 云服务接入
│  └─ components/
│     ├─ Token.vue         角色牌
│     └─ modals/           各弹窗（夜序、盲抽、设置、相克、
│                          传奇、快捷唤醒短语、云同步等）
```

## 数据格式

`src/data/script.json` 为标准 botc 剧本 json + 富化字段（`name` / `ability` / `firstNight` / `image` 等）。上传自定义剧本时支持：

- 只写角色 `id`：按内置角色资料补全（官方 id）
- 写全字段：直接使用，`image` 指向任意图床链接

## 致谢

- 交互与视觉基于 [townsquare](https://github.com/limpy01/townsquare)（[botcgrimoire.top](https://botcgrimoire.top/)）
- 角色相克数据 `hatred.json` 继承自 townsquare（原始出处为血染钟楼官方公开数据）
- 角色图片使用[歌石官方图床](https://oss.gstonegames.com/)
