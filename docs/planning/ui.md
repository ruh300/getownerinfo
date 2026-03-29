# GETOWNERINFO — MASTER UI PROMPT
**For:** AI frontend code generation (React/Next.js)  
**Platform:** getownerinfo.com — Rwanda Hybrid Marketplace  
**Scope:** Landing Page · Listing Creation Flow · Buyer Token Unlock Flow · Owner & Admin Dashboards

---

## 🎨 DESIGN SYSTEM & BRAND IDENTITY

### Aesthetic Direction
**Refined Trust + African Digital Modernity.**  
The design should feel premium, credible, and locally rooted — not generic SaaS. Think of a high-end property portal built specifically for East Africa: clean structure with warm, grounded accents. Avoid cold Western fintech aesthetics. The platform deals in privacy, verified ownership, and real money — the UI must communicate trust at every touchpoint.

**Tone:** Professional · Warm · Secure · Confident  
**NOT:** Generic · Purple-gradient · Corporate Western · Playful

---

### Color Palette (CSS Variables)
```css
:root {
  /* Primary — deep forest green: trust, growth, Rwanda's landscape */
  --color-primary:        #1A4D2E;
  --color-primary-light:  #2E7D52;
  --color-primary-hover:  #145C38;

  /* Accent — warm amber gold: value, transaction, premium */
  --color-accent:         #C8860A;
  --color-accent-light:   #F0A830;
  --color-accent-hover:   #A06B08;

  /* Surface */
  --color-bg:             #F7F5F0;   /* warm off-white, not stark white */
  --color-surface:        #FFFFFF;
  --color-surface-alt:    #EFF3EF;   /* light green-tinted card bg */
  --color-border:         #D8D4CC;

  /* Text */
  --color-text-primary:   #1A1A18;
  --color-text-secondary: #5C5C54;
  --color-text-muted:     #9A9A90;
  --color-text-inverse:   #FFFFFF;

  /* Status */
  --color-success:        #1A7A4A;
  --color-warning:        #C8860A;
  --color-error:          #B83232;
  --color-info:           #1A5C8A;

  /* Lock / Token System */
  --color-locked:         #C8860A;   /* amber for locked state */
  --color-unlocked:       #1A7A4A;   /* green for unlocked state */
  --color-locked-bg:      #FFF8EC;
  --color-unlocked-bg:    #EDFAF3;

  /* Shadows */
  --shadow-sm:  0 1px 3px rgba(26,77,46,0.08);
  --shadow-md:  0 4px 16px rgba(26,77,46,0.12);
  --shadow-lg:  0 8px 32px rgba(26,77,46,0.16);
  --shadow-card: 0 2px 8px rgba(0,0,0,0.07);
}
```

---

### Typography
```css
/* Import in <head> */
@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');

:root {
  --font-display: 'DM Serif Display', Georgia, serif;  /* headings, hero text */
  --font-body:    'DM Sans', sans-serif;               /* body, UI, labels */

  --text-xs:   0.75rem;    /* 12px — labels, badges */
  --text-sm:   0.875rem;   /* 14px — secondary text */
  --text-base: 1rem;       /* 16px — body */
  --text-lg:   1.125rem;   /* 18px — lead text */
  --text-xl:   1.25rem;    /* 20px — card titles */
  --text-2xl:  1.5rem;     /* 24px — section headers */
  --text-3xl:  2rem;       /* 32px — page titles */
  --text-4xl:  2.75rem;    /* 44px — hero headline */
  --text-5xl:  3.5rem;     /* 56px — display */

  --leading-tight:  1.2;
  --leading-normal: 1.6;
  --tracking-tight: -0.02em;
  --tracking-wide:  0.06em;
}
```

---

### Spacing & Layout
```css
:root {
  --radius-sm:  4px;
  --radius-md:  8px;
  --radius-lg:  12px;
  --radius-xl:  20px;
  --radius-pill: 999px;

  --space-1:  4px;
  --space-2:  8px;
  --space-3:  12px;
  --space-4:  16px;
  --space-5:  20px;
  --space-6:  24px;
  --space-8:  32px;
  --space-10: 40px;
  --space-12: 48px;
  --space-16: 64px;
  --space-20: 80px;
  --space-24: 96px;

  --max-width-content: 1200px;
  --max-width-narrow:  720px;
  --max-width-wide:    1440px;
  --navbar-height: 68px;
}
```

