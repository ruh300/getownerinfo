# getownerinfo

Free-first starter for the getownerinfo marketplace.

## Stack

- Next.js 16 on Vercel
- React 19
- TypeScript
- Tailwind CSS 4
- MongoDB Atlas Free
- Cloudinary Free for media uploads

## Project Goals

This repository is being prepared for a Rwanda-focused marketplace where buyers pay a token fee to unlock verified owner contact information.

The initial build favors:

- low-cost deployment
- fast iteration
- clean separation between business rules and UI
- compatibility with Vercel Hobby during development

## Repository Layout

- `src/app`: App Router pages and route handlers
- `src/lib`: shared server utilities for env, database, uploads, and business rules
- `docs`: architecture notes and MVP planning
- `docs/engineering-roadmap.md`: prioritized senior-level completion plan and launch blockers
- `docs/task-tracker.md`: concrete delivery tracker with done, in-progress, next, and blocked items
- `.env.example`: environment variables for local setup

## Local Development

1. Copy `.env.example` to `.env.local`
2. Install dependencies with `npm install`
3. Start the app with `npm run dev`
4. Check `GET /api/status` to confirm MongoDB and Cloudinary are connected
5. Run `npm run verify` before pushing to catch payment tests, lint, and build regressions together

## Immediate Next Steps

1. Validate the legacy AfrIPay form-post contract against real gateway return payloads and reduce remaining manual-review ambiguity
2. Validate live AfrIPay return payloads against real gateway traffic so fewer payments need manual review
3. Add focused integration tests around payment callbacks, seeker posting settlement, and admin manual reconciliation
4. Connect investigation outcomes back into listing, payment, commission, and penalty workflows with clearer support actions
5. Harden auth, rate limiting, and deployment configuration for production
6. Rotate any AfrIPay credentials that were ever exposed in frontend templates, then keep them server-side only

## Current Integration Status

