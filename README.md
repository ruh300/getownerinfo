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
- `.env.example`: environment variables for local setup

## Local Development

1. Copy `.env.example` to `.env.local`
2. Install dependencies with `npm install`
3. Start the app with `npm run dev`
4. Check `GET /api/status` to confirm MongoDB and Cloudinary are connected
5. Run `npm run verify` before pushing to catch lint and build regressions together

## Immediate Next Steps

1. Replace prototype payment records with real AfrIPay checkout, callback, and webhook orchestration
2. Expand inquiry messaging into a moderated two-way owner and buyer conversation flow
3. Add notifications, penalties, and admin audit reporting views
4. Harden auth, rate limiting, and deployment configuration for production
5. Complete operational polish from `docs/engineering-roadmap.md` before launch

## Current Integration Status

- MongoDB Atlas credentials are expected in `.env.local`
- Cloudinary credentials are expected in `.env.local`
- `AUTH_SESSION_SECRET` enables the protected workspace session cookie in production
- The repository includes reusable server helpers for both services
- `GET /api/status` performs a lightweight connectivity check without exposing secrets
- `GET /api/listings/eligibility` exposes the Model A/B rule engine for the listing wizard
- `POST /api/uploads/sign` signs direct Cloudinary uploads for listing images and ownership proofs
- `/sign-in`, `/dashboard`, and `/admin` now provide a protected workspace using a signed session cookie
- `/listings/new` now includes browser autosave, Cloudinary uploads, persistent draft save/update, and draft submission for admin review
- `/admin` now shows a live review queue with approve/reject actions and audit logging
- `/admin` now also surfaces recent audit activity so operations can review unlocks, seeker posts, blocked messages, and review decisions in one place
- `/listings` and `/listings/[listingId]` now expose the public marketplace and locked-contact detail view for approved listings
- `POST /api/listings/[listingId]/unlock` now records the prototype token unlock flow for signed-in users
- Buyer dashboards now show unlock history, token-fee payment records, and recommended approved listings
- `GET` and `POST /api/listings/[listingId]/messages` now support pre-unlock buyer inquiries with blocked contact-sharing rules and audit logging
- Owner dashboards now surface recent buyer inquiries for approved listings
- `POST /api/seeker-requests` now records anonymized buyer demand posts with a prototype seeker posting fee
- `/seeker-requests` and `/seeker-requests/new` now expose the public seeker board and protected buyer request form
- Buyer dashboards now include live seeker request history and active seeker counts
- `POST /api/seeker-requests/[requestId]/unlock` now records prototype owner-side seeker contact unlocks with payment and audit logs
- `/seeker-requests/[requestId]` now exposes a detail page with locked seeker contact fields and owner-side unlock flow
- `docs/engineering-roadmap.md` now tracks the remaining production work in priority order

## MongoDB Atlas Note

If Cloudinary works but MongoDB does not, check Atlas before changing code:

- confirm the database user exists and has access
- add your current IP address to the Atlas project IP access list
- if you are testing from Vercel later, add Vercel egress access or move to a production-safe Atlas network setup

## Useful Local Endpoints

- `/api/status`
- `/api/auth/session`
- `/api/listings/[listingId]/messages`
- `/api/listings/[listingId]/unlock`
- `/api/listings/eligibility?category=real_estate_rent&units=1&priceRwf=1500000`
- `/api/seeker-requests`
- `/api/seeker-requests/[requestId]/unlock`
- `/api/uploads/sign`
- `/sign-in`
- `/dashboard`
- `/admin`
- `/listings`
- `/listings/[listingId]`
- `/listings/new`
- `/seeker-requests`
- `/seeker-requests/[requestId]`
- `/seeker-requests/new`
