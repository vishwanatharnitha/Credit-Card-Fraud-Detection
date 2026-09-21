# FinShield Enterprise Fraud Control Center

## Goal
Upgrade the existing command center into a complete FinShield dashboard with a shared TypeScript fraud model, threshold analytics, searchable live traffic, and persistent CSV batch scoring.

## Build
- Rebrand all visible metadata and interface copy to FinShield Enterprise Fraud Control Center while preserving the established obsidian, navy, gold, emerald, and crimson visual system.
- Add a deterministic lightweight gradient-boosting-style scorer in shared TypeScript. It will evaluate Amount, Time, V14, V4, V12, and V10, exponentially amplify the four specified fraud rules, return a 0–100 probability, and explain the strongest signals.
- Keep backend enforcement authoritative by recomputing every submitted score with the same model before persistence; expand the database trigger so all four mandatory hard-block rules are enforced.
- Add a customizable decision threshold (default 0.50) and calculate Precision, Recall, and F1 against the current labeled transaction set.
- Upgrade Overview with threshold metrics and a dual-series traffic/fraud-spike chart.
- Upgrade Live Stream with a master search field, risk-class dropdown, result count, sortable risk display, and responsive horizontal scrolling.
- Upgrade Risk Sandbox with synchronized numeric controls, the renamed diagnostics action, model explanation, and a dramatic crimson alert for flagged or blocked results.
- Add drag-and-drop CSV upload, robust client-side parsing and validation, highest-risk-first scored preview, batch persistence, clear error feedback, and CSV export.
- Preserve realtime invalidation so manual and batch records appear immediately across dashboard views.

## Validation
- Verify TypeScript/build health, single-vector and batch persistence, hard-block rules, threshold metrics, filtering, CSV export, alert behavior, and desktop/mobile layouts.
