# Product Requirements Document (PRD)

## Laboratory Equipment Management System (LEMS)
*A state-driven web application for university lab equipment scheduling, asset tracking, and on-site physical QR verification.*

---

## 1. Project Overview & Context
- **Project Name:** Laboratory Equipment Management System (LEMS v1.0)
- **Target Tech Stack:** Next.js (App Router, React), Tailwind CSS, PostgreSQL / Relational DB, HTML5-QRCode
- **Primary Roles:** `STUDENT`, `MANAGER`
- **Environment:** Antigravity / Project IDX / Modern Web Browser

---

## 2. Problem Statement & Key Objectives

### Problem
Academic labs and shared fabrication spaces rely on manual logbooks, chat groups, or verbal scheduling. This results in:
- Conflicting double-bookings for high-demand machines (3D printers, CNCs, oscilloscopes).
- Ghost bookings where machines sit idle while other students are locked out.
- Unverified access and zero accountability when equipment breaks.

### Objectives
1. **Automated Collision Prevention:** Zero double-bookings via server-side overlap checks.
2. **On-Site QR Verification:** Mandatory physical presence check via in-browser camera scanning before starting a session.
3. **Manager Control Panel:** Fast 1-click approvals and instant equipment state toggles.
4. **Instant Maintenance Flagging:** Real-time fault reporting that takes broken hardware offline immediately.

---

## 3. User Roles & Permission Matrix

| Feature / Route | Student | Lab Manager |
| :--- | :---: | :---: |
| Browse Equipment Catalog (`/equipment`) | Read Only | Full Access |
| Book Slot Modal (`status: PENDING`) | Create | Create |
| View Personal Bookings (`/my-bookings`) | Read Own | Read All |
| QR Code Scanner (`/scan`) | Scan & Check-in | Scan & Test |
| Active Session Timer (`/session/active`) | Active User | Read Only |
| Submit Incident / Fault Report | Create | Create & Resolve |
| Pending Approvals Inbox (`/admin/requests`) | No Access | Approve / Reject |
| Asset Inventory & Status Toggle (`/admin/inventory`) | No Access | Full Control |
| Print QR Stickers Modal | No Access | Generate & Print |

---

## 4. End-to-End System Workflow

```
[1. User Login] ──► [2. Browse Catalog] ──► [3. Select 1-Hr Slot] ──► [4. Submit Request ('PENDING')]
                                                                                  │
                                                                           (Manager Review)
                                                                                  │
[8. Checkout / Fault Report] ◄── [7. Active Session] ◄── [6. Scan On-Site QR] ◄── [5. Request Approved]
```

1. **Authentication:** User logs in with campus email/password; middleware routes `STUDENT` to `/equipment` and `MANAGER` to `/admin`.
2. **Browse & Slot Request:** Student selects an available machine, date, and 1-hour time window. System checks database for conflicts. If free, creates a booking with `status: 'PENDING'`.
3. **Manager Approval:** Lab manager reviews the queue on `/admin/requests` and sets status to `'APPROVED'` or `'REJECTED'`.
4. **On-Site QR Check-In:** Student arrives at the lab station, opens `/scan`, and scans the physical QR code on the machine.
5. **Session Activation:** System verifies matching `equipment_id`, user ID, and active time window. Equipment status updates to `'BUSY'`.
6. **Completion / Teardown:** When the session concludes, status resets to `'AVAILABLE'`. If a fault is logged, status switches to `'MAINTENANCE'`.

---

## 5. Detailed Site Map & Page Specifications

### Public Pages
- **`/` (Landing Page):**
  - Hero banner with real-time lab capacity status.
  - 3-step visual workflow (*Browse -> Get Approved -> Scan QR*).
  - Quick catalog preview with live status badges (🟢 Available, 🟡 Busy, 🔴 Maintenance).
  - Lab rules, hours, and contact footer.
- **`/login` & `/register`:**
  - Role switcher tab (`Student` / `Lab Manager`).
  - Form validation with automated role-based redirect.

### Student Portal
- **`/equipment` (Catalog & Directory):**
  - Category filters (3D Printers, Laser Cutters, CNC, Electronics) + Search Bar.
  - Equipment cards with specs, photo, station number, and status indicator.
  - Overlay booking modal with date picker and 1-hour slot selector.
- **`/my-bookings` (Passes & History):**
  - Active approved passes with countdown timers and direct "Launch Scanner" action.
  - Pending approval queue with request cancellation option.
  - Past usage history table.
- **`/scan` (QR Scanner):**
  - In-browser camera viewfinder using `html5-qrcode`.
  - Instant validation feedback modal (Success -> Redirect to session, Error -> Specific rejection reason).
- **`/session/active` (Active Console):**
  - Real-time countdown timer for the active reservation.
  - Equipment details and safety guidelines.
  - "Finish Session" CTA (frees machine) and "Report Fault" CTA (triggers maintenance modal).

### Manager Portal
- **`/admin` (Dashboard Overview):**
  - Top metric counters (Pending Requests, Active Sessions, Broken Machines, Total Users).
  - Visual grid of the live lab floor status.
- **`/admin/requests` (Approval Inbox):**
  - Table of pending booking requests with student info, machine name, and requested slot.
  - One-click `Approve` and `Reject` actions.
- **`/admin/inventory` (Asset Control):**
  - Inventory list with manual status override dropdowns (`AVAILABLE`, `BUSY`, `MAINTENANCE`).
  - "Add Machine" modal and "Generate Printable QR Label" modal.
- **`/admin/reports` (Fault Log):**
  - Incident reports submitted by students during sessions.
  - One-click "Mark Resolved" action to restore equipment to `AVAILABLE`.

---

## 6. Database Schema (PostgreSQL)

```sql
-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT CHECK (role IN ('STUDENT', 'MANAGER')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Equipment Table
CREATE TABLE equipment (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    station_number TEXT NOT NULL,
    status TEXT CHECK (status IN ('AVAILABLE', 'BUSY', 'MAINTENANCE')) DEFAULT 'AVAILABLE',
    qr_identifier TEXT UNIQUE NOT NULL,
    image_url TEXT,
    specs JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bookings Table
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    booking_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status TEXT CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED')) DEFAULT 'PENDING',
    checked_in_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fault Reports Table
CREATE TABLE fault_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    equipment_id UUID REFERENCES equipment(id) ON DELETE CASCADE,
    reported_by UUID REFERENCES users(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    severity TEXT CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')) DEFAULT 'MEDIUM',
    status TEXT CHECK (status IN ('OPEN', 'RESOLVED')) DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 7. Recommended Project Folder Structure (Next.js App Router)

```text
lems-project/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (student)/
│   │   ├── equipment/
│   │   │   └── page.tsx
│   │   ├── my-bookings/
│   │   │   └── page.tsx
│   │   ├── scan/
│   │   │   └── page.tsx
│   │   └── session/
│   │       └── active/
│   │           └── page.tsx
│   ├── admin/
│   │   ├── page.tsx
│   │   ├── requests/
│   │   │   └── page.tsx
│   │   ├── inventory/
│   │   │   └── page.tsx
│   │   └── reports/
│   │       └── page.tsx
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/
│   ├── navbar.tsx
│   ├── equipment-card.tsx
│   ├── booking-modal.tsx
│   ├── qr-scanner.tsx
│   └── fault-modal.tsx
├── lib/
│   ├── db.ts
│   ├── types.ts
│   └── utils.ts
├── public/
├── tailwind.config.js
└── package.json
```