- MongoDB Atlas credentials are expected in `.env.local`
- Cloudinary credentials are expected in `.env.local`
- `AUTH_SESSION_SECRET` enables the protected workspace session cookie in production
- `PAYMENT_PROVIDER_MODE=afripay` enables the legacy AfrIPay form-post checkout contract, while `mock` keeps the local simulator available for fallback development
- `AFRIPAY_GATEWAY_URL` points at the legacy AfrIPay checkout endpoint used for the hosted handoff and server-side health probe
- AfrIPay app credentials are now modeled server-side with `AFRIPAY_APP_ID` and `AFRIPAY_APP_SECRET`, while the older key-pair env vars remain supported for legacy integration attempts
- Mongo collections now bootstrap their core indexes automatically on first use, including TTL cleanup for rate-limit buckets
- The repository includes reusable server helpers for both services
- `GET /api/status` performs a lightweight connectivity check without exposing secrets
- `GET /api/listings/eligibility` exposes the Model A/B rule engine for the listing wizard
- `POST /api/uploads/sign` signs direct Cloudinary uploads for listing images and ownership proofs, but now requires a signed owner-side session
- `/sign-in`, `/dashboard`, and `/admin` now provide a protected workspace using a signed session cookie
- `/listings/new` now includes browser autosave, Cloudinary uploads, persistent draft save/update, draft submission for admin review, overdue-commission blocking, and unpaid-penalty blocking for owner-side accounts
- `/admin` now shows a live review queue with approve/reject actions and audit logging
- `/admin` now also surfaces recent audit activity so operations can review unlocks, seeker posts, blocked messages, and review decisions in one place
- `/admin` review cards now include owner history, previous listing outcomes, unresolved commission or penalty signals, and simple risk flags before approval
- `/api/admin/listings/[listingId]/notes` now lets admin-side accounts save private investigation notes directly from the review queue without exposing them to owners
- `/api/admin/investigations` and `/api/admin/investigations/[caseId]/status` now let admin-side accounts open and manage durable investigation cases for listings, payments, commission cases, and penalty cases
- `/api/admin/investigations/[caseId]/updates` now lets admin-side accounts log structured verification follow-up with contact target, method, outcome, and optional case-status movement
- `/api/admin/investigations/export` now exports the filtered investigation queue as CSV for support and operations workflows
- `/listings` and `/listings/[listingId]` now expose the public marketplace and locked-contact detail view for approved listings
- `POST /api/listings/[listingId]/unlock` now creates a pending checkout intent for signed-in users and only unlocks contact after payment settlement
- Buyer dashboards now show unlock history, pending checkout actions, payment records, and recommended approved listings
- `GET` and `POST /api/listings/[listingId]/messages` now support pre-unlock buyer inquiries with blocked contact-sharing rules and audit logging
- Owner dashboards now surface recent buyer inquiries for approved listings
- `POST /api/seeker-requests` now creates a pending checkout intent and only publishes the anonymized buyer demand post after payment settlement
- `/seeker-requests` and `/seeker-requests/new` now expose the public seeker board and protected buyer request form
- Buyer dashboards now include live seeker request history and active seeker counts
- `/seeker-requests/new` now preserves the buyer draft in local storage so a checkout return does not wipe the seeker form
- `POST /api/seeker-requests/[requestId]/unlock` now creates a pending checkout intent for owner-side seeker contact unlocks and applies access after settlement
- `/seeker-requests/[requestId]` now exposes a detail page with locked seeker contact fields and owner-side unlock flow
- `POST /api/seeker-requests/[requestId]/responses` now lets unlocked owner-side accounts send or update a direct response to the seeker
- Buyer dashboards and seeker detail pages now surface the owner responses received on live seeker requests
- `POST /api/seeker-requests/[requestId]/status` now lets the requester mark a demand post fulfilled with a matched owner response or close it without a match
- Seeker request detail pages now stay visible to the requester after closure or fulfillment, and dashboards now show match outcomes and closure notes
- `GET` and `POST /api/seeker-requests/[requestId]/messages` now provide a matched-only follow-up thread between the requester and the selected owner response
- Buyer and owner dashboards now surface matched seeker conversations so active deal follow-up stays visible after the initial match
- `/admin` now includes a fee settings panel with admin-only save access for listing token fees and seeker pricing
- `POST /api/admin/fee-settings` now stores fee settings in MongoDB and applies them to new drafts, seeker posts, Model A commission invoices, and fallback fee displays
- Listing drafts, listing unlocks, seeker posting, seeker unlock pricing, and Model A commission rules now flow through shared platform fee settings instead of hard-coded fallback amounts
- `POST /api/listings/[listingId]/status` now requires a final amount when a Model A listing is marked sold or rented, then auto-generates a system commission case with a due date
- Owner dashboards now include a commission ledger, outstanding/overdue summaries, and a blocking notice when overdue commission pauses new listing creation
- `/admin` now includes a commission overview so operations can review due and overdue cases, then mark them paid or waived without editing Mongo data directly
- `POST /api/admin/commissions/[commissionCaseId]/status` now lets admin accounts reconcile commission cases into paid or waived states
- Automatic penalties are now generated for overdue commission cases using the admin-controlled penalty formula
- Owner dashboards now include a penalty ledger, unpaid-balance totals, and a blocking notice when unpaid penalties pause new listing creation
- `/admin` now includes a penalty overview so operations can review penalty cases, adjust due amounts, or settle or waive them without editing Mongo data directly
- `POST /api/admin/penalties/[penaltyId]/amount` now lets admin accounts adjust a due penalty amount with an audit trail and owner notification
- `POST /api/admin/penalties/[penaltyId]/status` now lets admin accounts reconcile penalty cases into paid or waived states
- `docs/engineering-roadmap.md` now tracks the remaining production work in priority order
- `src/lib/payments/workflow.ts` now centralizes payment records, pending checkout intents, legacy AfrIPay form-post handoff data, idempotent settlement, and unlock-effect application
- `/payments/checkout/[reference]` now hosts either the mock confirmation screen or a real AfrIPay auto-post handoff depending on `PAYMENT_PROVIDER_MODE`
- `/api/payments/callback/afripay` now accepts both query-string and form-post returns, normalizes legacy field names centrally, maps recognizable statuses automatically, and keeps ambiguous returns pending for manual review instead of unlocking incorrectly
- `/api/payments/webhooks/afripay` now accepts `client_token` as a payment reference fallback for legacy payloads and records unknown statuses safely instead of discarding the signal
- AfrIPay callback and webhook routes now share a pure signal-normalization helper with safe payload previews so reconciliation is testable and less error-prone
- `/api/admin/payments/[reference]/status` now lets admin accounts manually reconcile ambiguous pending payments without editing Mongo data directly
- Listing and seeker detail pages now surface payment return-state banners so paid, failed, and cancelled checkout outcomes read clearly after redirect
- `/admin` now includes cancelled-payment counts and a payment transition feed so operations can see pending, failed, cancelled, and settled movements in one payment-native view
- `/admin` payment cards now include manual reconciliation actions for pending or ambiguous AfrIPay outcomes, while paid payments stay immutable from the UI
- `/admin` now includes a query-backed payment explorer with status and purpose filters, free-text lookup, matching transition events, and CSV export
- `/admin` now also includes a searchable audit explorer with CSV export support for support and dispute workflows
- `/admin` now also includes an investigation queue with open, investigating, resolved, and dismissed case tracking, plus launch actions from listing reviews, payment records, commission cases, and penalty cases
- `/admin` investigation cards now include a verification timeline so support can see buyer, owner, provider, and internal follow-up in one place
- `/admin` investigation cards now also support status, case-type, priority, and free-text filtering with scoped queue counts
- Sign-in, unlock, seeker-post, and messaging write routes now use Mongo-backed rate limiting with response headers and retry hints
- Draft save/submit, upload-sign, admin review/settings, lifecycle changes, notification-read, seeker responses, and mock payment completion now use the same durable rate-limit layer
- Core write routes now share a reusable JSON-object parser and input-error helper so malformed payloads fail consistently instead of being handled ad hoc
- `/api/status` now reports safe AfrIPay config visibility, including the configured checkout contract, whether server credentials are present, and whether the configured checkout endpoint is publicly reachable from the server

