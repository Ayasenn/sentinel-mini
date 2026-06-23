# Changelog

本项目的 notable 变更记录。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/)。

## [Unreleased]

## [1.1.0] - 2026-06-23

### Added

- 2026 年 7 月新番数据（`data/seasons/2026-07.json`）
- `update.js` 支持按季度更新番剧信息（评分、想看数、封面），用法：`node update.js 2026-07` 或 `node update.js 26-7`

### Changed

- 手动更新 2026 年 4 月新番数据（`data/seasons/2026-04.json`）
- `update.js` 移除 `anime_data.json` 旧格式兼容，改为只读写 `data/seasons/<季节>.json`

### Fixed

- GitHub Actions 自动更新：修复了最新一季番剧信息自动更新脚本失效的问题 - 提交目标从 `anime_data.json` 改为 `data/seasons/*.json`，恢复每日最新一季评分同步
