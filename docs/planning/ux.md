# GETOWNERINFO — MASTER UX PROMPT
**Platform:** getownerinfo.com — Rwanda Hybrid Marketplace  
**Type:** Full UX Specification · User Journeys · Personas · Flows · Microcopy · UX Writing  
**Roles Covered:** Buyer/Tenant · Owner/Seller · Admin · Platform Listing Manager  
**Version:** 1.0

---

## PART 1 — UX PHILOSOPHY & PRINCIPLES

### Core UX Mission
getownerinfo must make a **trust transaction feel safe and simple.** Every user is either:
- Handing over private contact details (owner), or
- Paying money to access those details (buyer), or
- Verifying that both sides are who they claim to be (admin)

This means every UX decision must answer: **"Does this make the user feel safer and more confident?"**

### 5 UX Principles

| # | Principle | What It Means in Practice |
|---|---|---|
| 1 | **Transparent by Default** | Always tell users why something is locked, blurred, or blocked. Never hide friction without explanation. |
| 2 | **Progressive Disclosure** | Show only what users need at each step. Don't overwhelm listing creators with all 10 steps at once. |
| 3 | **Trust at Every Touchpoint** | Verification badges, owner proof indicators, and "Admin-verified" labels must be visible wherever they reduce anxiety. |
| 4 | **Graceful Enforcement** | When blocking a user (pre-token, pre-payment, wrong role), explain clearly and offer the path forward — never dead ends. |
| 5 | **Mobile-First, Rwanda-Context** | Assume users are on Android mid-range phones, on mobile data. Optimize for speed, large tap targets, and SMS-based confirmation flows. |

---

## PART 2 — USER PERSONAS

### Persona 1 — The Serious Buyer (Buyer/Tenant)
**Name:** Eric Mugisha  
**Age:** 31 | **Location:** Kigali, Gasabo  
**Device:** Samsung Galaxy A14, mobile data  
**Goal:** Find and rent a 2-bedroom apartment ≥ 1.5M Rwf/month near his workplace  

**Motivations:**
- Wants direct access to the actual owner — not a broker taking commission
- Needs to verify the place is real before investing time in a visit
- Willing to pay a small fee if it guarantees a real, direct contact

**Pain Points:**
- Wasted visits to fake or already-rented listings on other platforms
- Middlemen who inflate prices and waste time
- Uncertainty about whether contact info is real

**UX Expectations:**
- Clear lock/unlock states — knows exactly what he's paying for
- Fast mobile payment via Mobile Money (MTN/Airtel)
- No surprises after paying token — gets exactly what was promised

**Key UX Moments:**
1. Lands on listing → sees locked contact → understands why
2. Decides to pay token → confident in what he unlocks
3. Pays via Mobile Money → instant confirmation
4. Calls owner directly → visit arranged

---

### Persona 2 — The Verified Owner (Owner/Seller)
**Name:** Claudine Uwase  
**Age:** 45 | **Location:** Kigali, Nyarugenge  
**Device:** iPhone 13 (tech-comfortable) OR Nokia feature phone (assisted onboarding)  
**Goal:** Rent out her apartment at 2M Rwf/month — wants serious tenants only  

**Motivations:**
- Tired of time-wasters calling without intent to rent
- Wants privacy — doesn't want her number shared publicly
- Prefers a platform that filters to serious leads

**Pain Points:**
- Creating listings is usually complex and takes too long
- Doesn't trust platforms with her ID documents
- Worried about commission being charged unfairly

**UX Expectations:**
- Step-by-step listing creation — clear progress
- Transparent Model A/B choice with real explanation
- Control over her listing: edit, extend, mark as rented
- Commission calculation shown automatically — no surprises

**Key UX Moments:**
1. Starts listing → wizard guides her step by step
2. Sees she qualifies for Model A → understands the trade-off
3. Uploads ownership proof → reassured it's admin-only
4. Receives token unlock notification → knows a serious buyer is interested
5. Deal done → reports outcome → commission invoice generated automatically

