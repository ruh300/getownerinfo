# Architecture Notes

## Free-first deployment

This project is optimized for a low-cost MVP:

- Frontend and server routes on Vercel
- MongoDB Atlas Free for application data
- Cloudinary Free for listing media and private ownership documents

## Core modules

- `auth`: user registration, login, role checks
- `listings`: listing creation, browsing, approval states
- `listing-lifecycle`: owner-side status transitions after approval, plus buyer/admin visibility for those changes
- `commissions`: Model A invoice generation, overdue tracking, owner-side blocking, and admin reconciliation
- `penalties`: overdue-commission penalty generation, unpaid-balance enforcement, owner/admin ledgers, and admin adjustment or reconciliation
- `investigations`: admin-only case intake and resolution for suspicious activity, payment disputes, document checks, and manual verification workflows
- `chat`: listing inquiries, blocked pre-unlock content, and post-unlock reply threads
- `payments`: payment intents, hosted mock or AfrIPay checkout handoff, legacy form-post callback/webhook settlement, manual admin reconciliation, payment-transition audit logs, and payment-state UI feedback
- `token-unlocks`: immutable unlock records
- `admin`: verification, fees, penalties, audit visibility
- `fee-settings`: admin-controlled fee matrix for listing unlocks, seeker pricing, and commission rules
- `seeker-requests`: anonymized demand-side posts, owner-side unlocks, and direct seeker responses
- `seeker-request-lifecycle`: requester-side fulfillment, closure, and matched-response outcome tracking
- `seeker-request-messaging`: matched-only follow-up conversations after a seeker selects an owner response
- `notifications`: in-app user alerts for review, unlock, seeker, and inquiry events

## Data design direction

Collections to start with:

- `users`
- `listings`
- `listingDrafts`
- `payments`
- `commissionCases`
- `feeSettings`
- `investigationCases`
- `investigationUpdates`
- `tokenUnlocks`
- `seekerRequestUnlocks`
- `seekerResponses`
- `seekerMatchMessages`
- `auditLogs`
- `penalties`
- `chatMessages`
- `seekerRequests`
- `notifications`

## Upload strategy

- Listing images: direct browser upload to Cloudinary
- Ownership proofs: signed uploads to a restricted Cloudinary folder
- Application server stores metadata only
- The listing wizard keeps a browser-local draft snapshot so work is not lost while server persistence is still being stabilized

## Business-rule modules

