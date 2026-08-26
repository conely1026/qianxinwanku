---
status: Active
owner: qianxinwanku
last_verified: 2026-08-26
sources:
  - ../../src/App.jsx
  - ../../src/app/useAppController.js
  - ../../src/app/appStateActions.js
  - ../../src/hooks/usePersistentState.js
  - ../../src/core/state/appState.js
  - ../../src/platform/web/webStateStorage.js
  - ../../src/platform/web/useWebPersistentState.js
  - ../../src/platform/web/webClock.js
  - ../../src/platform/web/webReleaseService.js
  - ../../src/platform/web/useWebAppEffects.js
  - ../../src/platform/web/webAppActions.js
  - ../../src/platform/web/webBackup.js
  - ../../src/lib/time.js
  - ../../src/lib/leaveSession.js
  - ../../src/lib/conversionItems.js
  - ../../src/lib/releaseNotes.js
  - ../../src/views/ProfileView.jsx
  - ../../public/sw.js
---

# 现有代码复用审计

## 文档入口

- [返回研究索引](index.md)
- [返回文档总索引](../index.md)
- [返回 MAP](../../MAP.md)
- [查看桌面挂件需求](../requirements/desktop-widget/requirements.md)
- [查看开发边界](../development/web-desktop-boundaries.md)
- [查看执行计划](../exec_plan/windows-desktop-widget-plan.md)

## 审计结论

现有业务规则已经由 Web 与 Desktop 共用，桌面版没有重写工资、时间、离席或换算逻辑。状态 schema、迁移、应用控制器、平台存储、时间、发布和备份 adapter 均已抽离；今日、换算、日历、个人、设置与发布说明也已接入桌面展开面板。紧凑挂件与 Web 导航保持独立外壳。

## 逐文件判断

| 当前文件或模块 | 复用等级 | 处理建议 | 依据 |
| --- | --- | --- | --- |
| `src/lib/time.js` | 直接复用 | 移入 `core/time`，保持纯计算并补充跨日样例 | 已集中处理时间、班次、工资和工作日计算，不依赖 DOM |
| `src/lib/leaveSession.js` | 直接复用 | 移入 `core/leave`，Web/Desktop 使用同一状态转换 | 输入状态和时间后返回新状态，无窗口依赖 |
| `src/lib/conversionItems.js` | 直接复用 | 移入 `core/conversion` | 预设增删改为不可变数据操作 |
| `src/lib/releaseNotes.js` | 拆分后复用 | 版本比较与未读计算进入 `core/release`；存储键和渠道判断交给平台层 | 模型逻辑可复用，但当前已读标记绑定浏览器存储语义 |
| `src/core/state/appState.js` | 已抽离，可直接复用 | Web/Desktop 共用 schema、默认值、迁移和规范化；平台负责注入 ID 工厂 | 核心层不引用浏览器或 Electron 全局对象 |
| `src/platform/web/webStateStorage.js` | Web 专用 adapter | 保留浏览器存储、JSON、跨标签页事件和 Web ID 生成 | 已把平台副作用从通用 Hook 中移出 |
| `src/hooks/usePersistentState.js` | 已抽离，可复用 | 继续保持 adapter 必须显式注入；Desktop 使用自己的装配 Hook | 当前仅负责 React 状态和 adapter 生命周期，不默认导入 Web |
| `src/app/useAppController.js` | 已抽离，可复用 | Web/Desktop 注入各自的平台能力，复用相同状态和动作 | 不导入 Web 模块，动作容器保持稳定，已具备多 shell 装配基础 |
| `src/App.jsx` | Web shell | 继续拆出独立 Web 入口和 modal host；Desktop 新建自己的 shell | 业务控制器已移出，目前负责页面组合、底部导航和 Web 能力装配 |
| `src/views/TodayView.jsx` | 展开态复用 | 作为 feature UI 使用；桌面紧凑态只读取同一 view model | 业务展示可复用，但页面密度不适合作为小挂件 |
| `src/views/CalendarView.jsx` | 展开态复用 | 迁入 calendar feature | 主要依赖 props 和共享计算结果 |
| `src/views/ConvertView.jsx` | 展开态复用 | 复用列表和编辑表单；ID 工厂由 controller 注入，portal 宿主由 shell 决定 | 组件只接收数据和动作，不读取 Electron bridge |
| `src/views/ProfileView.jsx` | 展开态复用 | 保留数据展示；Web/Desktop 分别注入 backup actions 与平台说明 | 已不直接使用 `Blob`、`URL`、`document`、文件读取或浏览器提示 |
| `src/platform/web/webBackup.js` | Web 专用 adapter | 保留下载链接、文件读取与 Web 错误提示；Desktop 用系统文件对话框实现同一语义 | 浏览器副作用已从 Profile 和 controller 移出，错误类型可区分无效文件与内部失败 |
| `src/components/LeaveTimer.jsx` | 直接复用 | 作为共享 feature 组件，也可拆出紧凑版呈现 | 操作依赖业务回调，无平台生命周期职责 |
| `src/components/Icons.jsx` | 直接复用 | 移入 `shared/ui` | 纯渲染资源 |
| `src/components/SettingsModal.jsx` | 展开态复用 | 通过通用 modal host 渲染；键盘关闭由共享 UI 层处理 | 表单可共用，当前依赖 `window` 键盘事件 |
| `src/components/ReleaseNotesModal.jsx` | 展开态复用 | 复用左右轮播内容，portal 宿主由 shell 注入 | 内容和翻页通用，挂载点属于平台外壳 |
| `src/components/BottomNav.jsx` | Web 专用 | 留在 `platform/web` | 桌面紧凑挂件和托盘不应照搬移动端底部导航 |
| `src/styles.css` | 必须拆分 | 分为 tokens、共享 feature 样式、Web layout、Desktop widget | 当前把设计变量、页面布局和组件样式放在一个文件 |
| `src/main.jsx`、`index.html` | Web 专用入口 | 改为明确的 web entry | 直接依赖浏览器根节点和 Pages 资源入口 |
| `public/sw.js`、manifest | Web 专用 | 不进入桌面构建 | Service Worker 与 PWA 元数据只服务浏览器 |
| `electron/*`、桌面图标 | Desktop 新增 | 单独目录，不被 Web 引用 | 属于窗口、托盘、系统桥接和打包能力 |