---

### Persona 3 — The Admin Verifier
**Name:** Patrick Nkurunziza  
**Age:** 27 | **Location:** Kigali HQ  
**Device:** Desktop / Laptop  
**Goal:** Review, approve, and monitor all listings and user activity efficiently  

**Motivations:**
- Wants to keep the platform clean of fraud and fake listings
- Needs to resolve disputes quickly with clear audit data
- Wants analytics to report to management

**Pain Points:**
- Manual verification is slow without a clear queue system
- Difficult to track which commission payments are overdue
- Hard to spot abuse patterns without good tooling

**UX Expectations:**
- Clean approval queue with document preview inline
- Filter/search across all listings, users, payments
- One-click approve/reject with reason logging
- Penalty enforcement with audit trail visible

---

### Persona 4 — The Seeker (Buyer posting a request)
**Name:** Amina Benali  
**Age:** 28 | **Location:** Kigali, Kicukiro  
**Device:** Android, mobile data  
**Goal:** Find a commercial space — nothing currently listed matches her needs  

**Motivations:**
- Wants to post her requirements and have owners come to her
- Budget is clear, location preference is clear
- Doesn't want to browse endlessly

**Pain Points:**
- Relevant listings don't exist yet or are buried
- No way to signal her intent to owners

**UX Expectations:**
- Simple request form
- Anonymized visibility — doesn't want cold calls from everyone
- Clear control over expiry and status

---

## PART 3 — USER JOURNEYS

---

### JOURNEY 1 — BUYER: From Discovery to Direct Owner Contact

**Entry Points:** Search results · Featured listings · Category browse · Seeker match notification

```
STAGE 1: DISCOVERY
─────────────────
Action:   Lands on listing from search or home page
Sees:     Listing card — image, title, price, approximate location, locked contact
Feels:    Curious, cautious — "Is this real? Is the price real?"
UX Goal:  Establish credibility immediately

  ↳ Trust signals to show:
      ✅ "Admin Verified" badge on listing card
      ✅ Owner type label (Owner / Manager / Third Party)
      ✅ Listing Model badge (Model A Exclusive / Model B)
      ✅ Number of token unlocks (social proof): "47 people unlocked this"
      ✅ Date listed + last updated

STAGE 2: LISTING DETAIL
────────────────────────
Action:   Opens full listing page
Sees:     Image gallery, full description, features, approximate location on map
          Right sidebar: LOCKED contact block
Feels:    More informed, building intent — but still uncertain about the contact
UX Goal:  Convert intent to token payment

  ↳ Locked sidebar must show:
      🔒 Icon + "Contact Info Locked"
      Blurred placeholder fields (not blank — blurred text creates anticipation)
      Exact token fee: "Unlock for 10,000 Rwf"
      Checklist of what unlocks ✅ and what never shows ❌
      Non-refundable note (small, not alarming)
      [Unlock Contact Now] button — amber/accent

  ↳ Pre-unlock chat:
      Visible and enabled — "Ask about availability"
      Amber notice bar: "Phone numbers and addresses are blocked until token paid"

STAGE 3: TOKEN PAYMENT DECISION
────────────────────────────────
Action:   Clicks [Unlock Contact Now]
Sees:     Modal — listing thumbnail, amount, payment methods
Feels:    Slight hesitation — "Is it worth it?" — needs reassurance
UX Goal:  Remove hesitation, confirm value, complete payment

  ↳ Modal must:
      Show listing thumbnail + title (reminds them what they're unlocking)
      Show exact amount with VAT note
      List what they get (compact ✅ checklist)
      Show "Non-refundable — tied to your account"
      Default to Mobile Money (most common in Rwanda)
      Show OTP step if required
      Loading state: "Waiting for payment confirmation..."

STAGE 4: UNLOCK CONFIRMATION
──────────────────────────────
Action:   Payment confirmed
Sees:     Animated unlock transition — blur fades, contact fields reveal
Feels:    Satisfied — "I got what I paid for"
UX Goal:  Deliver value immediately, prevent regret

  ↳ Reveal animation:
      Lock icon rotates → unlocks → turns green
      Blur filter dissolves (CSS transition, 0.6s ease)
      "Access Unlocked" green badge appears
      Watermark strip: "Watermarked to: [Username]"
      [Copy] and [Call] buttons appear next to phone numbers
      [View on Google Maps] for address

STAGE 5: POST-UNLOCK ENGAGEMENT
─────────────────────────────────
Action:   Uses contact info — calls owner, arranges visit
Sees:     Full chat now enabled, unlock history in dashboard
Feels:    In control, connected
UX Goal:  Support successful deal, encourage platform return

  ↳ Post-unlock:
      Chat full contact sharing enabled
      "You unlocked this on [date]" shown in buyer dashboard
      Option to mark listing as "Visited" (feedback for platform)
```

