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
  - ../../src/entries/desktop-main.jsx
  - ../../src/platform/desktop/DesktopWidgetRoot.jsx
  - ../../src/platform/desktop/desktopBootstrap.js
  - ../../src/platform/desktop/desktopStateStorage.js
  - ../../src/platform/desktop/desktopPreferencesStorage.js
  - ../../src/platform/desktop/desktopBrowserHarnessBridge.js
  - ../../src/platform/desktop/desktopBackup.js
  - ../../electron/main.cjs
  - ../../electron/preload.cjs
  - ../../vite.desktop.config.js
  - ../../tools/release/verify-release-boundaries.mjs
  - ../../src/views/ProfileView.jsx
  - ../../src/lib/time.js
  - ../../src/lib/leaveSession.js
  - ../../src/lib/conversionItems.js
  - ../../src/lib/releaseNotes.js
  - ../research/code-reuse-audit.md
---

# Web/Desktop 代码边界

## 文档入口

- [返回开发索引](index.md)
- [返回文档总索引](../index.md)
- [返回 MAP](../../MAP.md)
- [查看桌面挂件需求](../requirements/desktop-widget/requirements.md)
- [查看代码复用审计](../research/code-reuse-audit.md)
- [查看皮肤系统](desktop-widget-skin-system.md)
- [查看发布仓库边界](release-repository-boundaries.md)
- [查看执行计划](../exec_plan/windows-desktop-widget-plan.md)

## 结论

网页版和桌面版应该共用业务规则、状态结构、功能组件和视觉基础，但使用不同的应用入口、平台适配器和窗口外壳。现有代码不适合直接复制一份做桌面版，也不应让共享模块直接判断自己运行在浏览器还是 Electron。

依赖方向固定为：

```text
entries
  -> platform shells
      -> feature UI / app controller
          -> core domain

electron main/preload -> desktop bridge -> desktop shell
```

下层不得反向导入上层。`core` 不读取 `window`、`document`、`localStorage`、Service Worker 或 Electron API。

## 当前落地进度

截至 2026-08-26，共享状态、Web 应用装配和 Desktop 第一阶段边界已经落地：

- 状态默认值、旧数据迁移和规范化已进入 `src/core/state/appState.js`。
- 浏览器存储、JSON、跨标签页事件和 Web ID 生成已进入 `src/platform/web/webStateStorage.js`。
- 通用 `usePersistentState` 必须显式接收 adapter，不再反向导入 Web 平台层。
- `useWebPersistentState` 负责给当前 Web 应用装配 Web adapter。
- `useAppController` 已从 `App.jsx` 抽出业务状态、页面状态、时间刷新和应用动作；依赖通过 `stateStorage`、`releaseService` 与 `clock` 显式注入。
- Web 时间、发布已读、页面副作用和浏览器动作已分别进入 `webClock`、`webReleaseService`、`useWebAppEffects` 与 `webAppActions`。
- Web 备份下载、文件读取和错误转换已进入 `webBackup`；`ProfileView` 只调用注入能力，不再直接访问浏览器全局对象。
- 导入前会校验完整的当前版或兼容版备份结构；空对象、仅版本号、数组和未知版本不会覆盖本地数据。
- 弹窗改为通过 `ModalPortal` 接收宿主；Web 专属备份入口由 `WebBackupImportAction` 注入。
- Desktop renderer 使用独立 `desktop.html` 和 `src/entries/desktop-main.jsx`，启动时先等待 preload bootstrap，不在加载前写默认值。
- Desktop 业务数据与偏好分别通过 `desktopStateStorage`、`desktopPreferencesStorage` 写入；旧 schema 交给共享迁移处理，未来 schema 进入只读保护页。
- Electron 主进程只暴露固定 IPC 白名单，renderer 启用 `contextIsolation`、关闭 Node 集成，并使用透明无边框单实例窗口和托盘。
- Windows 紧凑/展开切换通过主进程受控改尺寸；针对不可手调窗口缩小时的 Electron 限制，只在 `setSize` 同步调用期间临时打开 `resizable`，随后立即恢复关闭。
- Web 与 Desktop 发布记录共用内容，但已读 key 和渠道筛选彼此独立。
- Desktop 展开面板已直接复用今日、换算、日历、个人、设置和发布说明组件；系统文件对话框导入导出由桌面 adapter 注入。
- Vite 开发模式在回环地址提供受限浏览器验收 bridge，用于先验收 renderer；生产构建仍只接受 preload bridge。
- Desktop Vite 已设置 `publicDir: false`，不会把 Web 的 manifest、Service Worker 或其他 `public/` 资源复制进桌面 renderer。
- Web 与 Desktop 构建完成后分别运行产物边界检查，阻止平台专属资源串包。

桌面 renderer 的高频挂件和低频共享页面均已接入；打包后的系统对话框、多显示器和覆盖升级仍必须在真实便携包阶段验收。

## 目标目录

这是增量重构目标，不要求一次移动全部文件：

```text
src/
  core/
    time/
    leave/
    conversion/
    state/
    release/
  app/
    useAppController.js
  features/
    desktop-widget/
      model/
      skins/
    today/
    conversion/
    calendar/
    profile/
    settings/
    release-notes/
  shared/
    ui/
    styles/
  platform/
    web/
      WebApp.jsx
      webStorage.js
      webBackup.js
      serviceWorker.js
    desktop/
      DesktopWidgetApp.jsx
      DesktopExpandedPanel.jsx
      desktopStorage.js
      desktopBackup.js
      desktopBridge.js
  entries/
    web-main.jsx
    desktop-main.jsx
electron/
  main.cjs
  preload.cjs
  windowState.cjs
build/
  icon.ico
```