---

### Component Tokens
```css
/* Buttons */
.btn-primary {
  background: var(--color-primary);
  color: var(--color-text-inverse);
  border-radius: var(--radius-md);
  padding: 12px 28px;
  font-family: var(--font-body);
  font-weight: 600;
  font-size: var(--text-sm);
  letter-spacing: var(--tracking-wide);
  text-transform: uppercase;
  transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
}
.btn-primary:hover {
  background: var(--color-primary-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.btn-accent {
  background: var(--color-accent);
  color: var(--color-text-inverse);
  /* same shape as primary */
}

.btn-outline {
  background: transparent;
  border: 1.5px solid var(--color-primary);
  color: var(--color-primary);
}

/* Cards */
.card {
  background: var(--color-surface);
  border-radius: var(--radius-lg);
  border: 1px solid var(--color-border);
  box-shadow: var(--shadow-card);
  overflow: hidden;
}

/* Badges */
.badge-model-a {
  background: var(--color-primary);
  color: white;
  font-size: var(--text-xs);
  font-weight: 600;
  padding: 3px 10px;
  border-radius: var(--radius-pill);
  letter-spacing: 0.04em;
}
.badge-model-b {
  background: var(--color-surface-alt);
  color: var(--color-primary);
  border: 1px solid var(--color-primary-light);
  /* same shape */
}
.badge-locked {
  background: var(--color-locked-bg);
  color: var(--color-locked);
  border: 1px solid #F0D080;
}
.badge-unlocked {
  background: var(--color-unlocked-bg);
  color: var(--color-unlocked);
  border: 1px solid #8FD4AA;
}
```

---

## 🖥️ PAGE 1: LANDING / HOME PAGE

### Layout Structure
```
[Navbar]
[Hero Section]
[How It Works — 3 steps]
[Featured Listings Grid]
[Token Fee Explainer Section]
[Category Browser]
[Trust/Stats Bar]
[Seeker CTA]
[Footer]
```

### Navbar
- Logo left: wordmark "getownerinfo" in `var(--font-display)`, color `var(--color-primary)`
- Nav links: Browse Listings · Post a Listing · How It Works · Pricing
- Right: "Sign In" (outline btn) + "Post Free" (primary btn, Model A implication)
- Sticky on scroll; adds `box-shadow` and slight `backdrop-filter: blur(8px)` on scroll
- Mobile: hamburger menu with slide-in drawer

### Hero Section
```
Layout: Split — Left: text + CTAs | Right: listing card preview (animated)

Headline (DM Serif Display, 52px):
  "Connect Directly  
  With Verified Owners."

Subheadline (DM Sans, 18px, muted):
  "Rwanda's first token-access marketplace. Browse real estate,
  vehicles, and more — unlock owner contact only when you're serious."

CTAs:
  [Browse Listings]  ← primary btn
  [Post Your Listing] ← outline btn

Right side: Floating "listing card" mockup showing:
  - Blurred contact details (locked state)
  - Lock icon with "Pay Token to Unlock"
  - Property image, price tag, location

Background: subtle diagonal pattern using --color-surface-alt
  + one soft blob of --color-primary at 4% opacity bottom-left
```

### How It Works (3 Steps)
```
Step 1 — Browse & Find
"Search listings across real estate, vehicles, furniture, and more."
Icon: magnifying glass

Step 2 — Pay Token Fee
"Pay a small non-refundable token to unlock the owner's direct contact and exact address."
Icon: shield with key

Step 3 — Contact Owner Directly
"Call the verified owner. No middlemen. No commissions from your side."
Icon: phone check

Layout: Horizontal 3-column on desktop, vertical stack on mobile
Each card: icon (primary color), number badge, title, description
Connector lines between steps (dashed, --color-border)
```