---

### JOURNEY 2 — OWNER: From Registration to Active Listing

**Entry Points:** "Post Your Listing" CTA on homepage · Direct URL · Referral

```
STAGE 1: ONBOARDING & REGISTRATION
────────────────────────────────────
Action:   Clicks "Post Your Listing"
Sees:     Registration/login page
Feels:    Motivated but cautious — "How complicated is this?"
UX Goal:  Reduce signup friction, set expectations

  ↳ Registration:
      Name, phone, email, password
      Role selection: Owner / Manager / Third Party
      OTP verification via SMS
      After signup: brief 3-slide onboarding tour
        Slide 1: "Model A vs Model B — choose what works for you"
        Slide 2: "Your contact info stays private until a buyer pays"
        Slide 3: "Admin verifies everything — your listing goes live in 24hrs"

STAGE 2: LISTING WIZARD — STEPS 1–3
─────────────────────────────────────
Action:   Enters listing wizard
Sees:     Step 1 — Category selection as large visual cards
Feels:    Guided — "This is easier than I thought"
UX Goal:  Keep momentum, prevent drop-off at first technical step

  ↳ Step 1 UX:
      Category cards with icons — visual, not a dropdown
      Subcategory appears after category selected (slide-in, not page reload)
      Progress bar visible from step 1
      Estimated time: "Takes about 8 minutes"

  ↳ Step 2 UX:
      Owner type as styled radio cards — not plain radio buttons
      If Manager/Third Party: additional fields slide in with animation
      Tooltip on "Third Party": "e.g. real estate agent, family representative"

  ↳ Step 3 UX:
      Quantity input — if >1, banner slides in: 
        "Multiple units detected — Model B will apply to your listing"
      Location input: tab switcher (UPI / Street / Google Maps / WhatsApp)
      Price input — on blur, eligibility hint appears:
        Green: "✅ Qualifies for Model A (Exclusive Commission)"
        Amber: "ℹ️ Below threshold — Model B will apply"

STAGE 3: MODEL SELECTION — STEP 4 (Critical Decision Point)
─────────────────────────────────────────────────────────────
Action:   Reaches Model A/B selection
Sees:     Two comparison cards (if eligible) or single Model B card (if not)
Feels:    Uncertain — needs to understand the difference before choosing
UX Goal:  Enable confident, informed model choice — no confusion, no regret

  ↳ If eligible for both:
      Side-by-side comparison cards
      Model A card highlights: "No upfront cost · Commission only after deal"
      Model B card highlights: "Pay now · List instantly · Full control"
      "Which is right for me?" expandable accordion below cards
        → explains commission risk vs. upfront cost trade-off
      Duration selector appears after model chosen
      Discount shown inline per duration selection

  ↳ If NOT eligible:
      Single Model B card shown
      Inline explanation (not a warning — informative tone):
        "Your listing is set up for Model B based on [reason: price / multiple units]"
      No dead end — just clear guidance

STAGE 4: LISTING DETAILS — STEPS 5–7
───────────────────────────────────────
Action:   Fills in listing title, description, images, ownership proof
Feels:    In the flow — momentum maintained
UX Goal:  Make content entry fast, reduce errors, prevent abandonment

  ↳ Title input:
      Placeholder: "e.g. Spacious 3-bedroom apartment in Kimihurura"
      Live char counter: "52 / 80"
      Suggestion tooltip: "Good titles include: size, type, location"

  ↳ Description:
      Textarea with formatting hints (bullet points encouraged)
      "Write what you'd tell a tenant on the phone"
      Live counter: 340 / 1000

  ↳ Images:
      Drag-and-drop zone with camera icon
      Mobile: tap to open camera roll
      After upload: thumbnail grid with reorder (drag) + remove (×)
      First image = main photo — labeled "Cover Photo"
      Upload progress bar per image

  ↳ Ownership Proof:
      Separate upload section with lock icon
      Label: "For Admin Verification Only — Never Shown to Buyers"
      File type hint: "PDF, JPG, or PNG · Max 10MB"
      After upload: "✅ Document received — Admin will verify before approval"

  ↳ Assisted Onboarding (optional):
      Link below ownership proof: "Need help uploading? Request admin assistance"
      Opens request form → admin contacts owner to complete onboarding

STAGE 5: REVIEW & SUBMISSION — STEPS 8–10
───────────────────────────────────────────
Action:   Reviews full listing summary, signs agreement or pays
Feels:    Anticipation — close to done
UX Goal:  Catch errors before submission, build confidence in the process

  ↳ Review screen:
      Accordion sections — each collapsible, each with [Edit] link
      "Looks good? Here's what happens next" section:
        → Admin reviews in 24 hours
        → You'll get SMS + email when approved
        → Buyers can browse but contact stays locked until they pay

  ↳ Model A submission:
      [Sign Digital Agreement] → modal with scrollable agreement text
      Checkbox: "I understand commission is due after deal completion"
      [Sign & Submit] button

  ↳ Model B submission:
      [Proceed to Payment] → AfrIPay modal
      Payment success → listing activated instantly (no wait for approval? — check business rule)
      Note: Listing still pending admin approval before going fully public

  ↳ Confirmation:
      Animated ✅ success state
      Listing reference number shown
      "Status: Pending Admin Approval"
      Expected approval time: "Usually within 24 hours"
      [View My Listing] [Post Another Listing]

STAGE 6: POST-APPROVAL — ONGOING OWNER TASKS
──────────────────────────────────────────────
Action:   Listing goes live — receives token unlock notifications
Feels:    Engaged — wants to see activity on their listing
UX Goal:  Keep owner informed, enforce status update obligation

  ↳ Token unlock notification:
      Push / SMS / Email: "A buyer just unlocked your listing contact info"
      Listing marked: "Under Negotiation"

  ↳ Status update obligation (Model A):
      7 days after unlock: reminder appears in dashboard
        "Have you concluded a deal? Update your listing status to stay compliant."
      [Rented] [Sold] [Not Concluded] — one-click from notification

  ↳ Commission invoice (Model A):
      After marking Rented/Sold:
        Auto-generated invoice shown immediately
        Amount, due date, [Pay Commission] button
        Overdue: amber warning → then red → listing restrictions apply
```

