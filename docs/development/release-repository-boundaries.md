---
status: Active
owner: qianxinwanku
last_verified: 2026-08-26
sources:
  - ../../MAP.md
  - ../../README.md
  - ../../package.json
  - https://github.com/conely1026/murdoku-pages
  - https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases
  - user-request-2026-08-26
---

# 源码、Pages 与 Windows 包发布边界

## 文档入口

- [返回开发索引](index.md)
- [返回文档总索引](../index.md)
- [返回 MAP](../../MAP.md)
- [查看 Web/Desktop 代码边界](web-desktop-boundaries.md)
- [查看 Windows 桌面挂件执行计划](../exec_plan/windows-desktop-widget-plan.md)

## 结论

千薪万苦采用与 Murdoku 相同的“私有源码、公开静态产物”思路，并把 Windows 包作为公开仓库的 GitHub Release 资产：

```text
私有源码仓 main
  ├─ npm run prepare:pages
  │    └─ dist/ -> 公开发布仓 gh-pages -> GitHub Pages
  └─ tag vX.Y.Z + npm run prepare:desktop-release
       └─ portable exe + SHA-256 -> 公开发布仓 GitHub Releases
```

Pages 分支不放源码，Release 资产不放进 `gh-pages`。网页访问流量走 GitHub Pages；exe 下载走 GitHub Releases。GitHub 当前规则允许单个 Release 资产小于 `2 GiB`，Release 总大小和带宽不设上限，因此当前约 `88 MiB` 的便携包适合放 Release。

## 仓库职责

| 仓库或分支 | 可见性 | 内容 | 禁止内容 |
| --- | --- | --- | --- |
| 私有源码仓 `main` | Private | 完整 Git 历史、React/Electron 源码、测试、文档、构建脚本 | 构建产物、发布 token |
| 公开发布仓 `main` | Public | 项目说明、正式页面与下载入口 | 日常开发源码 |
| 公开发布仓 `gh-pages` | Public | `dist/` 的静态 HTML/CSS/JS、PWA 公共资源、`.nojekyll` | Electron 源码、便携 exe、私有文档 |
| 公开发布仓 Releases | Public | 版本说明、Windows x64 portable exe、SHA-256 | Pages 静态文件、开发临时包 |

公开发布仓优先复用 `conely1026/qianxinwanku`，从而保持正式地址 `https://conely1026.github.io/qianxinwanku/`。私有源码仓名称尚未确定，创建后本地两个开发目录都把 `origin` 指向该私有仓，并额外用 `pages` remote 指向公开发布仓。

## 当前迁移事实

当前本地 `origin` 仍指向公开的 `conely1026/qianxinwanku`，说明仓库拆分尚未执行。即使今后把公开仓 `main` 改成说明文件，已经公开过的历史提交仍可从 Git 历史访问；若目标是彻底不公开旧源码，需要新建发布仓或重建公开仓历史，不能只删除工作树文件。

因此本轮只落地可重复构建、边界校验和权威文档，不自动创建仓库、不改 remote、不推分支、不创建 Release。外部迁移需要先确认私有源码仓名称以及是否保留当前公开仓历史。

## 网页发布流程

1. 在私有源码仓 `main` 的目标提交执行 `npm run prepare:pages`。
2. 该命令运行单元测试、生成 `dist/`，并验证 Web 产物不包含 Electron bridge 或小猫桌面资源。
3. CI 把 `dist/` 内容同步到公开发布仓的孤立 `gh-pages` 分支根目录，并写入 `.nojekyll`。
4. 提交信息记录源码提交短哈希，例如 `pages: source abc1234`。
5. 推送 `gh-pages` 后等待 GitHub Pages 报告目标提交已发布，再验收正式 URL。

自动发布使用只对公开发布仓具有 `contents: write` 的细粒度 token，保存为私有源码仓 Actions secret；不得把个人全权限 token 写入仓库或构建产物。

## Windows Release 流程

1. 在私有源码仓把 `package.json` 版本与发布说明同步，提交后创建 `vX.Y.Z` tag。
2. 执行 `npm run prepare:desktop-release`，生成 `release/qianxinwanku-desktop-X.Y.Z-x64.exe`。
3. 记录 exe 的 SHA-256、大小、源提交哈希和签名状态。
4. 在公开发布仓创建同版本 GitHub Release，上传 exe，并在说明中放正式 Pages 链接、校验值和“未签名时 Windows 可能提示”的说明。
5. Release 发布成功后，从公开下载地址重新下载一次并核对 SHA-256；不要用本地文件存在代替公开下载验收。

公开 Release 的 tag 只标识发布记录，源码权威 tag 保留在私有源码仓。Release 说明必须记录对应的私有源码提交短哈希，方便追溯，但不公开源码归档。

## 本地命令

```powershell
npm run prepare:pages
npm run prepare:desktop-release
npm run verify:release-boundaries
```

这些命令只负责测试、构建和产物边界检查，不会推送 Git、修改 GitHub Pages 或创建 GitHub Release。发布动作应由单独的 CI 或人工确认后的 `gh` 命令完成。

## 发布门槛

- `npm test` 全绿，Web 与 Desktop 生产构建通过。
- Web 产物没有 `office-cat`、Electron 或桌面开发 bridge。
- Desktop 产物包含已批准小猫状态图，且没有开发浏览器 harness、Web manifest 或 Service Worker。
- Pages 与 Release 都记录同一个私有源码提交。
- exe 文件名、应用版本和 Release tag 一致。
- 公共下载回读的 SHA-256 与构建机一致。
- 未签名包必须明确标注 `NotSigned`，不得写成已签名。