### Featured Listings Grid
```
Grid: 3 columns desktop / 2 tablet / 1 mobile
Each card contains:
  - Image (aspect-ratio: 4/3, object-fit: cover)
  - Category badge (top-left overlay)
  - Model A / Model B badge (top-right overlay)
  - Title (DM Serif Display, 18px)
  - Location (icon + text, muted)
  - Price (accent color, bold)
  - [Unlock Contact] button — locked state → amber
  - Token fee amount shown below button

Card hover: translateY(-4px) + shadow increase
Locked state: contact row shows blur + lock icon
```

### Token Fee Explainer Section
```
Background: --color-primary (dark green)
Text: white

Left: 
  Headline: "Why a Token Fee?"
  Body: Explain purpose — serious buyers only, owner privacy, fraud reduction

Right: 2-column list
  ✅ Unlock owner name & phone
  ✅ Exact address + Google Maps pin
  ✅ Keys manager contact
  ❌ National ID (never shown)
  ❌ Ownership documents (never shown)

CTA: [Browse Listings] in amber/accent
```

### Category Browser
```
Horizontal scrollable pill row on mobile; grid on desktop:
  Real Estate · Vehicles · Furniture · Appliances · Business · Made in Rwanda

Each pill: icon + label + count badge
Active/hover: --color-primary background, white text
```

### Trust Bar (Stats)
```
4 stats in a horizontal bar:
  🏠 X+ Verified Listings
  🔑 X+ Successful Unlocks
  ✅ 100% Verified Owners
  🇷🇼 Rwanda-Based Platform

Background: --color-surface-alt
Font: DM Serif Display for numbers, DM Sans for labels
```

---

## 📋 PAGE 2: LISTING CREATION FLOW

### Design Pattern
- **Multi-step wizard** — 10 steps with progress bar at top
- Step indicator: numbered circles, completed = filled primary, current = outlined accent, upcoming = gray
- Each step occupies full content area — no horizontal scrolling
- "Save Draft" always visible top-right
- "Back" / "Continue" navigation bottom of each step
- Mobile-first layout; max-width 680px centered

### Progress Bar
```
[1]━━[2]━━[3]━━[4]━━[5]━━[6]━━[7]━━[8]━━[9]━━[10]
 ✓    ✓    •    ○    ○    ○    ○    ○    ○    ○

Step label shown below current step number
Progress % shown top-right: "Step 3 of 10"
```

### Step 1 — Category Selection
```
UI: Large card grid (2-3 cols)
Each category card:
  - Icon (SVG, primary color)
  - Category name (DM Serif Display)
  - Short description
  - Hover: border color = --color-primary, slight scale

After category: subcategory dropdown (dynamically loaded)
After subcategory: Item Type dropdown (dynamically loaded)

Validation: Cannot proceed without all 3 selected
```

### Step 2 — Owner Type
```
Radio card group (not standard radio buttons — full styled cards):
  [Owner]        [Manager / Representative]        [Third Party]

Selected card: primary border + light green bg fill
If Manager or Third Party selected:
  → Reveal animated fields: Representative Name, Phone, Relationship to Owner

Helper text: "Must match ownership proof you'll upload in Step 7"
```

### Step 3 — Quantity, Location & Price
```
Quantity:
  Number input with +/− controls
  If > 1: Banner appears: "Multiple units detected → Model B will apply"

Location (tabbed input):
  Tab 1: UPI Number
  Tab 2: Street + House Number
  Tab 3: Google Maps Pin (embed map picker)
  Tab 4: WhatsApp Location (instructions + paste field)

Price:
  Currency field pre-labeled "Rwf"
  18% VAT note: "All prices are VAT inclusive (18%)"
  Real-time eligibility hint appears:
    → "This price qualifies for Model A (Exclusive)" ← green badge
    → "This price is below Model A threshold — Model B will apply" ← amber badge
```

