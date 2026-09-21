# Fraud Detection Command Center

## What will be built
- Replace the blank home screen with a full-screen dark banking security dashboard using obsidian, navy, matte gold, emerald, and crimson styling.
- Add subtle animated digital-money particles behind translucent panels, with restrained glow, sharp Lucide icons, and responsive desktop/mobile layouts.
- Build three working tabs: Overview Hub, Live Transaction Stream, and Risk Sandbox.

## Dashboard behavior
- Overview Hub will show monitored volume, an animated threat gauge, blocked-case totals, a live status strip, and an updating transaction-volume chart.
- Live Transaction Stream will show timestamp, masked card holder, location, amount, fraud risk, and transaction status, updating automatically from the database.
- Risk Sandbox will expose Amount, Time, V14, V4, V12, and V10 controls. “Analyze Vector” will calculate risk, record the result, and show a dramatic warning dialog for high-risk or blocked payments.
- Blocking will be deterministic: Amount above $5,000 or V14 below -2.5 immediately produces a Blocked status. Other vectors contribute to a transparent simulated risk score.

## Data and server logic
- Create `monitored_transactions` with the requested fields, validation, indexes, explicit grants, row-level access rules, and realtime publication.
- Seed a representative transaction set in the migration so the first dashboard view is populated.
- Implement evaluation with the app’s secure server-function pattern rather than a new Edge Function, which is the supported equivalent for this project stack.
- Subscribe to database changes in the dashboard and cleanly remove the subscription when the page closes.

## Validation
- Regenerate database types after the schema change.
- Verify the database rule, realtime-ready table, dashboard interactions, warning dialog, desktop layout, and mobile layout.
- Add complete page metadata for the fraud detection dashboard.