---

### JOURNEY 3 — ADMIN: Verification & Platform Management

```
STAGE 1: LISTING APPROVAL QUEUE
─────────────────────────────────
Action:   Logs in to admin dashboard
Sees:     Approval queue with pending listings sorted by submission time
Feels:    Task-oriented — needs to process queue efficiently
UX Goal:  Enable fast, confident review decisions

  ↳ Queue table columns:
      Thumbnail | Owner name | Category | Model | Submitted | Docs | Actions

  ↳ [View Details] slide-in panel (no page navigation):
      Listing preview (all fields)
      Ownership proof viewer (inline PDF/image)
      Owner ID document (inline)
      Owner history: previous listings, penalty record, any flags
      [Approve] [Reject] [Request More Info] buttons

  ↳ Approve:
      One-click → status: active → owner notified via SMS + email
      Confirmation toast: "Listing #1042 approved and live"

  ↳ Reject:
      Required: select reason from dropdown + optional custom note
      Owner notified with reason
      Listing stays in queue for 7 days (owner can resubmit)

  ↳ Request More Info:
      Opens message thread directly with owner
      Listing stays in "Pending - Info Requested" status

STAGE 2: COMMISSION MONITORING
────────────────────────────────
Action:   Checks commissions dashboard
Sees:     Table of Model A deals — due, paid, overdue
Feels:    Oversight responsibility
UX Goal:  Spot overdue commissions fast, enforce with minimal manual effort

  ↳ Overdue commissions:
      Red row highlight after due date passed
      [Send Reminder] → triggers SMS + email to owner
      [Apply Restriction] → blocks owner from new listings
      [Dispute] → opens internal notes for investigation

STAGE 3: PENALTY MANAGEMENT
──────────────────────────────
Action:   Reviews flagged activity
Sees:     Penalty log with auto-triggered penalties + manual review queue
UX Goal:  Confirm, adjust, or override penalties with full audit trail

  ↳ Penalty card:
      Offense type | Amount | Auto-calculated | Owner name | Date
      [Confirm Penalty] [Adjust Amount] [Dismiss with Note]
      All actions logged immutably

STAGE 4: TOKEN FEE CONFIGURATION
──────────────────────────────────
Action:   Updates token fee amounts per category
Sees:     Clean table — category | buyer fee | tenant fee | seeker view fee
UX Goal:  Fast, safe updates with clear confirmation

  ↳ Inline editing:
      Click cell → edit inline → [Save] [Cancel]
      Confirmation modal: "This will apply to all new unlocks in [Category]. Confirm?"
      Note: "Changes do not affect already-paid tokens"
```