### Step 4 — Model Selection
```
If ELIGIBLE for Model A:
  Two large option cards side by side:

  ┌─────────────────────────────┐  ┌─────────────────────────────┐
  │  ⭐ MODEL A — EXCLUSIVE      │  │  MODEL B — PAY TO LIST      │
  │  Commission after sale only  │  │  Pay upfront, list instantly │
  │  Digital agreement required  │  │  No agreement needed         │
  │  Duration selection          │  │  Duration selection          │
  │  [Select Model A]            │  │  [Select Model B]            │
  └─────────────────────────────┘  └─────────────────────────────┘

If NOT ELIGIBLE:
  Model B card shown only, with explanation tooltip:
  "Your listing does not meet Model A eligibility (price threshold or multiple units)"

Duration selector (after model chosen):
  Pill buttons: 1 month | 2 months (-20%) | 3 months (-30%) | 6 months (-40%) | 12 months (-50%)
  Selected pill: accent background
  Discount shown inline: "3 months — Save 30% → X,XXX Rwf"
```

### Step 5 — Token Fee Option
```
Shown only if applicable to category.

Toggle card:
  "Enable Buyer Token Fee for this listing?"
  ON/OFF toggle (primary green when ON)

If ON:
  Show token fee amount (read-only, set by admin per category)
  Explanation: "Buyers must pay this fee to unlock your contact info and exact address"
  Preview of what gets unlocked ✅ and what stays hidden ❌
```

### Step 6 — Listing Details
```
Fields:
  Title (text input, max 80 chars, live char counter)
  Description (textarea, max 1000 chars, live counter)
  Features (tag-style multi-input: type + Enter to add)
  Images (drag-and-drop upload zone, max 10 images, 5MB each)
    - Thumbnail previews with remove (×) button
    - Progress bar per image during upload
  Ownership Proof (file upload, accept: .pdf/.jpg/.png, required)
    - Shows "Admin-only · Never shown to buyers" disclaimer

Optional: "Need help? Request assisted onboarding" link
```

### Step 7 — Duration & Expiry
```
Recap card showing:
  Model: A or B
  Duration: X months
  Discount applied: X%
  Listing fee (Model B) or "Commission due after deal" (Model A)
  Expiry date: calculated and shown (e.g. "Expires: 29 June 2026")

Model A:
  "You can extend duration without a new agreement. Extension logs timestamp and updates expiry."

Model B:
  "Extension requires a new payment. You'll receive an expiry reminder 7 days before."
```

### Step 8 — Review & Submit
```
Summary accordion:
  > Category & Item
  > Owner Info
  > Location
  > Price & Model
  > Token Fee
  > Listing Details
  > Duration

Each section has [Edit] link → jumps back to that step

At bottom:
  Model A: [Sign Digital Agreement & Submit] → opens agreement modal
  Model B: [Proceed to Payment] → opens AfrIPay payment modal

Payment modal shows:
  Amount due (with VAT breakdown)
  Payment methods: Mobile Money · Visa/Mastercard · Bank Transfer
  "Payment is non-refundable"
```

### Step 9 — Confirmation Screen
```
Full-width success state:
  ✅ Large animated checkmark (CSS, primary green)
  "Your listing has been submitted!"
  "Status: Pending Admin Approval"
  
  What happens next:
  1. Admin reviews your ID and ownership proof
  2. You'll receive SMS + email when approved
  3. Your listing goes live after approval

  [Go to My Listings] [Browse Platform]
```

---

## 🔐 PAGE 3: BUYER TOKEN UNLOCK FLOW

