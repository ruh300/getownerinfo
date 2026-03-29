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
- direct owner responses on unlocked seeker requests, visible in buyer dashboards and seeker detail pages
- requester-side seeker fulfillment and closure with matched owner outcome tracking
- matched-only seeker follow-up messaging between the requester and selected owner response
- admin-configurable listing token fees and seeker pricing flowing through shared settings
- payment records flowing through a shared payment workflow
- notification infrastructure across review, unlock, inquiry, and seeker flows

The largest remaining gaps are not page count. They are production reliability, payment correctness, operational tooling, and workflow completion.

## Execution Phases

1. Phase 1: Core marketplace shell
   Status: completed
   Scope: auth shell, listing drafts, admin review, public listings, unlock prototype, seeker board.
2. Phase 2: Operational foundation
   Status: completed
   Scope: admin audit visibility, shared formatting, payment integrity improvements, payment analytics.
3. Phase 3: Notification layer
   Status: completed
   Scope: event-driven notifications, unread counts in the shell, notification centers in dashboard and admin.
4. Phase 4: Workflow completion
   Status: in progress
   Scope: listing lifecycle updates, seeker response workflow, seeker closure outcomes, post-unlock messaging, and matched follow-up threads.
5. Phase 5: Launch hardening
   Status: next
   Scope: AfrIPay callbacks/webhooks, auth hardening, rate limiting, exports, penalties, and production safety.

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
3. Post-match fulfillment reporting and seeker-side closeout tooling.
4. Notification system for approvals, unlocks, expiries, and seeker matches.
5. Admin-configurable commission and penalty controls.

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
2. Listing lifecycle and commission states
3. Penalties and admin fee controls
4. Analytics, exports, and support tooling
5. Final public-site polish and launch hardening

## Current Tranche

This tranche focuses on workflow completion across listing and seeker demand flows:

- owner-side listing lifecycle transitions
- audit and notification fan-out for lifecycle changes
- buyer workspace awareness for no-longer-public listings
- post-unlock two-way listing messaging with owner replies from the dashboard inbox
- seeker-request owner response submission after unlock
- buyer visibility into seeker responses on both the dashboard and the request detail page
- requester-side closure and fulfillment actions with matched owner tracking
- matched-only post-fulfillment seeker follow-up threads and dashboard visibility
- admin-managed fee settings for listing token fees and seeker pricing
- updated phase tracking for workflow completion