---

## PART 4 — FULL UX FLOW DIAGRAMS (Text Format)

### Flow A — Buyer Token Unlock
```
[Browse Listings]
      ↓
[Open Listing Detail Page]
      ↓
[View Locked Contact Sidebar]
      ↓
[Click "Unlock Contact Now"]
      ↓
[Token Payment Modal opens]
      ↓
  ┌───────────────────────────────────┐
  │ Logged in?                        │
  │   No → [Login/Register prompt]   │
  │   Yes → Show payment methods     │
  └───────────────────────────────────┘
      ↓
[Select Payment Method]
  Mobile Money → Enter phone → [Send Request] → OTP → Confirm
  Card → Card fields → [Pay] → 3DS if required → Confirm
      ↓
[Payment Processing — Loading State]
      ↓
  ┌───────────────────────────────────┐
  │ Payment Success?                  │
  │   Yes → Unlock animation →       │
  │          Contact revealed        │
  │   No  → Error toast + retry      │
  └───────────────────────────────────┘
      ↓
[Contact fields revealed with watermark]
      ↓
[Chat unlocked — full contact shareable]
      ↓
[Unlock logged: user_id + listing_id + timestamp]
```

---

### Flow B — Owner Listing Creation
```
[Click "Post Your Listing"]
      ↓
[Logged in? → No: Register/Login]
      ↓
[Step 1: Category → Subcategory → Item Type]
      ↓
[Step 2: Owner Type + Representative]
      ↓
[Step 3: Quantity + Location + Price]
      ↓
[Backend: Compute Model A/B Eligibility]
      ↓
  ┌───────────────────────────────────┐
  │ Eligible for Model A?             │
  │   Yes → Show A/B selection cards │
  │   No  → Show Model B only        │
  └───────────────────────────────────┘
      ↓
[Step 4: Model Selection + Duration]
      ↓
[Step 5: Token Fee option (if applicable)]
      ↓
[Step 6: Title + Description + Features + Images + Ownership Proof]
      ↓
[Step 7: Duration & Expiry Confirmation]
      ↓
[Step 8: Review Summary]
      ↓
  ┌───────────────────────────────────┐
  │ Model A?                          │
  │   Yes → Sign Digital Agreement   │
  │   No  → Pay Listing Fee          │
  └───────────────────────────────────┘
      ↓
[Submit → Admin Notified]
      ↓
[Status: Pending Approval]
      ↓
[Admin Reviews → Approves/Rejects]
      ↓
[Owner Notified → Listing Live]
```