### Listing Detail Page — Pre-Unlock State
```
Layout: 60% left (images + details) / 40% right (contact sidebar)

Left:
  - Image gallery (main + thumbnails)
  - Title (DM Serif Display, 28px)
  - Category · Subcategory · Item Type breadcrumb
  - Price (accent, 24px bold)
  - Location: "Approximate area only — Kigali, Gasabo" (map pin icon, muted)
  - Full description
  - Features list
  - Availability chart / chat widget

Right sidebar — LOCKED STATE:
  ┌─────────────────────────────────────┐
  │  🔒  Contact Info Locked            │
  │                                     │
  │  Owner: ••••••••••                  │
  │  Phone: +250 ••• ••• •••           │
  │  Location: ••••••••••••            │
  │                                     │
  │  Unlock with Token Fee              │
  │  ┌─────────────────────┐           │
  │  │  10,000 Rwf          │           │
  │  │  Non-refundable      │           │
  │  └─────────────────────┘           │
  │                                     │
  │  ✅ Owner name & phone              │
  │  ✅ Exact address + map pin         │
  │  ✅ Keys manager contact            │
  │  ❌ ID / Documents (never shown)    │
  │                                     │
  │  [Unlock Contact Now]  ← accent btn │
  └─────────────────────────────────────┘

Pre-unlock chat:
  Chat box visible but with header:
  "💬 Ask about availability (contact info blocked until token paid)"
  Input enabled, but system auto-blocks sensitive info
```

### Token Payment Modal
```
Modal overlay (backdrop: rgba dark)
  Title: "Unlock Owner Contact"
  Listing: [thumbnail + title]
  Amount: 10,000 Rwf (VAT inclusive)
  
  Payment Method (tab):
    📱 Mobile Money | 💳 Card | 🏦 Bank Transfer

  Mobile Money:
    Phone number input
    [Send Payment Request]
    Loading: "Waiting for confirmation..."
    Success: auto-close modal + unlock

  Card:
    Standard card fields (AfrIPay styled)

  Disclaimer: "Non-refundable. Tied to your account. Not shareable."
  OTP step if required: "Enter OTP sent to your phone"
```

### Listing Detail Page — Post-Unlock State
```
Right sidebar — UNLOCKED STATE:
  ┌─────────────────────────────────────┐
  │  🔓  Access Unlocked                │ ← green badge
  │                                     │
  │  Owner                              │
  │  Jean Pierre Hakizimana             │
  │  📞 +250 788 123 456               │
  │  [Copy] [Call]                      │
  │                                     │
  │  Keys Manager                       │
  │  Marie Uwimana                      │
  │  📞 +250 722 987 654               │
  │                                     │
  │  Exact Address                      │
  │  UPI: 1/01/02/03/04/0001           │
  │  KG 12 Ave, House 47, Kimihurura   │
  │  [View on Google Maps]              │
  │                                     │
  │  ⚠ Watermarked: Your name overlaid │
  └─────────────────────────────────────┘

Watermark notice: subtle amber strip at bottom of contact block
  "This information is watermarked to your account: [Username]"

Post-unlock chat: full contact now shareable in chat
```

---

## 📊 PAGE 4A: OWNER DASHBOARD

### Layout
```
Left sidebar (240px, fixed):
  Logo
  Nav items:
    - My Listings
    - Add New Listing
    - Token Unlocks
    - Commissions (Model A badge)
    - Messages
    - Penalties
    - Account Settings
  
  Bottom: User avatar + name + role badge "Owner"

Main content area (remaining width):
  Top bar: Page title + action button (context-sensitive)
```

### My Listings Tab
```
Stats row (4 cards):
  [Active Listings: X] [Pending Approval: X] [Token Unlocks Today: X] [Commission Due: X Rwf]

Listings table / card grid (toggle view):
  Columns: Thumbnail | Title | Model | Status | Expiry | Token Unlocks | Actions

  Status badges:
    🟢 Active   🟡 Pending   🔴 Expired   🔵 Under Negotiation   ⬛ Sold/Rented

  Actions per listing:
    [Edit] [Extend] [Update Status] [View Unlocks]

  "Update Status" opens modal:
    Radio: Rented / Sold / Not Concluded
    If Rented or Sold:
      → Final price input
      → Deal date picker
      → [Submit & Generate Commission Invoice]
```

### Commission Tab (Model A)
```
Commission ledger table:
  Listing | Deal Type | Final Price | Commission Due | Status | Due Date | Action

  Status: Pending / Paid / Overdue (red highlight if overdue)
  [Pay Commission] button → AfrIPay modal
  Overdue: amber warning banner at top of page
  Blocked listings notice if commission unpaid > X days
```

