# LabLink — Laboratory Equipment Management System (LEMS)

A smart university lab equipment booking and management portal for students and lab managers.

## Features

- **Equipment Catalog** — Browse live availability across all labs (Chemistry, Physics, Electronics, Biology, Computer, Mechanical)
- **Booking System** — Students request 1-hour slots; managers approve/reject in real time
- **QR Check-in** — Physical QR code scan on the machine verifies on-site presence before unlocking a session
- **Fault Reporting** — One-tap incident reports that automatically take equipment offline
- **Admin Portal** — Manager dashboard for approvals, incident management, and equipment status control
- **Role-based Auth** — Supabase-backed authentication with `STUDENT` and `MANAGER` roles, enforced in middleware

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Auth & DB | Supabase |
| Styling | Tailwind CSS v4 + custom design system |
| Animations | GSAP, Lenis (smooth scroll) |
| QR | `html5-qrcode` (scanner), `qrcode.react` (generator) |
| 3D/WebGL | OGL |
| Language | TypeScript |

## Project Structure

```
src/
├── app/
│   ├── page.tsx           # Landing page
│   ├── layout.tsx         # Root layout (font, metadata)
│   ├── globals.css        # Design system + all component styles
│   ├── login/             # Login page
│   ├── equipment/         # Equipment catalog + [id] detail page
│   ├── admin/             # Manager portal
│   ├── my-bookings/       # Student bookings view
│   ├── scan/              # QR scanner page
│   └── session/active/    # Active session view
├── components/ui/         # Reusable UI components
├── lib/
│   ├── supabase.ts        # Browser Supabase client
│   └── supabase-server.ts # Server-side Supabase client
└── middleware.ts          # Auth + role guard (protects /admin, /equipment)
docs/
└── PRD.md                 # Product Requirements Document
```

## Getting Started

### Prerequisites
- Node.js 20+
- A Supabase project with the required tables (`users`, `equipment`, `bookings`, `incidents`)

### Setup

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env.local` file:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Roles

| Role | Access |
|---|---|
| `STUDENT` | Browse equipment, book slots, scan QR, view own bookings |
| `MANAGER` | Everything above + approve/reject bookings, resolve incidents, manage equipment status |
