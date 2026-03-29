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
- `chat`: listing inquiries, blocked pre-unlock content, and post-unlock reply threads
- `payments`: AfrIPay checkout and webhook handling
- `token-unlocks`: immutable unlock records
- `admin`: verification, fees, penalties, audit visibility
- `fee-settings`: admin-controlled fee matrix for listing unlocks and seeker pricing
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
- `feeSettings`
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
- `src/lib/fee-settings/workflow.ts`: default fee matrix, Mongo-backed settings retrieval, and fee resolution helpers
- `src/lib/payments/workflow.ts`: centralized payment record creation and admin payment analytics
- `src/lib/notifications/workflow.ts`: centralized in-app notification creation, unread counts, and notification center data
- `src/lib/listings/lifecycle.ts`: shared lifecycle transition rules for listing status updates
- `src/lib/seeker-requests/responses.ts`: owner response writes, requester response views, and seeker response counts
- `src/lib/seeker-requests/lifecycle.ts`: requester-side fulfillment and closure rules, plus match outcome notifications
- `src/lib/seeker-requests/messaging.ts`: matched-only seeker follow-up threads, notifications, and dashboard conversation summaries
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
