# Engineering Roadmap

## Goal

Move the current MVP from a strong prototype into a launch-ready marketplace by prioritizing production blockers first, workflow completeness second, and polish third.

## Current State

The app already has:

- protected signed-session workspaces
- listing draft creation and admin review
- public listings with prototype token unlock
- pre-unlock inquiry messaging with content filtering
- seeker request posting, browsing, and prototype owner-side unlock

The largest remaining gaps are not page count. They are production reliability, payment correctness, operational tooling, and workflow completion.

## Priority 0: Launch Blockers

These are the items that must be completed before treating the app as a real marketplace.

1. Replace prototype payments with real AfrIPay orchestration.
2. Add durable payment states, callbacks, idempotency keys, and reconciliation logic.
3. Harden auth beyond the current signed-cookie prototype.
4. Separate development, preview, and production environment behavior.
5. Rotate exposed secrets and validate Vercel environment configuration.
6. Add rate limiting and abuse controls around unlock, sign-in, and messaging endpoints.
7. Add server-side validation consistency for every write route.
8. Add immutable audit visibility for unlocks, seeker unlocks, and admin overrides.

## Priority 1: Workflow Completion

These items finish the core business flows described in the product docs.

1. Owner listing lifecycle updates after a deal: rented, sold, not concluded, expired.
2. Commission workflow and overdue tracking.
3. Seeker request fulfillment flow and owner response path.
4. Post-unlock full messaging for listings and seeker requests.
5. Admin-configurable fees by category and model.
6. Notification system for approvals, unlocks, expiries, and seeker matches.

## Priority 2: Operations and Governance

These items make the product manageable once users and transactions grow.

1. Penalty engine and unpaid-penalty gating.
2. Admin analytics for listings, unlocks, seeker demand, and payments.
3. Payment ledger filters and export paths.
4. Audit-log explorer for support and dispute handling.
5. Manual review tools for suspicious unlock or messaging behavior.

## Priority 3: Product Polish

These items improve trust, usability, and maintainability across the app.

1. Centralized UI formatting and labels.
2. Consistent empty states and not-found handling.
3. Better mobile ergonomics on dashboards and dense admin screens.
4. Stronger copy around non-refundable fees and locked fields.
5. Metadata, search previews, and better discoverability for public pages.
6. More explicit system health and setup diagnostics.

## Priority 4: Developer Quality

These items reduce future bugs and speed up safe iteration.

1. Add a `verify` script that runs the standard quality gate.
2. Add focused integration tests for auth, unlock, and payment-sensitive flows.
3. Add seed data for local demos.
4. Extract duplicated formatting and display logic into shared helpers.
5. Add architectural notes for payments, notifications, and penalties.

## Recommended Execution Order

1. AfrIPay integration and payment state model
2. Notification infrastructure
3. Listing lifecycle and commission states
4. Seeker fulfillment and post-unlock messaging
5. Penalties and admin fee controls
6. Analytics, exports, and support tooling
7. Final public-site polish and launch hardening

## Current Tranche

This tranche focuses on senior-level foundation polish:

- shared formatting helpers
- cleaner public and dashboard display logic
- better developer verification commands
- graceful not-found handling
- stronger admin audit visibility
- refreshed docs that match the real codebase
