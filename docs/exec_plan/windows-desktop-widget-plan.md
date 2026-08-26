---
status: Active
owner: qianxinwanku
last_verified: 2026-08-26
sources:
  - ../requirements/desktop-widget/requirements.md
  - ../development/web-desktop-boundaries.md
  - ../research/code-reuse-audit.md
  - ../development/desktop-widget-skin-system.md
  - ../../package.json
  - ../../src/app/useAppController.js
  - ../../src/platform/web/webBackup.js
  - ../../src/entries/desktop-main.jsx
  - ../../src/platform/desktop/DesktopWidgetRoot.jsx
  - ../../electron/main.cjs
  - ../../vite.desktop.config.js
---

# Windows 桌面小挂件执行计划

## 文档入口

- [返回执行计划索引](index.md)
- [返回文档总索引](../index.md)
- [返回 MAP](../../MAP.md)
- [查看桌面挂件需求](../requirements/desktop-widget/requirements.md)
- [查看开发边界](../development/web-desktop-boundaries.md)
- [查看代码复用审计](../research/code-reuse-audit.md)
- [查看皮肤系统](../development/desktop-widget-skin-system.md)
- [查看发布仓库边界](../development/release-repository-boundaries.md)

## 总体策略

先定挂件交互，再做保持行为不变的核心抽离，最后接入 Electron。网页版始终是可发布基线；桌面版通过新入口和新 shell 接入共享代码，不在现有页面里逐步堆叠桌面条件分支。

## 阶段 0：文档和边界基线

产出：

- `MAP.md` 与四类文档索引。
- 桌面挂件需求、代码复用审计、Web/Desktop 边界和本执行计划。
- 明确第一版不包含的事项和待定产品决策。

门槛：所有权威文档可从 `MAP.md` 两次点击内到达，本地 Markdown 链接可解析。

## 阶段 1：交互设计

进度（2026-08-26）：已完成。用户选定“极简胶囊加展开面板”为默认方向，并将“小猫上班”定义为可选皮肤，而不是第二套功能。

为紧凑挂件制作 3 个可视化方案，至少覆盖：

- 横向信息条：占用高度最小，适合贴屏幕顶部或底部。
- 竖向桌面卡片：倒计时层级清楚，适合屏幕侧边。
- 极简胶囊加展开面板：常驻面积最小，但多一次展开操作。

每个方案必须展示工作中、午休、已下班、离席和有更新五种状态，并说明拖动、展开、锁定、关闭和托盘之间的关系。选定一个方案后，再冻结默认尺寸和快捷操作。

门槛：已满足。默认置顶、关闭隐藏到托盘、锁定可从托盘恢复、右键窗口菜单已接入、鼠标穿透默认关闭；边缘吸附移到首个便携包之后。

## 阶段 2：共享核心抽离

进度（2026-08-26）：已完成第一阶段抽离。状态 schema、迁移、应用控制器、平台 storage、clock、release、modal host、ID factory 和 backup adapter 已落地；下一次实际工作日离席重置与发布关闭/已读语义已有单元测试覆盖。Desktop ViewModel 使用稳定机器 `phase`，共享核心不读取 Electron 全局对象。

任务：

1. 给状态根对象增加 `schemaVersion`，建立默认值、规范化和迁移模块。
2. 抽出 storage、backup、confirm、ID factory 和 modal host 接口。
3. 将时间、离席、换算、发布记录整理到 `core`，不改变公开行为。
4. 从 `App.jsx` 抽出应用控制器，Web shell 继续渲染现有页面。
5. 拆分共享样式与 Web layout。
6. 给工作快照增加稳定的机器 `phase`，为所有桌面皮肤提供同一状态视图模型。

验证：

- `npm test`
- `npm run check`
- `npm run build`
- 网页端今日、跨日下班、离席重置、预设编辑删除、发布轮播和导入导出回归。

门槛：网页版行为和本地数据兼容性保持不变，核心目录不引用浏览器或 Electron 全局对象。

## 阶段 3：明确 Web 入口

进度（2026-08-26）：已完成构建边界与 Web 平台适配。Web 继续从现有入口构建到 `dist/`，桌面代码和小猫资源不进入 Web bundle。独立命名为 `web-main` 的机械重命名暂不执行，因为现有 `src/main.jsx` 已经只承担 Web 装配。

任务：

- 建立 `web-main` 和 `WebApp`，接入 Web storage、backup 和 Service Worker adapter。
- 保留 GitHub Pages 相对路径、PWA manifest 和现有底部导航。
- 建立独立 `build:web`，产物继续由现有 Pages 流程发布。