## AfrIPay Security Note

- Never place `app_id`, `app_secret`, API keys, or webhook secrets in Blade templates, React components, or any other client-delivered code
- If those values were visible in frontend templates, treat them as exposed and rotate them before using them again
- Keep live AfrIPay credentials in server env vars only
- `npm run test:payments` now covers AfrIPay status mapping, callback/webhook signal extraction, safe preview redaction, and webhook-secret comparison
- Payment creation, payment status transitions, and ambiguous gateway returns are now recorded in immutable audit logs under `entityType: "payment"`
- `/admin` now includes a payment overview with paid totals, revenue splits, cancelled counts, a recent ledger, and recent payment transition events
- `src/lib/notifications/workflow.ts` now centralizes in-app notifications for review, inquiry, unlock, and seeker events
- `/dashboard`, `/admin`, and the header shell now expose unread notification counts and a notification center
- `POST /api/listings/[listingId]/status` now lets owners move approved listings through lifecycle states like under negotiation, sold, rented, not concluded, expired, and back to active when allowed
- Owner dashboards now include lifecycle controls, and buyer unlock history now reflects when a listing is no longer public
- Listing conversations now use buyer-linked threads so unlocked buyers can receive owner replies, and owners can respond from the dashboard inbox once the listing has been unlocked

## MongoDB Atlas Note

If Cloudinary works but MongoDB does not, check Atlas before changing code:

- confirm the database user exists and has access
- add your current IP address to the Atlas project IP access list
- if you are testing from Vercel later, add Vercel egress access or move to a production-safe Atlas network setup

## Useful Local Endpoints

- `/api/status`
- `/api/admin/fee-settings`
- `/api/auth/session`
- `/api/payments/callback/afripay`
- `/api/payments/mock/[reference]/complete`
- `/api/payments/webhooks/afripay`
- `/api/admin/payments/[reference]/status`
- `/api/admin/payments/export`
- `/api/admin/commissions/[commissionCaseId]/status`
- `/api/admin/investigations`
- `/api/admin/investigations/export`
- `/api/admin/investigations/[caseId]/status`
- `/api/admin/investigations/[caseId]/updates`
- `/api/admin/listings/[listingId]/notes`
- `/api/admin/penalties/[penaltyId]/amount`
- `/api/admin/penalties/[penaltyId]/status`
- `/api/admin/audit/export`
- `/api/listings/[listingId]/messages`
- `/api/listings/[listingId]/unlock`
- `/api/listings/eligibility?category=real_estate_rent&units=1&priceRwf=1500000`
- `/api/seeker-requests`
- `/api/seeker-requests/[requestId]/responses`
- `/api/seeker-requests/[requestId]/messages`
- `/api/seeker-requests/[requestId]/status`
- `/api/seeker-requests/[requestId]/unlock`
- `/api/uploads/sign`
- `/sign-in`
- `/dashboard`
- `/admin`
- `/listings`
- `/listings/[listingId]`
- `/listings/new`
- `/payments/checkout/[reference]`
- `/seeker-requests`
- `/seeker-requests/[requestId]`
- `/seeker-requests/new`