### Token Unlocks Tab
```
Table: Listing | Buyer (masked: "Buyer #1042") | Date/Time | Fields Unlocked

Note: "Buyer identities are protected. Contact details available to admin only."
Filter by: Listing · Date range
Export: CSV download
```

### Penalties Tab
```
If none: Empty state with green "No penalties. Keep it up! ✅"

If any:
  Card per penalty:
    Offense type | Amount | Date | Status (Pending/Paid/Disputed)
    [Pay Penalty] | [Dispute] (opens form)
```

---

## 📊 PAGE 4B: ADMIN DASHBOARD

### Layout
```
Left sidebar (260px):
  Logo + "Admin Panel" label
  Nav:
    - Overview
    - Listings (Approval Queue)
    - Users
    - Token Unlocks
    - Commissions
    - Penalties
    - Seeker Requests
    - Token Fee Config
    - Reports & Analytics
    - Settings
```

### Overview Tab
```
KPI cards row 1:
  Total Active Listings | Pending Approval | Total Users | Revenue This Month

KPI cards row 2:
  Token Unlocks Today | Commissions Due | Penalties Outstanding | Flagged Activity

Charts:
  - Revenue by Model (A vs B) — bar chart, last 6 months
  - Token unlocks trend — line chart, last 30 days
  - Listings by category — donut chart
```

### Approval Queue
```
Table: Listing | Owner | Category | Model | Submitted | Documents | Action

Actions:
  [View Details] → slide-in panel with full listing + uploaded documents
  [Approve] → status: pending → active + notify owner
  [Reject] → require reason input → notify owner
  [Request More Info] → opens message thread with owner
```

### Token Fee Config
```
Per-category table:
  Category | Buyer Token Fee | Tenant Token Fee | Seeker View Token | Last Updated | Edit

Edit row: inline editing with save/cancel
Admin note: "All fees are VAT inclusive. Changes apply to new unlocks only."
```

### Reports Tab
```
Filter controls: Date range · Category · Model · User type

Available reports:
  - Revenue Report (by model/category/period)
  - Commission Report (Model A)
  - Token Unlock Analytics
  - Penalty Summary
  - Listing Statistics

[Export CSV] [Export PDF] buttons per report
```

---

## 🧩 SHARED UI COMPONENTS

### Listing Card (reused across pages)
```jsx
<ListingCard>
  <ImageBadge>          // category + model A/B badges overlaid on image
  <CardImage />
  <CardBody>
    <Title />           // DM Serif Display
    <Location />        // icon + approximate area
    <Price />           // accent color, bold
    <TokenSection>      // locked or unlocked state
      <LockIcon />
      <TokenFee />      // "Unlock for 10,000 Rwf"
      <UnlockButton />
    </TokenSection>
  </CardBody>
</ListingCard>
```

### Lock/Unlock Visual System
```
LOCKED:
  - Blur filter (filter: blur(4px)) on sensitive fields
  - Amber lock icon (🔒) 
  - Background: --color-locked-bg
  - Border: 1px dashed #F0D080

UNLOCKED:
  - Fields shown clearly
  - Green check icon (🔓)
  - Background: --color-unlocked-bg
  - "Access Unlocked" badge
  - Watermark strip at bottom
```

### Notification Toast System
```
Position: top-right, stack up to 4
Types:
  ✅ Success — green left border
  ⚠️ Warning — amber left border
  ❌ Error — red left border
  ℹ️ Info — blue left border

Auto-dismiss: 5 seconds
Manual dismiss: × button
```

### Chat Widget (Pre/Post Token)
```
Pre-token header:
  "💬 Availability Chat — Contact info blocked"
  Amber border around input

Post-token header:
  "💬 Direct Chat — Contact info unlocked"
  Green border around input

Blocked message handling:
  Message replaced with: "⚠ Sensitive info detected and blocked. Pay token fee to share contacts."
  Original message NOT shown to recipient
```

---

## ⚙️ TECHNICAL IMPLEMENTATION NOTES

