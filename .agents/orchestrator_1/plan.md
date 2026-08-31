# Orchestration Plan — ClassQuant Hub

## 1. Survey Phase
- Dispatch 3 parallel Explorers:
  - Explorer 1 (Focus: Touch & Selection, Quick Tags, Score Bubble Animations, DOM rendering in seat grid)
  - Explorer 2 (Focus: Navigation Tab bar, Views: Timetable, Roster, Post-class logging, Statistics, Mobile viewport event capture)
  - Explorer 3 (Focus: Onboarding Tour engine, Spotlight overlay, 12-step walkthrough interaction & teardown)

## 2. Project Architecture & Decomposition
- Synthesize findings into `PROJECT.md` at root:
  - Complete Feature Inventory mapped to ORIGINAL_REQUEST.md
  - Milestones M1, M2, M3, M4
  - Interface contracts between modules
  - Code layout conventions

## 3. Dual-Track Execution
- **Implementation Track**:
  - M1: Touch & Selection Behavior Restoration (Explorer -> Worker -> Reviewer -> Challenger -> Auditor -> Gate)
  - M2: Tab Navigation & Feature Readiness (Timetable, Roster, Post-class, Stats)
  - M3: Interactive Onboarding Tour Engine (12-step spotlight walkthrough, teardown)
- **E2E Testing Track**:
  - Test runner and harness setup (Tiers 1-4: Feature, Boundary, Combinatorial, Real-World)
  - Generate TEST_INFRA.md and TEST_READY.md

## 4. Final Milestone & Hardening
- Run 100% E2E test suite (Tiers 1-4)
- Run Tier 5 Adversarial Coverage Hardening (Challenger -> Worker -> Reviewer)
- Forensic Integrity Audit & Final Verification
- Final report to Sentinel