## 共享核心

### 业务规则

以下能力必须保持平台无关，并由 Web 与 Desktop 直接调用：

- 班次、午休、跨日下班和下一次上班计算。
- 工资、工作进度、消费换算和日历统计。
- 离席状态转换及“下一次上班后重置”规则。
- 换算预设的增删改和排序。
- 发布记录的版本比较、未读计算和轮播顺序。
- 持久化状态 schema、默认值、规范化和版本迁移。

核心函数接收数据并返回数据。时间来源、ID 生成器等不稳定能力通过参数传入，避免在核心中直接访问平台全局对象。

### 功能界面

今日、换算、日历、设置和发布记录组件可以在网页版与桌面展开面板中复用。紧凑挂件是独立视图，只组合共享核心数据和少量通用组件，不复用完整网页布局。

## 平台适配器

应用控制层只依赖以下能力接口，不直接调用浏览器或 Electron：

| 能力 | Web 实现 | Desktop 实现 |
| --- | --- | --- |
| 状态读取、写入、订阅、迁移 | `localStorage` 与 `storage` 事件 | preload 暴露的本地存储桥接，或第一阶段受控的 renderer 存储 |
| 导入导出 | `Blob`、文件输入和下载链接 | 系统文件对话框与文件读写桥接 |
| 确认和提示 | 页面内弹窗或浏览器确认框 | 页面内弹窗、系统通知或主进程确认 |
| 发布已读状态 | Web 发布渠道标识 | Desktop 发布渠道标识 |
| 生命周期 | 页面可见性、Service Worker | 托盘、单实例、关闭隐藏、窗口恢复 |

所有 Electron 能力只能通过 `preload` 的窄接口暴露给 renderer，开启 `contextIsolation`，不向页面提供 Node 全局对象。

## Web 边界

Web 入口负责：

- GitHub Pages 的相对路径和静态构建。
- `manifest.webmanifest`、图标和 Service Worker 注册。
- 页面标题、浏览器滚动和底部导航外壳。
- 浏览器本地存储、文件上传和下载。
- Web 渠道的发布提示。

`public/sw.js`、`public/manifest.webmanifest` 和 GitHub Pages 工作流只属于 Web。桌面 renderer 不注册 Service Worker，避免缓存桌面包内资源和干扰升级。

## Desktop 边界

Desktop 主进程负责：

- 创建透明无边框窗口，处理置顶、缩放、拖动区域和可见边界。
- 托盘、右键窗口菜单、单实例和关闭行为。
- 记忆窗口位置，并根据当前显示器工作区做恢复修正。
- 系统文件对话框、通知及其他需要系统权限的能力。
- 便携包或安装包的打包入口。

Desktop renderer 负责：

- 紧凑挂件和展开面板的 React 渲染。
- 通过共享 ViewModel 选择内置紧凑挂件皮肤；皮肤只负责表现，不计算业务状态。
- 调用共享业务核心与功能组件。
- 通过 `desktopBridge` 使用主进程白名单能力。

Desktop 不拥有业务计算副本。主进程也不重新实现工资、班次、换算或离席规则。

皮肤选择、窗口位置、置顶、锁定和缩放属于桌面偏好，不进入可导出的工资业务数据。具体契约见[桌面挂件皮肤系统](desktop-widget-skin-system.md)。

## 状态和发布版本

业务状态建议使用一个带 `schemaVersion` 的根对象：

```text
AppState
  schemaVersion
  settings
  leaveSession
  conversionItems
  calendarOverrides
  releaseStateByChannel
```

迁移函数按旧版本依次升级到当前版本，任何平台适配器都必须先迁移再交给界面。删除字段和重置数据不能作为升级手段。

发布内容数据可以共用，但显示条件必须区分 `web`、`desktop` 或 `all` 渠道。这样 Web 小改动不会在旧桌面版里出现无效提示，桌面窗口功能也不会提示给网页版用户。

## 构建边界

- `npm run build:web` 只构建 Web 入口并产出 Pages 静态资源。
- `npm run build:desktop:renderer` 构建桌面 renderer；Electron 打包只消费该产物。
- Web 发布流水线不得安装或执行桌面打包。
- Desktop 发布流水线不得修改 Pages 产物。
- 两种构建在打包前都运行共享单元测试。

当前脚本已经物理分开：`build:web` 产出 `dist/`，`build:desktop:renderer` 产出 `dist-desktop/`，`build:desktop:portable` 产出 Windows 便携包。`prepare:pages` 与 `prepare:desktop-release` 会在测试和构建之后执行对应的产物边界检查；Desktop renderer 明确禁用 Vite `publicDir`。

## 禁止事项

- 不复制 `src/` 形成 `src-desktop/` 的长期分叉。
- 不在共享业务文件中散落 `if (isElectron)`。
- 不让 feature 组件直接调用 `window.electron`、`ipcRenderer` 或 Node 文件系统。
- 不让桌面版注册 `public/sw.js`。
- 不为 Web 和 Desktop 分别维护默认状态、迁移规则或发布记录结构。
- 不把窗口位置、置顶状态等桌面偏好混入可导出的工资业务数据。