---

### Flow C — Deal Reporting & Commission (Model A)
```
[Buyer unlocks contact]
      ↓
[Listing marked: Under Negotiation]
      ↓
[7-day reminder to owner: Update status]
      ↓
[Owner opens dashboard → Update Status]
      ↓
  ┌───────────────────────────────────┐
  │ Status?                           │
  │   Rented → Enter rent + date     │
  │   Sold   → Enter price + date    │
  │   Not Concluded → No commission  │
  └───────────────────────────────────┘
      ↓ (if Rented or Sold)
[System auto-calculates commission]
      ↓
[Commission invoice generated]
      ↓
[Owner sees: Amount + Due Date + [Pay Commission]]
      ↓
[Owner pays → Commission logged → Invoice closed]
      ↓
  ┌───────────────────────────────────┐
  │ Not paid by due date?             │
  │   → Warning notification         │
  │   → Listing restrictions applied │
  │   → Penalty triggered            │
  └───────────────────────────────────┘
```

---

## PART 5 — UX WRITING & MICROCOPY

### Tone of Voice
| Dimension | Description | Example |
|---|---|---|
| **Clear** | Plain language, no jargon | "Pay to see the owner's contact" not "Initiate token-based contact resolution" |
| **Warm** | Human, not robotic | "Great — your listing is live!" not "Listing status updated: ACTIVE" |
| **Direct** | Say what it is | "This fee is non-refundable" not "Please note payment finality policies" |
| **Grounded** | Rwanda-specific where relevant | "Pay via MTN Mobile Money or Airtel Money" |
| **Confident** | Trust without over-promising | "Admin-verified listing" not "We guarantee this listing is 100% real" |

---

### Button Labels
| Context | Label | Never Use |
|---|---|---|
| Token payment CTA | "Unlock Contact Now" | "Submit Payment", "Proceed", "Continue" |
| Start listing | "Post Your Listing" | "Create Listing", "Add Property" |
| Model A selection | "Choose Exclusive (Model A)" | "Select Option A" |
| Model B selection | "Choose Pay-to-List (Model B)" | "Select Option B" |
| Approve listing (admin) | "Approve & Go Live" | "Confirm", "OK" |
| Reject listing (admin) | "Reject with Reason" | "Decline", "Cancel" |
| Pay commission | "Pay Commission Now" | "Submit Payment", "Proceed" |
| Update deal status | "Update Listing Status" | "Edit", "Change Status" |
| Sign agreement (Model A) | "Sign & Submit Listing" | "Agree", "Confirm" |
| Extend listing | "Extend Listing Duration" | "Renew", "Update" |
| Save wizard progress | "Save Draft" | "Save & Exit" |

---

### Empty States
| Screen | Message | Sub-text | CTA |
|---|---|---|---|
| No active listings (owner) | "You haven't posted a listing yet." | "Start reaching serious buyers today." | "Post Your First Listing" |
| No token unlocks (owner) | "No one has unlocked your contact yet." | "Make sure your listing is approved and visible." | "View My Listing" |
| No commission due (owner) | "You're all clear — no commissions outstanding." | — | — |
| No penalties (owner) | "No penalties on your account. Keep it up! ✅" | — | — |
| No results (search) | "No listings match your search." | "Try adjusting your filters or post a Seeker Request." | "Post a Seeker Request" |
| Pending approval (owner) | "Your listing is under review." | "We'll notify you by SMS and email within 24 hours." | — |
| Approval queue empty (admin) | "Queue is clear. ✅" | "All listings are reviewed." | — |