## 优先抽取顺序

1. 已完成：抽出状态 schema、默认值、规范化和迁移，锁定数据单一来源。
2. 已完成：抽出 Web storage、clock、release、页面副作用、浏览器动作和 backup adapter。
3. 已完成：抽出 `useAppController`，Web shell 通过注入后的状态和动作继续渲染。
4. 已完成：portal 宿主、确认、备份和 Service Worker 保持平台边界，Desktop 复用共享功能组件。
5. 已完成：Web 与 Desktop 使用独立入口、构建目录和 shell；下一步只进入便携包专项验收。

每一步先保持网页行为不变，并用测试或浏览器验收锁住现状。不要在同一个提交中同时移动核心逻辑、改视觉和增加 Electron。

## 已识别风险

- 若直接复制网页版，工资和班次规则会出现两份实现，后续跨日修复很容易只改一端。
- 浏览器和 Electron renderer 即使都叫 `localStorage`，也不是同一个数据源；不能把“代码相同”误认为“数据自动共享”。
- Service Worker 在桌面包内没有价值，还可能让升级后继续加载旧 renderer 资源。
- 若在现有 Web shell 中直接增加桌面判断，窗口生命周期仍会重新侵入业务编排。
- 鼠标穿透若没有托盘或快捷键恢复路径，会形成无法操作的挂件。
- 浏览器构建成功不能证明桌面窗口、托盘、多显示器和覆盖升级可用，必须做真实 Windows 冷启动验收。
- 当前测试基础设施没有真实挂载 React Hook，因此 `usePersistentState` 的 effect 挂载和卸载清理仍是显式测试缺口；adapter 的订阅与取消订阅已经由纯边界测试覆盖。
- 浏览器文件下载和文件选择仍需要真实系统交互验收；当前 adapter 单测已经覆盖对象 URL、点击、清理、文件解析和错误传播。

## 可参考的既有经验

用户之前的桌面宠物项目适合参考 Electron 的透明无边框窗口、位置持久化、置顶、缩放、托盘和便携包流程。这里只复用工程经验与窗口模式，不复制其业务代码，也不把本仓库绑定到另一个本地项目路径。
