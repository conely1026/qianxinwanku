# 千薪万苦

一个把工资换算成正在流逝的时间的前端小工具。

## 功能

- 今日下班倒计时、班次进度与实时收入
- 消费金额换算为工作时间，可添加自己的项目
- 工作日历与休息日覆盖
- 离席计时、耳机使用成本与年度工资轨迹
- 工作参数、本地备份导入导出
- localStorage 本机持久化 + Service Worker 离线应用缓存
- 响应式布局与 GitHub Pages 静态部署

## 网页版本地运行

```bash
npm install
npm run dev
```

网页生产构建：

```bash
npm run build:web
```

## Windows 桌面挂件

先构建桌面 renderer，再启动本地 Electron 挂件：

```bash
npm run build:desktop:renderer
npm run start:desktop
```

生成 Windows 便携版：

```bash
npm run build:desktop:portable
```

准备 Pages 或 Windows Release 产物（只构建和校验，不会自动发布）：

```bash
npm run prepare:pages
npm run prepare:desktop-release
```

桌面版业务数据与窗口偏好保存在 Electron 的用户数据目录中，不会因为替换便携版可执行文件而主动清除；网页 `localStorage` 与桌面数据默认互不相通。

所有个人数据仅保存在访问者自己的浏览器或桌面应用数据目录中，不会提交到服务器。

## 文档

项目需求、架构边界、发布仓库规则、代码复用结论和执行计划统一从 [MAP.md](MAP.md) 进入。