- `src/lib/listings/eligibility.ts`: central Model A/B eligibility engine
- `src/lib/formatting/currency.ts`: Rwf formatting helper for consistent explanations
- `src/lib/formatting/date.ts`: consistent Rwanda-facing date and datetime formatting
- `src/lib/formatting/text.ts`: shared enum humanization and category labels
- `src/lib/data/collections.ts`: typed MongoDB collection access and starter indexes
- `src/lib/fee-settings/workflow.ts`: default fee matrix, Mongo-backed settings retrieval, and fee resolution helpers for listing fees, seeker pricing, and Model A commission rules
- `src/lib/commissions/workflow.ts`: commission-case generation from sold/rented Model A outcomes, overdue blocking, owner/admin ledger views, and admin reconciliation into paid or waived states
- `src/lib/penalties/workflow.ts`: overdue-commission penalty generation, unpaid-balance guards, owner/admin ledger views, admin amount adjustment, and paid or waived reconciliation
- `src/lib/payments/workflow.ts`: centralized payment records, pending checkout intents, legacy AfrIPay handoff payloads, idempotent settlement, unlock and seeker-post publish effects, admin reconciliation, payment-transition audit logs, and admin payment analytics
- `src/lib/payments/afripay.ts`: server-only AfrIPay credential resolution, safe config summaries, checkout endpoint probing, and legacy contract helpers
- `src/lib/payments/afripay-signal.ts`: pure AfrIPay status normalization, callback/webhook field extraction, safe payload previews, and webhook-secret comparison for testable gateway parsing
- `src/app/api/payments/callback/afripay/route.ts` and `src/app/api/payments/webhooks/afripay/route.ts`: shared-validation settlement entry points using the common route-input layer, legacy `client_token` fallback support, and AfrIPay status mapping
- `src/lib/notifications/workflow.ts`: centralized in-app notification creation, unread counts, and notification center data
- `src/lib/security/rate-limit.ts`: Mongo-backed throttling with TTL-backed buckets, rate-limit headers, and reusable request/session helpers
- `src/lib/http/route-input.ts`: shared JSON-object parsing, trimmed-string helpers, enum coercion, and consistent input-error handling for route handlers
- `src/lib/admin/audit-explorer.ts`: shared admin audit filters, result serialization, and CSV export generation
- `src/lib/admin/payment-explorer.ts`: shared admin payment filters, matching payment/event serialization, and CSV export generation
- `src/lib/investigations/workflow.ts`: investigation-case creation, duplicate-active-case protection, query-backed admin explorer summaries, structured follow-up timelines, CSV export generation, and case lifecycle updates with audit logs
- `src/lib/listings/lifecycle.ts`: shared lifecycle transition rules for listing status updates
- `src/app/api/admin/investigations/route.ts`: admin-only investigation-case creation for listing, payment, commission, penalty, or user-level review
- `src/app/api/admin/investigations/[caseId]/status/route.ts`: admin-only investigation-case lifecycle updates for open, investigating, resolved, or dismissed states
- `src/app/api/admin/investigations/[caseId]/updates/route.ts`: admin-only structured verification follow-up logging with case-status updates when needed
- `src/app/api/admin/investigations/export/route.ts`: admin-only CSV export for the filtered investigation explorer
- `src/app/api/admin/commissions/[commissionCaseId]/status/route.ts`: admin-only commission reconciliation endpoint for marking a case paid or waived
- `src/app/api/admin/listings/[listingId]/notes/route.ts`: admin-only internal investigation notes for pending review cases
- `src/app/api/admin/payments/export/route.ts`: admin-only CSV export for the filtered payment explorer
- `src/app/api/admin/penalties/[penaltyId]/amount/route.ts`: admin-only penalty adjustment endpoint with audit logging and owner notification
- `src/app/api/admin/penalties/[penaltyId]/status/route.ts`: admin-only penalty reconciliation endpoint for marking a case paid or waived
- `src/lib/seeker-requests/responses.ts`: owner response writes, requester response views, and seeker response counts
- `src/lib/seeker-requests/lifecycle.ts`: requester-side fulfillment and closure rules, plus match outcome notifications
- `src/lib/seeker-requests/messaging.ts`: matched-only seeker follow-up threads, notifications, and dashboard conversation summaries
- `src/app/payments/checkout/[reference]/page.tsx`: hosted mock checkout screen used by unlock payment intents during development
- `src/lib/payments/search-params.ts`: shared payment return-state parsing for detail-page banners after checkout redirects
- `src/app/api/uploads/sign/route.ts`: signs direct Cloudinary uploads without exposing API secrets

## Delivery roadmap

- `docs/engineering-roadmap.md`: prioritized execution plan covering launch blockers, workflow completion, governance, polish, and developer quality

## Environment-backed integrations

- `src/lib/env.ts`: validates required server environment variables
- `src/lib/mongodb.ts`: creates a cached MongoDB Atlas client for Next.js route handlers
- `src/lib/cloudinary.ts`: configures Cloudinary once for signed uploads and asset management
- `src/app/api/status/route.ts`: lightweight system connectivity probe for setup verification

## Atlas troubleshooting reminder

MongoDB Atlas requires both of the following:

- a valid database user
- an IP address on the project IP access list for the environment trying to connect

## Guardrails

- Treat `auditLogs`, `tokenUnlocks`, and `penalties` as append-only
- Keep pricing in integer Rwf values
- Default ambiguous eligibility to Model B
- Never expose ownership proofs or identity documents to buyer roles
- Keep abuse controls close to write routes and prefer durable rate limits over in-memory counters on Vercel
- Require authenticated owner-side sessions before issuing upload signatures for listing media or ownership proofs
- Treat any payment credentials discovered in frontend-delivered templates as compromised until rotated
- Keep paid payments effectively immutable from the admin UI; allow manual confirmation for ambiguous pending flows without implementing unsafe reversal logic
- Surface owner history, unresolved balances, and repeated outcome signals to admins before they approve new listings
- Prefer explicit investigation cases over free-form notes alone when support or trust-and-safety work needs a durable owner, payment, or dispute trail
