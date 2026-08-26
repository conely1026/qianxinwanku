---
status: Active
owner: qianxinwanku
last_verified: 2026-08-26
sources:
  - ../requirements/desktop-widget/requirements.md
  - ../research/desktop-widget-interaction-options.md
  - web-desktop-boundaries.md
  - ../exec_plan/windows-desktop-widget-plan.md
  - ../../src/app/useAppController.js
  - ../../src/features/desktop-widget/model/createDesktopWidgetViewModel.js
  - ../../src/features/desktop-widget/skins/skinRegistry.js
  - ../../src/features/desktop-widget/skins/builtInSkins.js
  - ../../src/features/desktop-widget/skins/CapsuleCompactView.jsx
  - ../../src/features/desktop-widget/skins/OfficeCatCompactView.jsx
  - ../../src/platform/desktop/desktopPreferences.js
  - user-request-2026-08-26
---

# 桌面挂件皮肤系统

## 文档入口

- [返回开发索引](index.md)
- [返回文档总索引](../index.md)
- [返回 MAP](../../MAP.md)
- [查看桌面挂件需求](../requirements/desktop-widget/requirements.md)
- [查看交互方案](../research/desktop-widget-interaction-options.md)
- [查看 Web/Desktop 边界](web-desktop-boundaries.md)
- [查看执行计划](../exec_plan/windows-desktop-widget-plan.md)

## 结论

桌面版使用一个共享挂件状态模型和一个共享展开面板。极简胶囊是默认皮肤，`office-cat` 是可选的“小猫上班”皮肤；二者只替换紧凑挂件的布局和状态表现，不复制工资、班次、离席、更新或导航逻辑。

```text
共享业务状态与动作
  -> DesktopWidgetViewModel
      -> SkinRegistry
          -> capsule CompactView
          -> office-cat CompactView
      -> 共享 DesktopExpandedPanel
```

皮肤组件不得读取时钟、存储、Electron bridge 或完整 controller，也不得根据中文状态文案推断业务状态。

## 共享视图模型

在接入任何皮肤前，桌面 shell 生成唯一的 `DesktopWidgetViewModel`：

```text
DesktopWidgetViewModel
  phase
  status
  countdown
  shift
  income
  leave
  release
  window
```

`phase` 使用稳定的机器枚举：

```text
before-work
working
lunch
paid-leave
after-work
rest-day
```

离席运行中优先于普通班次表现；跨过 00:00 但仍处于跨日班次时继续保持 `working`。皮肤只排列、渲染视图模型并调用白名单动作。

## 皮肤契约

第一版使用编译期注册表，不从磁盘加载任意 JavaScript：

当前契约由 `skinRegistry.js` 提供，等价结构如下：

```js
defineDesktopWidgetSkin({
  id,
  version,
  displayName,
  compactSize,
  CompactView,
})
```

`CompactView` 只接收：

```text
model
actions.toggleExpanded
actions.toggleLeave
actions.openSettings
actions.openReleaseNotes
actions.toggleLocked
```

注册表必须校验 ID 唯一、尺寸合法和组件存在。未知、损坏或已经移除的皮肤 ID 回退到 `capsule`。

## 数据边界

皮肤选择属于 `DesktopPreferences`，不进入可在 Web/Desktop 间导入导出的 `AppState`：

```text
AppState
  工资、班次、日历、换算、离席和业务发布状态

DesktopPreferences
  version
  selectedSkinId
  scale
  alwaysOnTop
  locked
  closeBehavior
  windowBounds
  lastSeenReleaseId
```

切换皮肤不得改变业务数据、离席运行状态、当前展开页或更新已读状态。导入 Web 备份也不得改变皮肤和窗口位置。

## 小猫皮肤

`office-cat` 使用原创圆润小猫、粗黑手绘线条和纸张颗粒感，不复刻参考角色的头型、五官比例、花纹或标志性构图。

| 状态 | 小猫表现 |
| --- | --- |
| 上班前 | 暂沿用已接入的静态占位图，后续单独确认 |
| 工作中 | 在键盘上按 `Ctrl / S`，使用圆润无指甲的爪子 |
| 离席 | 踩滑板离开工位 |
| 午休 | 趴在键盘上睡觉 |
| 下班 | 开小车离开工位 |
| 休息日 | 坐在游戏椅上玩游戏 |

数字、状态文案和按钮必须使用真实 DOM，不烘焙进插画。紧凑态只有显式按钮使用 `no-drag` 并触发动作；状态文案、数字、插画和空白区都属于拖动区域。插画层默认不接收鼠标事件，不能遮挡离席按钮或展开按钮。

## 当前静态资源与后续动画

第一阶段已接入 6 张 `512 × 512` 真透明 RGBA PNG 状态图，Desktop renderer 当前图片产物合计约 `1.78 MB`，低于 `2.5 MB` 目标。已确认的五张图分别是工作、离席、午休、下班和休息日；眼睛高光用程序调整为更大的正圆。仅组件导入的最终状态图进入 Desktop bundle，Web bundle 不包含这些图片。

动画仍属于下一阶段：

- 美术源文件保留透明 PNG 帧序列。
- 运行时打包为 lossless WebP sprite sheet，不使用不可控的 GIF。
- 单元格建议为 `192 × 192`，动画控制在 `4–10 fps`。
- 正式 atlas 目标不超过 `2.5 MB`，PNG 源帧不进入安装包。
- 窗口隐藏或页面不可见时暂停动画。
- 开启减少动态效果时显示每个状态的静态封面帧。
- 资源加载失败时先回退静态图，再回退默认胶囊皮肤。

角色设定板必须先于批量动画生产确认；所有帧需要检查角色身份一致、基线、裁切和真实透明通道。

## 安全和扩展约束

- 首版只注册随应用编译的内置皮肤。
- 不允许皮肤包提供脚本、IPC channel、文件路径或外部 URL。
- 新增皮肤只增加 manifest、组件和资源，不修改共享业务动作。
- 若未来支持下载皮肤，资源包只能包含经过 schema 校验的图片和表现配置，不能加载可执行代码。

## 验收

- 两套皮肤对同一状态显示相同的倒计时、收入、离席时间和按钮能力。
- 切换皮肤、重启或导入备份均不改变业务状态。
- 跨日班次不误播下班动作，下一次实际工作日才重置离席。
- 100%、125%、150% 和 200% Windows 缩放下不裁切、不模糊。
- 小猫图层不影响拖动、键盘操作、锁定恢复和托盘入口。
- Web bundle 不包含桌面皮肤资源或 Electron 依赖。
