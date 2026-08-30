## 2026-08-30T03:16:35Z
You are Worker M4 (PWA Service Worker & Version Synchronization Implementer).
Your working directory is: d:\class_point_app_dev\.agents\worker_m4_1
Original request is at: d:\class_point_app_dev\.agents\ORIGINAL_REQUEST.md
Project blueprint is at: d:\class_point_app_dev\PROJECT.md

INPUT BLUEPRINTS:
- SW Cache Query Normalization: d:\class_point_app_dev\.agents\explorer_m4_1\handoff.md
- Version Synchronization Matrix: d:\class_point_app_dev\.agents\explorer_m4_2\handoff.md
- Version Check Loop Elimination: d:\class_point_app_dev\.agents\explorer_m4_3\handoff.md

EXCLUSIVE FILE WRITE OWNERSHIP:
- service-worker.js
- version.json
- index.html (badge and footer version alignment, SW update listeners)
- js/app.js (version constant, compareVersions helper, checkReleaseNotesOnLaunch, checkForUpdates, dismissReleaseNotes)
- manifest.json
- android/app/build.gradle

OBJECTIVE:
Implement Milestone 4 features with rock-solid quality:
1. Update `service-worker.js` with `{ ignoreSearch: true }` in `caches.match` for all precached assets, update cache name to `classquant-hub-v20`, enforce Network-First routing for first-party assets to prevent stale-while-revalidate rollback flashes.
2. Synchronize all version strings to `1.6.0` (build `2026083004`, Android `versionCode 160`, `versionName "1.6.0"`, header badge `v1.6.0`, footer `v1.6.0`).
3. Refactor `app.js` with semantic version comparison (`compareVersions`), eliminating false downgrade wiping and recursive reload loops in `checkReleaseNotesOnLaunch()`, `checkForUpdates()`, and `dismissReleaseNotes()`.
4. Run the test suite: `powershell -NoProfile -ExecutionPolicy Bypass -File tests/run_e2e_tests.ps1` to verify all tests pass.
