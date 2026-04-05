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
- payment records, pending unlock and seeker-post checkout intents, provider-ready settlement routes, and admin-side manual payment reconciliation flowing through a shared payment workflow
- payment transition audit logs, shared AfrIPay callback/webhook validation, an admin payment operations feed, and the legacy AfrIPay form-post handoff contract
- focused payment regression tests for AfrIPay status mapping, signal extraction, and webhook-secret validation
- buyer-side pending checkout visibility, seeker-post draft persistence, and return-state messaging on detail pages and the seeker-post flow
- automatic Mongo index bootstrap and Mongo-backed throttling across sign-in and the main write surface
- shared request-body parsing and route-level validation helpers across the core write routes
- notification infrastructure across review, unlock, inquiry, and seeker flows
- support tooling for audit filtering and CSV export from the admin workspace
- query-backed payment explorer filters, matching transition events, and CSV export from the admin workspace
- Model A commission workflow, overdue tracking, owner-side listing blocks, and admin commission reconciliation
- penalty generation for overdue commission, unpaid-penalty gating, owner/admin penalty ledgers, and admin-side penalty adjustment or reconciliation
- owner-history and risk-signal summaries directly inside the admin review queue
- admin-only internal investigation notes directly from pending review cards
- investigation-case intake and resolution tooling from listing, payment, commission, and penalty admin surfaces
- structured verification follow-up logs inside investigation cases, including contact target, method, outcome, and timeline history
- query-backed investigation explorer filters and CSV export from the admin workspace

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
   Scope: listing lifecycle updates, commission workflow, seeker response workflow, seeker closure outcomes, post-unlock messaging, and matched follow-up threads.
5. Phase 5: Launch hardening
   Status: in progress
   Scope: AfrIPay callbacks/webhooks, auth hardening, rate limiting, exports, penalties, and production safety.

## Priority 0: Launch Blockers

These are the items that must be completed before treating the app as a real marketplace.

1. Validate and harden the legacy AfrIPay form-post contract against real gateway return payloads, or replace it with a documented server-to-server contract if AfrIPay provides one.
2. Add durable payment states, callbacks, idempotency keys, and reconciliation logic.
3. Harden auth beyond the current signed-cookie prototype.
4. Separate development, preview, and production environment behavior.
5. Rotate exposed AfrIPay secrets and validate Vercel environment configuration.
6. Extend the new rate limiting and abuse controls from the current protected write routes to any future export, penalty, or webhook-management endpoints.
7. Extend the new server-side validation consistency pattern to the few remaining write routes and webhook payload verification.
8. Add immutable audit visibility for unlocks, seeker unlocks, seeker-post publication, and admin overrides.

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
5. Manual review tools for suspicious unlock, listing, or messaging behavior.

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

1. Keep extending the `verify` script so payment-sensitive tests grow with the gateway surface.
2. Add focused integration tests for auth, unlock, and payment-sensitive flows.
3. Add seed data for local demos.
4. Extract duplicated formatting and display logic into shared helpers.
5. Add architectural notes for payments, notifications, and penalties.

## Recommended Execution Order

1. Live AfrIPay adapter on top of the new payment intent/state model
2. Listing lifecycle and commission states
3. Penalties and unpaid-balance enforcement on top of admin fee controls
4. Investigation-case workflows and support resolution tooling on top of the new owner risk signals
5. Final public-site polish and launch hardening

## Current Tranche

This tranche now also covers the owner-side post-deal commission flow:

- owner-side listing lifecycle transitions
- audit and notification fan-out for lifecycle changes
- buyer workspace awareness for no-longer-public listings
- post-unlock two-way listing messaging with owner replies from the dashboard inbox
- seeker-request owner response submission after unlock
- buyer visibility into seeker responses on both the dashboard and the request detail page
- requester-side closure and fulfillment actions with matched owner tracking
- matched-only post-fulfillment seeker follow-up threads and dashboard visibility
- admin-managed fee settings for listing token fees and seeker pricing
- pending checkout intents and mock hosted payment confirmation for listing unlocks, seeker unlocks, and seeker-post publishing
- dashboard and detail-page UI polish for continuing checkout and understanding payment return states
- payment transition visibility for admins, safer AfrIPay callback/webhook parsing, legacy form-post gateway handoff, and admin manual reconciliation
- Model A commission case creation on sold or rented outcomes, dashboard visibility for owners, overdue blocking on new listing creation, and admin reconciliation controls
- automatic penalty generation for overdue commission cases, unpaid-penalty blocking, owner/admin penalty ledgers, and admin amount adjustment or reconciliation
- owner-history and unresolved-balance risk signals embedded in the admin review queue
- private admin investigation notes embedded in the pending review workflow
- investigation-case creation and lifecycle management from listing reviews, payment records, commission cases, and penalty cases
- verification follow-up timelines inside investigation cases so admins can log owner, buyer, provider, or internal review outcomes
- investigation explorer filters and export so support can work large queues without losing the timeline context
- updated phase tracking for workflow completion
