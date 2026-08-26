# 千薪万苦文档地图

本文件是仓库文档的唯一根入口。功能说明留在 `README.md`，需求、研究、开发设计和执行计划进入 `docs/`，避免实现约束散落在聊天记录或代码注释中。

面向仓库协作者和编码代理的强制维护规则见 [AGENTS.md](AGENTS.md)。

## 阅读顺序

1. 想了解项目：先读 [README.md](README.md)。
2. 想判断为什么做、验收什么：读 [桌面挂件需求](docs/requirements/desktop-widget/requirements.md)。
3. 想判断哪些代码复用：读 [代码复用审计](docs/research/code-reuse-audit.md)。
4. 想开发 Web 或桌面版：读 [Web/Desktop 代码边界](docs/development/web-desktop-boundaries.md)。
5. 想增加桌面皮肤：读 [桌面挂件皮肤系统](docs/development/desktop-widget-skin-system.md)。
6. 想按阶段实施：读 [Windows 桌面挂件执行计划](docs/exec_plan/windows-desktop-widget-plan.md)。
7. 想发布网页或 Windows 包：读 [源码、Pages 与 Windows 包发布边界](docs/development/release-repository-boundaries.md)。

## 文档规则

- `MAP.md` 是根入口；`docs/index.md` 是文档总索引。
- 权威文档必须能在从 `MAP.md` 开始的两次点击内到达。
- `docs/` 下的文档必须包含 YAML 元数据、`文档入口` 和上级索引链接。
- 同一结论只保留一个权威来源。需求描述“做什么”，开发文档描述“怎么分层”，执行计划描述“按什么顺序落地”，研究文档保存盘点证据。
- 新文档按职责放入 `requirements/`、`development/`、`exec_plan/` 或 `research/`，并同时更新对应索引。
- 文档中的代码现状在实现变化后需要重新核对，并更新 `last_verified`。
- 临时讨论、构建产物和发布日志不作为架构事实来源。

## 目录职责

| 入口 | 职责 |
| --- | --- |
| [docs/index.md](docs/index.md) | 全部文档导航与状态 |
| [docs/requirements/index.md](docs/requirements/index.md) | 用户目标、范围、流程、验收标准 |
| [docs/development/index.md](docs/development/index.md) | 架构、模块边界、接口和实现约束 |
| [docs/exec_plan/index.md](docs/exec_plan/index.md) | 分阶段任务、验证门槛和发布顺序 |
| [docs/research/index.md](docs/research/index.md) | 代码盘点、方案比较和事实证据 |

## 当前权威文档

| 主题 | 权威来源 | 状态 |
| --- | --- | --- |
| 桌面挂件产品范围 | [桌面挂件需求](docs/requirements/desktop-widget/requirements.md) | Active |
| Web/Desktop 架构边界 | [Web/Desktop 代码边界](docs/development/web-desktop-boundaries.md) | Active |
| 桌面挂件皮肤系统 | [桌面挂件皮肤系统](docs/development/desktop-widget-skin-system.md) | Active |
| 现有代码复用结论 | [代码复用审计](docs/research/code-reuse-audit.md) | Active |
| Windows 桌面版落地顺序 | [Windows 桌面挂件执行计划](docs/exec_plan/windows-desktop-widget-plan.md) | Active |
| 源码、Pages 与 Windows 包发布 | [发布仓库边界](docs/development/release-repository-boundaries.md) | Active |