### State Management (React)
```javascript
// Token unlock state — drives all conditional rendering
const tokenState = {
  isPaid: boolean,
  unlockedAt: ISO8601 timestamp | null,
  listingId: string,
  userId: string,
  fieldsUnlocked: ['ownerName', 'ownerPhone', 'address', 'keysManager']
}

// Listing creation wizard state
const listingWizardState = {
  currentStep: number (1–10),
  completedSteps: number[],
  isModelAEligible: boolean,  // computed from category + units + price
  selectedModel: 'A' | 'B',
  formData: { ...perStepData }
}
```

### Conditional Rendering Rules
```javascript
// Show/hide contact fields based on token status
const showContactField = (fieldName, tokenStatus) => {
  const alwaysHidden = ['nationalId', 'ownershipDocs', 'personalFiles'];
  if (alwaysHidden.includes(fieldName)) return false;
  return tokenStatus.isPaid;
}

// Model A/B eligibility
const computeModelEligibility = (category, units, price) => {
  if (units > 1) return 'B';
  const thresholds = { realEstate_rent: 1500000, realEstate_sale: 50000000, ... };
  return price >= thresholds[category] ? 'eligible_for_A' : 'B';
}
```

### Form Validation Rules
```
Step 3 Price:
  - Must be > 0
  - Must be numeric (Rwf, no decimals)
  - Triggers eligibility re-computation on blur

Step 6 Images:
  - Max 10 files
  - Max 5MB per file
  - Accepted: .jpg, .jpeg, .png, .webp
  - At least 1 image required

Step 6 Ownership Proof:
  - Required for submission
  - Accepted: .pdf, .jpg, .png
  - Max 10MB
  - Shown only to admins — never to buyers
```

### API Endpoint Patterns
```
POST   /api/listings              → create listing
GET    /api/listings/:id          → get listing (respects token status)
PATCH  /api/listings/:id/status   → update deal status (owner only)
POST   /api/token-unlock          → initiate token fee payment
GET    /api/token-unlock/:listingId → check user's unlock status
POST   /api/commissions/:id/pay   → pay commission invoice
GET    /api/admin/approvals       → listing approval queue (admin only)
PATCH  /api/admin/listings/:id    → approve/reject listing (admin only)
GET    /api/admin/token-config    → get token fee config per category
PUT    /api/admin/token-config    → update token fee config (admin only)
```

---

## 🚫 DESIGN DON'TS

- ❌ Never show blur removal before token payment is confirmed by backend (not just frontend state)
- ❌ Never display National ID, ownership docs, or personal files to any buyer/tenant role
- ❌ Never use purple gradients, neon, or generic SaaS color schemes
- ❌ Never use Arial, Roboto, or Inter as primary fonts
- ❌ Never show commission amounts as editable by the owner
- ❌ Never allow delete on audit log, token unlock, or penalty log tables in admin UI
- ❌ Never suggest Stripe, PayPal, or non-AfrIPay gateways in payment UI
- ❌ Never pre-fill token fee amount from frontend — always fetch from backend config
- ❌ Never label Model A listings without the digital agreement step completed

---

## ✅ DESIGN DO'S

- ✅ Always display "18% VAT inclusive" near any price or fee
- ✅ Always show "Non-refundable" near token fee payment triggers
- ✅ Always watermark unlocked contact info with buyer's account name/ID
- ✅ Always show Model badge (A/B) on listing cards and owner dashboard rows
- ✅ Always disable "Continue" in wizard until step validation passes
- ✅ Always show listing expiry countdown in owner dashboard
- ✅ Always format currency as: `1,500,000 Rwf` (comma thousands separator, no decimals)
- ✅ Always show penalty status banner in owner dashboard if unpaid penalties exist
- ✅ Always use role-aware navigation (owners don't see admin routes, buyers don't see owner tools)
- ✅ Always show chat input as disabled with explanation if user is not logged in

---

*This UI master prompt is the authoritative frontend design and implementation specification for getownerinfo.com. All generated components, pages, and flows must conform to these design tokens, interaction patterns, business rules, and role-based rendering logic.*