门槛：GitHub Pages 预览与当前线上功能一致；桌面依赖不进入 Web bundle 和 Pages 流水线。

## 阶段 4：Electron 桌面挂件

进度（2026-08-26）：打包前实现已完成。Electron 主进程、preload、白名单 bridge、独立 renderer、胶囊挂件、共享展开面板、托盘、右键窗口菜单、单实例、关闭隐藏、置顶、锁定、缩放与窗口位置持久化均已接入；桌面导入导出和完整低频共享功能也已接入。紧凑态只有离席与展开按钮触发业务动作，其余状态、数字、插画和空白区域统一用于拖动。Vite 回环地址提供开发专用 renderer 验收 bridge，生产仍要求真实 preload。

任务：

- 增加 Electron 主进程、preload 和受限 `desktopBridge`。
- 实现选定的紧凑挂件和复用功能的展开面板。
- 实现透明无边框窗口、拖动、置顶、缩放、位置恢复和多显示器修正。
- 实现托盘、单实例、关闭隐藏或退出、锁定及安全恢复路径。
- 接入 Desktop storage、backup 和桌面发布渠道。
- 建立独立 `build:desktop:renderer` 和开发启动脚本。
- 建立编译期皮肤注册表、独立桌面偏好存储和默认胶囊皮肤。

安全门槛：renderer 不启用 Node 集成；主进程能力只通过 preload 白名单暴露；任意鼠标穿透状态都能从托盘或快捷键解除。

## 阶段 5：小猫上班皮肤

进度（2026-08-26）：静态换皮已接入。工作、离席、午休、下班和休息日采用已确认的原创真透明 PNG，上班前暂沿用占位图；两套皮肤固定为 `360 × 76` 并消费同一 ViewModel。状态动画与 sprite sheet 不阻塞首个便携包。

任务：

- 先确认原创小猫角色设定板，不复刻参考角色的造型与标志性细节。
- 制作上班前、工作中、离席、午休、下班和休息日状态。
- 使用透明 PNG 源帧和 lossless WebP sprite sheet，动画控制在 `4–10 fps`。
- 接入减少动态效果、隐藏暂停、静态封面和默认胶囊回退。
- 在桌面设置中提供“极简胶囊 / 小猫上班”选择。

门槛：两套皮肤消费同一 ViewModel，切换不改变业务状态；猫图层不遮挡拖动和按钮；皮肤资源不进入 Web bundle。

## 阶段 6：打包和真实 Windows 验收

进度（2026-08-26）：`1.0.0 x64` 便携包已按最新紧凑态交互重新生成。renderer 网页验收、全量单元测试、Web/Desktop 构建、生产产物边界、便携包冷启动、小猫紧凑态和单实例可见窗口均已通过。Windows 紧凑/展开切换已规避 `resizable: false` 时程序缩小窗口不生效的问题；桌面构建也已禁用 Vite `publicDir`，不会混入 Web manifest 或 Service Worker。多显示器拔插、系统导入导出对话框、覆盖升级和跨版本数据迁移仍属于打包后专项回归；当前包未做 Authenticode 代码签名。

先生成便携版，验收稳定后再决定是否增加签名安装器和自动更新。

必须验证：

- 全新目录冷启动和第二次启动唤起现有实例。
- 拖动、缩放、置顶、托盘、关闭和退出。
- 主屏、副屏、缩放比例变化及拔掉副屏后的窗口恢复。
- 跨 00:00 班次、第二次上班重置离席和休息日。
- 导入网页版备份，并从桌面版再次导出。
- 用旧版本数据启动新版本，确认迁移成功且数据未被清空。
- 替换便携版可执行文件后，本地业务数据和窗口偏好仍存在。
- 发布弹窗在多条更新时可左右切换，关闭后不会重复打断当前版本。

## 提交边界

建议按以下独立提交推进：

1. 文档规则与边界。
2. 状态 schema 和迁移。
3. 平台适配接口及 Web adapter。
4. 应用控制器、目录和样式拆分。
5. Web 独立入口和构建。
6. Electron 骨架及 desktop bridge。
7. 桌面 ViewModel、皮肤契约和默认胶囊。
8. 托盘、窗口持久化和多显示器。
9. 小猫角色设定和静态状态资源。
10. 小猫动画和皮肤切换。
11. 便携包与发布验收。

每个提交只跨越一个边界，出现问题时可以单独回退，不用撤销后续业务修复。

## 仍需后续确认的事项

- 上班前小猫状态图在不阻塞首包的前提下后续单独确认。
- 小猫动画帧在便携版稳定后再决定是否制作。
- 便携版验收后，是继续做安装器、代码签名和自动更新，还是先内部使用。