---

### Error Messages
| Trigger | Message | Tone |
|---|---|---|
| Payment failed | "Payment wasn't completed. Please try again or use a different method." | Calm, actionable |
| OTP timeout | "The OTP expired. Request a new one below." | Direct |
| Image too large | "This image is over 5MB. Please compress it and try again." | Clear |
| Wrong file type | "Only JPG, PNG, or PDF files are accepted." | Clear |
| Price below threshold | "This price is below the Model A threshold. Model B will apply." | Informative, not alarming |
| Sensitive info blocked in chat | "Your message contained contact information. This is blocked until token is paid." | Firm, educational |
| Commission overdue | "Your commission payment is overdue. New listings are paused until this is resolved." | Firm, urgent |
| Duplicate listing detected | "A similar listing already exists under your account. Review before continuing." | Warning |
| Penalty unpaid | "You have an unpaid penalty. Please resolve it to continue using the platform." | Firm |
| Session expired | "Your session timed out for security. Please log in again." | Safe-feeling |

---

### Confirmation Messages
| Trigger | Message |
|---|---|
| Listing submitted | "Your listing has been submitted! We'll review it within 24 hours and notify you by SMS." |
| Token unlocked | "Contact info unlocked! You can now call the owner directly." |
| Commission paid | "Commission paid successfully. Your listing is fully active." |
| Penalty paid | "Penalty settled. Your account is back to full access." |
| Listing approved | "Your listing is live! Buyers can now browse and unlock your contact." |
| Deal status updated | "Status updated. Commission invoice has been generated." |
| Listing extended | "Your listing has been extended to [new expiry date]." |
| Agreement signed | "Agreement signed. Your listing is submitted for approval." |

---

### Tooltips & Helper Text

**Token Fee Section:**
> 💡 "The token fee is non-refundable and tied to your account. It gives you direct access to the owner — no middlemen."

**Model A Selection:**
> 💡 "With Model A, you pay nothing upfront. Commission is only due after your deal is completed."

**Model B Duration Discount:**
> 💡 "Longer durations save you more. A 6-month listing costs 40% less than 6 separate monthly listings."

**Ownership Proof Upload:**
> 🔒 "This document is for admin verification only. It will never be shown to buyers or tenants."

**Watermark Notice (post-unlock):**
> ⚠️ "This contact information is watermarked with your username. Please do not share it outside this platform."

**Pre-token Chat:**
> 💬 "You can ask about availability right now. Phone numbers and exact addresses are unlocked after token payment."

**Seeker Request:**
> 💡 "Your identity is kept private. Only users who pay the view token can see your contact details."

---

### Notification Copy

**Owner Notifications:**
| Event | SMS | In-App |
|---|---|---|
| Listing approved | "Your getownerinfo listing is live! Buyers can now find you." | "🎉 Your listing [Title] is now live." |
| Token unlocked | "A serious buyer just unlocked your contact on getownerinfo." | "🔓 Buyer unlocked your listing [Title]." |
| Commission due | "Commission is due for your deal on [Title]. Log in to pay: getownerinfo.com" | "💳 Commission invoice generated: [Amount] Rwf due by [Date]." |
| Expiry in 7 days | "Your listing [Title] expires in 7 days. Renew now: getownerinfo.com" | "⏳ Listing expires in 7 days — extend to keep it live." |
| Penalty applied | "A penalty has been applied to your account. Log in for details: getownerinfo.com" | "⚠️ Penalty applied: [Amount] Rwf — [Reason]." |

