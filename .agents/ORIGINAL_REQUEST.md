# Original User Request

## 2026-08-30T13:39:37Z

Comprehensive mobile interaction restoration, event pipeline audit, and seamless multi-tab feature verification for ClassQuant Hub.

Working directory: d:\class_point_app_dev
Integrity mode: development

## Requirements

### R1. Native Touch & Selection Behavior Restoration
- Ensure that tapping student seat cards toggles selection instantaneously, and tapping quick tags immediately awards points/deductions and automatically clears student selection, restoring the intuitive one-tap classroom logging workflow.
- In-place score animations (+3 / -1 stamp floats) must animate smoothly without disrupting active touches or triggering full DOM re-renders.

### R2. End-to-End Mobile Tab Navigation & Feature Readiness
- Ensure all top navigation tabs (課堂點記板, 👥 班級名單, ⏰ 課堂事後補記, 📊 統計戰情室, 📅 課表排程, 📖 學生記事檢索, 檔案 & 晤談, AI 成績匯入, 📖 圖文說明書) render and operate with zero JavaScript exceptions, zero event capture blocking, and zero layout shift on mobile viewports.
- Timetable scheduling, roster modification, and post-class logging must execute reliably across both mobile browsers and installed PWA instances.

### R3. Flawless Interactive Onboarding Tour Engine
- Ensure tapping  🎓 教學 instantly launches the spotlight walkthrough.
- All 12 walkthrough steps must advance either via direct interaction or the 下一步 ➔ button with zero deadlocks, zero touch blocking, and zero perceived latency.

## Acceptance Criteria

### Interaction & Logging
- [ ] Tapping a student seat card toggles selection immediately.
- [ ] Tapping any quick score tag awards points and automatically clears selected students.
- [ ] Floating score bubbles (+3 / -1) animate cleanly without resetting student cards or view state.

### Tab Navigation & Timetable
- [ ] Tapping 📅 課表排程 switches view and renders weekly schedule grid with interactive cell editing.
- [ ] Tapping 👥 班級名單 opens roster view with functional student search and batch import.
- [ ] Tapping ⏰ 課堂事後補記 and 📊 統計戰情室 switches views smoothly with complete data rendering.

### Onboarding Walkthrough
- [ ] Tapping 🎓 教學 starts the spotlight tour instantly.
- [ ] Clicking 下一步 ➔ or interacting with the target element smoothly advances through all 12 steps to completion.
- [ ] Ending the tour cleanly tears down all overlays and restores 100% normal page interaction.
