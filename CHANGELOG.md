# Changelog

All notable changes to this project will be documented in this file.

## [v0.8] - 2026-01-14
### Fixed
- **滚动容器检测**: 修复了在非 window 滚动的网站（如使用 `overflow: scroll` 的 SPA 应用）上无法触发自动滚动的问题。现在会自动寻找页面中 scrollHeight 最大的容器进行操作。
- **懒加载失效修复**: 放弃了过于激进的“瞬移”策略，改回稳健的快速滚动（1.5倍视口步幅），解决了部分网站因滚动太快导致图片未加载的问题。
### Changed
- **文档更新**: 在 README 中明确了脚本的局限性，特别说明了不支持 Virtual Scrolling（虚拟滚动）类网站。

## [v0.7] - 2026-01-14
### Changed
- **极速体验重构**: 移除了耗时的图片跨域预检测逻辑，截图速度提升 500%。
- **滚动优化**: 采用 `behavior: 'instant'` 实现瞬移式滚动，消除平滑滚动动画带来的延迟，触发懒加载流程缩减至 0.2s。
- **交互优化**: 移除自动写入剪切板功能（因 Taint 限制导致的不稳定性），改为截图完成后立即弹出全屏模态框，用户可直接右键另存为。
- **文件名变更**: 从 `github-long-shot.user.js` 更名为 `web-long-shot.user.js` 以体现通用性。

## [v0.6] - 2026-01-14
### Added
- 新增对 `iframe`、`video`、`audio` 标签的自动忽略，减少报错概率。
### Fixed
- 修复部分网站因 Sticky Header 遮挡导致截图内容缺失的问题（截图时临时隐藏）。
### Performance
- 将 html2canvas `scale` 参数降为 1，显著减少渲染内存占用和时间。

## [v0.5] - 2026-01-14
### Added
- 引入 `isImageSafe` 严格模式检测，通过 draw-and-test 机制预先剔除会导致 Taint 的图片（注：v0.7 已移除以追求速度）。

## [v0.4] - 2026-01-14
### Added
- 实现 `fixCorsImages` 预处理，尝试将图片 `crossOrigin` 设置为 `anonymous`。

## [v0.3] - 2026-01-14
### Changed
- **交互变更**: 移除页面注入按钮，改为使用油猴脚本管理器菜单 (`GM_registerMenuCommand`) 触发，保持页面整洁。
- **通用性**: `@match` 规则更新为 `*://*/*`，支持所有网站。
- **反馈优化**: 引入 Toast 浮窗提示，实时显示当前处理状态。

## [v0.2] - 2026-01-14
### Added
- 实现自动滚动逻辑，模拟用户浏览行为以触发懒加载图片。

## [v0.1] - 2026-01-14
### Added
- MVP 版本发布。
- 支持 GitHub 页面注入按钮。
- 基础的长截图生成与复制到剪切板功能。
