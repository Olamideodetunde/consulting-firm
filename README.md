# THEWHY CONSULTING (why.ng) - Fullstack Platform Rebuild

A bespoke, fullstack management consulting and advisory platform for **THEWHY Consulting**, an affiliate of **Wale Kehinde & Co. (Chartered Accountants)**, built with modern architecture and carrying similar features and design excellence to **gloriaondah.com**.

---

## 🚀 Key Features (Mirrored from gloriaondah.com & Enhanced)

1. **Brand Identity & Slogan**:
   - Distinctive visual identity (Brand Orange `#F36F21`, Dark Navy `#0F172A`, Gold `#FFC000`, Blue `#2563EB`).
   - Strategic Metaphor: *The Chessboard Approach* ("Moving the heavy pieces on the market to check-mate: client's victory").
   - Slogan: *"WE CAN SAVE YOUR BUSINESS!"*
   - Official Address: 1a Hughes Avenue Alagomeji, Yaba, Lagos, Nigeria.
   - Hotlines: `+234-8034-99-23-18` | `info@thewhy.ng`.

2. **Multi-Step Interactive Consultation Booking Wizard**:
   - **Step 1**: Domain & Service Selection (Accounting & Tax, Corporate Finance, Strategy, HR, TFY).
   - **Step 2**: Meeting Format (Virtual via Google Meet, Direct Phone Call, In-Person at Lagos HQ) + Date & Time Slot.
   - **Step 3**: Client details, company name, employee scale, and business challenge.
   - **Confirmation**: Auto-generated Booking Reference Code (e.g. `WHY-2026-XXXX`), downloadable Calendar Invite (`.ics`), and one-click WhatsApp confirmation link.

3. **Interactive Fee & Retainership Calculator (Transparent Pricing)**:
   - Select Enterprise Scale (Micro SME, Small Business, Mid-Market, Corporate).
   - Select Service Focus (Accounting, Corporate Finance, Strategy & AI, HR & Training, TFY Suite).
   - Select Billing Term (Monthly Retainer, Quarterly 5% Rebate, Milestone Project).
   - Choose Compliance Add-ons (PENCOM/NSITF, ITF, BPP, Cloud ERP, Bank Recovery Audit, CMD Training).
   - Instant calculation of estimated fees in Naira (₦), deliverables, turnaround, and lead partner.
   - Direct button to lock in the package and pre-populate the booking modal!

4. **4 Primary Service Pillars & 12 Core Competencies Directory**:
   - Interactive tabbed switcher for the 4 pillars.
   - The 12 Core Competencies with interactive modal deep-dive inspection (deliverables, features, process steps).

5. **Tailored-For-You (TFY) SME Turnaround Diagnostic**:
   - Dedicated advisory model engineered specifically for Nigerian SMEs navigating currency, tax, and supply-chain pressures.

6. **Execution Blueprint (Collaborate, Iterate, Evaluate)**:
   - Practical 3-pillar execution methodology.

7. **Filterable Case Studies & Proven Results**:
   - Real-world track record (₦82.4M bank charges recovered, ₦450M fintech Series A packaging, ₦3.2B asset verification turnaround, CMD training).

8. **Executive Leadership & Accreditation Badges**:
   - Profiles and credentials for Mr. Kehinde Adewale (FCA, MBA), Mr. Seun Olaniyi (ACA), and Mrs. Dolapo Wale-Kehinde (PHRi).
   - Wale Kehinde & Co., ICAN, CITN, CMD, CAC credentials.

9. **Interactive Searchable FAQ Accordion**:
   - Live query filter answering questions on retainers, PENCOM, FIRS tax clearance, and bank excess audits.

10. **Direct Inquiry Hub & WhatsApp Integration**:
    - Direct contact form submitting to the backend with toast notifications.
    - Direct WhatsApp floating button.

11. **Executive Management & Admin Dashboard (`/admin` or `admin.html`)**:
    - Real-time KPI summary (Total Bookings, Pending, Confirmed, Completed, Total Inquiries).
    - Pipeline table with live search and status filters (All, Pending, Confirmed, Completed, Cancelled).
    - Status management actions (Confirm, Complete, Add consultant notes, WhatsApp client link, Delete).
    - Client Inquiries stream with status updates (Mark Responded).
    - One-click CSV export (`/api/stats/export/bookings.csv`).
    - Manual booking creation modal for walk-in/offline clients.

12. **Downloadable Company Profile**:
    - The official 30-page PDF profile is served directly from `/assets/docs/THEWHY-Consulting-Company-Profile.pdf`.

---

## 🛠️ Tech Stack & Backend Architecture

- **Backend**: Node.js & Express RESTful API server.
- **Data Persistence**: JSON-backed database (`server/data/database.json`) with auto-seeding.
- **Frontend**: Responsive Single-Page Application with Tailwind CSS, Plus Jakarta Sans, Manrope, FontAwesome 6, and Vanilla JS.
- **Calendar Generator**: RFC 5545 compliant `.ics` iCalendar generator.
- **Reporting**: Automated CSV export pipeline.

---

## 🚦 How to Run the Application

```bash
# Install dependencies (already installed)
npm install

# Start production server
npm start

# Or start in development watch mode
npm run dev
```

- **Main Website**: [http://localhost:3000](http://localhost:3000)
- **Executive Admin Portal**: [http://localhost:3000/admin](http://localhost:3000/admin)
- **Automated Test Suite**:
  ```bash
  node test_endpoints.js
  ```

---

## 📡 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health status |
| `GET` | `/api/bookings` | Retrieve all consultation bookings (supports `?status=` and `?search=`) |
| `POST` | `/api/bookings` | Create new consultation session |
| `PATCH` | `/api/bookings/:id` | Update booking status or internal notes |
| `DELETE` | `/api/bookings/:id` | Delete booking record |
| `GET` | `/api/bookings/:id/calendar.ics` | Download Google/Outlook calendar invite |
| `GET` | `/api/inquiries` | Retrieve client contact inquiries |
| `POST` | `/api/inquiries` | Submit client inquiry message |
| `PATCH` | `/api/inquiries/:id` | Update inquiry status (NEW, RESPONDED) |
| `POST` | `/api/calculator/estimate` | Calculate customized retainership quote |
| `GET` | `/api/stats` | Dashboard KPI metrics |
| `GET` | `/api/stats/export/bookings.csv` | Export all bookings to CSV spreadsheet |