**Buyer Notifications:**
| Event | SMS | In-App |
|---|---|---|
| Unlock confirmed | "You've unlocked contact for [Listing Title] on getownerinfo. Log in to view." | "🔓 Contact unlocked for [Title]. Call the owner now." |
| Seeker request fulfilled | "An owner has responded to your seeker request on getownerinfo." | "✅ Your seeker request has a match." |

**Admin Notifications:**
| Event | In-App |
|---|---|
| New listing pending | "📋 New listing pending approval: [Title] — [Owner Name]" |
| Commission overdue | "💳 Commission overdue: [Owner Name] — [Amount] Rwf — [X days overdue]" |
| Flagged abuse | "🚨 Suspicious activity flagged: User [ID] — multiple unlock attempts from new accounts" |

---

## PART 6 — UX ANTI-PATTERNS TO AVOID

| Anti-Pattern | Why It's Wrong | What To Do Instead |
|---|---|---|
| Showing a blank/empty contact field pre-token | Confusing — looks like data is missing | Show blurred placeholder text to signal "data exists but locked" |
| "Are you sure?" confirmation on every action | Creates friction and distrust | Only confirm irreversible/costly actions (token payment, penalty, rejection) |
| Showing commission % before deal is done | Creates anxiety for Model A owners | Show commission only when invoice is generated post-deal |
| Generic error: "Something went wrong" | Unhelpful, erodes trust | Always name the issue and offer a next step |
| Auto-redirecting after payment before confirmation | Can feel like a bug | Always show a clear success state before any redirect |
| Hiding the token fee amount until checkout | Feels manipulative | Show fee prominently on listing card and detail page |
| Blocking chat entirely pre-token | Prevents legitimate availability questions, increases abandonment | Allow chat, but filter sensitive info only |
| Requiring re-upload of documents on listing edit | Frustrates owners | Persist uploaded documents; only re-request if expired or flagged |
| Showing "Model A" without explanation | Confuses owners unfamiliar with the model | Always pair the label with a short benefit line |

---

## PART 7 — ACCESSIBILITY & PERFORMANCE UX

### Accessibility (WCAG 2.1 AA minimum)
- All interactive elements ≥ 44×44px tap target (mobile)
- Color contrast ≥ 4.5:1 for all body text
- Lock/unlock states communicated by icon + color + text (not color alone)
- Form fields always have visible labels (not placeholder-only)
- Error messages linked to specific fields via `aria-describedby`
- Images always have `alt` text
- Modal dialogs trap focus correctly and close on Escape

### Performance UX (Rwanda Mobile Context)
- Skeleton loading states for listing cards and contact blocks (not spinners)
- Images lazy-loaded with blur-up placeholder
- Offline state handled gracefully: "No connection — your draft is saved locally"
- Payment confirmation via SMS as fallback if in-app notification fails
- Form data auto-saved to localStorage every 30 seconds (wizard steps)
- Mobile Money payment flow defaults to USSD fallback if web payment times out

---

## PART 8 — RESPONSIVE BREAKPOINTS & LAYOUT BEHAVIOR

| Breakpoint | Behavior |
|---|---|
| < 480px (mobile S) | Single column. Listing cards full width. Wizard steps full screen. Sidebar becomes bottom sheet. |
| 480–768px (mobile L / tablet P) | 2-column listing grid. Wizard centered, max 480px. |
| 768–1024px (tablet L) | 3-column grid. Split layout on listing detail (60/40). |
| > 1024px (desktop) | Full layout. Max-width 1200px centered. Sidebar fixed 240px. |

### Mobile-Specific UX Patterns
- Token payment: defaults to Mobile Money tab (not card)
- Image upload: opens native camera roll / gallery picker
- Location input: Google Maps tab shows embedded map with "Use My Location" button
- Chat: full-screen on mobile, side panel on desktop
- Admin dashboard: simplified mobile view with priority queue only (full analytics = desktop)

---

*This UX master prompt is the authoritative user experience specification for getownerinfo.com. All design, copy, flow, and interaction decisions must align with these personas, journeys, principles, and microcopy standards.*