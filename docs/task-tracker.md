# Project Task Tracker

Last updated: 2026-04-05

This tracker turns the broader roadmap into an execution board. It should stay close to real repo status rather than aspirational scope.

## Status Key

- `done`: implemented and verified in the repo
- `in_progress`: partially delivered or currently being worked
- `next`: highest-value task to take after the current tranche
- `planned`: not started yet
- `blocked`: needs outside input, credentials, or product decision

## Launch Blockers

| Task | Status | Notes |
| --- | --- | --- |
| Shared payment intent model for listing unlocks, seeker unlocks, and seeker posting | `done` | Centralized in `src/lib/payments/workflow.ts` |
| Legacy AfrIPay hosted handoff | `done` | Form-post handoff and hosted checkout page are live |
| AfrIPay callback and webhook normalization | `done` | Shared parser and safe metadata previews are in place |
| Focused payment regression tests | `done` | `npm run test:payments` is part of `npm run verify` |
| Admin manual payment reconciliation | `done` | Admin UI can settle ambiguous pending payments |
| Validate live AfrIPay return payloads against real gateway responses | `blocked` | Needs real callback/webhook samples from production or sandbox traffic |
| Rotate exposed AfrIPay credentials and confirm final Vercel envs | `blocked` | Needs account-side rotation and deployment env update |
| Harden auth beyond signed-session prototype | `planned` | Move to stronger identity flow, session rotation, and password-reset hygiene |
| Environment separation for dev, preview, and production | `planned` | Add clearer runtime guards and env diagnostics |

## Workflow Completion

| Task | Status | Notes |
| --- | --- | --- |
| Listing draft flow, submission, review, approval | `done` | Core owner workflow exists |
| Listing lifecycle updates after approval | `done` | Active, under negotiation, sold, rented, not concluded, expired |
| Pre-unlock inquiry flow with blocked contact sharing | `done` | Buyer-to-owner messaging before unlock |
| Post-unlock owner reply threads | `done` | Owner dashboard inbox and buyer thread view exist |
| Seeker request posting and publication after payment | `done` | Posts publish only after settlement |
| Seeker unlock, owner response, requester closure, matched messaging | `done` | End-to-end seeker flow is working |
| Commission workflow and overdue tracking | `done` | Model A outcomes now generate commission cases, overdue balances block new listings, and `/admin` can reconcile them |
| Penalty engine and unpaid-penalty gating | `done` | Overdue commission now generates penalties, unpaid penalties block new owner listing work, and `/admin` can adjust, settle, or waive cases |

## Operations And Governance

| Task | Status | Notes |
| --- | --- | --- |
| Admin review queue and audit feed | `done` | `/admin` already surfaces review actions and recent activity |
| Payment overview and manual payment review | `done` | Payment-native operations tooling is in place |
| Filterable audit explorer | `done` | `/admin` now supports entity, role, action, and free-text filtering |
| CSV export path for audit/support workflows | `done` | `/api/admin/audit/export` shares the same filter model |
| Payment ledger filters and exports | `done` | `/admin` now supports status/purpose/query filtering, matching transition events, and CSV export through `/api/admin/payments/export` |
| Suspicious behavior review tools | `done` | Admins can now open and manage investigation cases from listing reviews, payment records, commission cases, and penalty cases, with a dedicated `/admin` investigation queue |
| Structured investigation verification logs | `done` | Each investigation case now supports a timeline of follow-up attempts, channels, outcomes, and optional case-status movement |
| Investigation explorer filters and export | `done` | `/admin` now supports status/type/priority/query filtering for investigation cases plus CSV export through `/api/admin/investigations/export` |

## Product Polish

| Task | Status | Notes |
| --- | --- | --- |
| Shared formatting helpers and not-found page | `done` | Currency/date/text helpers are in use |
| Pending-checkout UI and payment-return notices | `done` | Listing and seeker surfaces are covered |
| Better mobile ergonomics on dense admin screens | `planned` | Support tooling likely needs another mobile pass |
| Stronger copy around non-refundable fees and locked fields | `planned` | Can refine with commission/penalty rollout |
| SEO and public discoverability polish | `planned` | Public metadata and richer listing/search previews remain |

## Developer Quality

| Task | Status | Notes |
| --- | --- | --- |
| `npm run verify` quality gate | `done` | Includes payment tests, lint, and build |
| Focused payment tests | `done` | Payment parsing and secret validation covered |
| Auth and route integration tests | `planned` | Best next test expansion after audit tranche |
| Seed data for local demos | `planned` | Helpful once support/ops flows stabilize |
| Keep docs aligned with delivered behavior | `in_progress` | Update after each tranche |

## Current Tranche

Objective: deepen support and investigation tooling so admins can move from passive visibility into active case handling.

Planned deliverables:

- suspicious-activity review actions built on the new owner risk signals
- better export and filter coverage for payment and support workflows
- richer internal notes or dispute-handling paths for ambiguous cases
- tighter launch-hardening notes for auth and AfrIPay live validation

Tranche result:

- `done`: `/admin` now includes a filterable payment explorer with status, purpose, free-text lookup, and scoped stats
- `done`: matching payment transition events now follow the same filter scope for faster support tracing
- `done`: `/api/admin/payments/export` now exports the filtered payment ledger as CSV
- `done`: payment and audit explorer forms now preserve each other’s query state instead of wiping cross-tool filters
- `done`: admins can now open dedicated investigation cases from listing reviews, commission cases, penalty cases, and payment records
- `done`: `/admin` now includes an investigation queue with open, investigating, resolved, and dismissed case tracking
- `done`: `/api/admin/investigations` and `/api/admin/investigations/[caseId]/status` now provide rate-limited case creation and lifecycle updates with audit trails
- `done`: `/api/admin/investigations/[caseId]/updates` now records structured verification follow-up with target, method, outcome, note, and optional status movement
- `done`: the investigation queue now shows recent verification history instead of only static case metadata
- `done`: the investigation queue now supports status, case-type, priority, and free-text filtering with scoped counts and CSV export
- `done`: docs and tracker updated after verification

## Next Tranche

Objective: connect investigation outcomes back into the wider business workflow so support actions produce clearer downstream effects.

Planned deliverables:

- support-facing playbooks or canned workflows for deal verification, payment disputes, and document checks
- clearer downstream actions from investigation outcomes into listings, commission cases, penalties, or payments
- richer export and audit visibility for investigation timelines
- tighter launch-hardening notes for auth and live AfrIPay validation
