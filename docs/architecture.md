# Architecture Notes

## Free-first deployment

This project is optimized for a low-cost MVP:

- Frontend and server routes on Vercel
- MongoDB Atlas Free for application data
- Cloudinary Free for listing media and private ownership documents

## Core modules

- `auth`: user registration, login, role checks
- `listings`: listing creation, browsing, approval states
- `payments`: AfrIPay checkout and webhook handling
- `token-unlocks`: immutable unlock records
- `admin`: verification, fees, penalties, audit visibility
- `seeker-requests`: anonymized demand-side posts

## Data design direction

Collections to start with:

- `users`
- `listings`
- `listingDrafts`
- `payments`
- `tokenUnlocks`
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
- `src/lib/data/collections.ts`: typed MongoDB collection access and starter indexes
- `src/app/api/uploads/sign/route.ts`: signs direct Cloudinary uploads without exposing API secrets

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
