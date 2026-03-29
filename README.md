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
- `.env.example`: environment variables for local setup

## Local Development

1. Copy `.env.example` to `.env.local`
2. Install dependencies with `npm install`
3. Start the app with `npm run dev`
4. Check `GET /api/status` to confirm MongoDB and Cloudinary are connected

## Immediate Next Steps

1. Set up MongoDB connection utilities and shared types
2. Add authentication and role-aware layouts
3. Build the listing creation wizard
4. Add Cloudinary signed upload support
5. Implement admin approval and token unlock flows

## Current Integration Status

- MongoDB Atlas credentials are expected in `.env.local`
- Cloudinary credentials are expected in `.env.local`
- `AUTH_SESSION_SECRET` enables the protected workspace session cookie in production
- The repository includes reusable server helpers for both services
- `GET /api/status` performs a lightweight connectivity check without exposing secrets
- `GET /api/listings/eligibility` exposes the Model A/B rule engine for the listing wizard
- `POST /api/uploads/sign` signs direct Cloudinary uploads for listing images and ownership proofs
- `/sign-in`, `/dashboard`, and `/admin` now provide a protected workspace using a signed session cookie
- `/listings/new` now includes browser autosave, Cloudinary uploads, authenticated access control, and draft submission wiring

## MongoDB Atlas Note

If Cloudinary works but MongoDB does not, check Atlas before changing code:

- confirm the database user exists and has access
- add your current IP address to the Atlas project IP access list
- if you are testing from Vercel later, add Vercel egress access or move to a production-safe Atlas network setup

## Useful Local Endpoints

- `/api/status`
- `/api/auth/session`
- `/api/listings/eligibility?category=real_estate_rent&units=1&priceRwf=1500000`
- `/api/uploads/sign`
- `/sign-in`
- `/dashboard`
- `/admin`
- `/listings/new`
