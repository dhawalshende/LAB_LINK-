"use client";

import Link from "next/link";
import Navbar from "@/components/ui/Navbar";

export default function Home() {
  // Mock data for the dashboard preview
  const available = 14;
  const activeBookings = 3;
  const pendingCount = 5;

  const previewRows = [
    { name: "UV-Vis Spectrophotometer", lab: "Chemistry", status: "available", time: "Today, 11:00 AM" },
    { name: "Digital Oscilloscope", lab: "Physics", status: "busy", time: "Today, 1:30 PM" },
    { name: "Optics Bench", lab: "Physics", status: "pending", time: "Tomorrow, 10:00 AM" },
  ];

  const landingStatus = (status: string) =>
    status === "busy" ? "Approved" : status === "pending" ? "Pending" : "Available";

  return (
    <main className="landing-page page-enter" style={{ paddingTop: 80 }}>
      <Navbar />

      <section className="landing-hero relative">

        <div className="landing-hero-copy z-10 relative">
          <div className="landing-badge">
            <span></span> Built for modern college laboratories
          </div>
          <h1>
            Lab operations,<br />
            <em>running smoothly.</em>
          </h1>
          <p>
            LabLink helps students reserve equipment, helps managers approve access, and keeps every laboratory organized.
          </p>
          <div className="landing-actions">
            <Link href="/equipment" className="landing-primary">
              Explore equipment <span>↗</span>
            </Link>
            <Link href="/login" className="landing-secondary">
              Sign in to LabLink <span>→</span>
            </Link>
          </div>
          <div className="landing-trust">
            <span>No paperwork</span>
            <b>•</b>
            <span>Live availability</span>
            <b>•</b>
            <span>QR check-in</span>
          </div>
        </div>
        <div className="hero-orbit z-10 relative">
          <div className="orbit-ring orbit-ring-one"></div>
          <div className="orbit-ring orbit-ring-two"></div>
          <div className="hero-flask">✦</div>
          <div className="orbit-label orbit-label-top">Live availability</div>
          <div className="orbit-label orbit-label-bottom">Access controlled</div>
        </div>
      </section>

      <section className="dashboard-preview" aria-label="LabLink dashboard preview">
        <div className="preview-sidebar">
          <div className="preview-logo">
            <span className="landing-brand-mark">L</span> LabLink
          </div>
          <div className="preview-label">Workspace</div>
          <div className="preview-nav active">
            <span>◫</span> Overview
          </div>
          <div className="preview-nav">
            <span>⌘</span> Equipment
          </div>
          <div className="preview-nav">
            <span>□</span> Reservations
          </div>
          <div className="preview-nav">
            <span>⌁</span> Lab Access
          </div>
          <div className="preview-nav">
            <span>≡</span> Reports
          </div>
          <div className="preview-sidebar-bottom">
            <span className="preview-avatar">AR</span>
            <span>
              Ananya Rao<br />
              <small>Student</small>
            </span>
          </div>
        </div>
        <div className="preview-main">
          <div className="preview-top">
            <div>
              <span className="preview-overline">Tuesday, October 24, 2024</span>
              <h2>Good morning, Ananya</h2>
            </div>
            <span className="preview-notification">◌</span>
          </div>
          <div className="preview-cards">
            <div>
              <span>Available Now</span>
              <strong>{available}</strong>
              <small>↑ 12% this week</small>
            </div>
            <div>
              <span>Active Bookings</span>
              <strong>{activeBookings}</strong>
              <small className="blue-text">Today, across all labs</small>
            </div>
            <div>
              <span>Needs Approval</span>
              <strong>{pendingCount}</strong>
              <small className="orange-text">Review requests</small>
            </div>
          </div>
          <div className="preview-table-head">
            <h3>Upcoming reservations</h3>
            <Link href="/equipment">
              View all <span>↗</span>
            </Link>
          </div>
          <div className="preview-table">
            <div className="table-row table-heading">
              <span>Equipment</span>
              <span>Department</span>
              <span>Time</span>
              <span>Status</span>
            </div>
            {previewRows.map((row, idx) => (
              <div className="table-row" key={idx}>
                <span className="table-equipment">
                  <i>{row.name.charAt(0)}</i>
                  {row.name}
                </span>
                <span>{row.lab}</span>
                <span>{row.time}</span>
                <span className={`preview-status status-${row.status}`}>
                  <b></b>
                  {landingStatus(row.status)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="department-strip">
        <p>Designed to work across every academic department</p>
        <div>
          <span>◈ Chemistry</span>
          <span>◉ Physics</span>
          <span>◌ Biology</span>
          <span>⌁ Electronics</span>
          <span>⌬ Engineering</span>
          <span>▣ Computing</span>
        </div>
      </section>

      <section className="landing-section benefits-section">
        <div className="section-intro">
          <span className="landing-kicker">WHY LABLINK</span>
          <h2>
            Less administration.<br />
            <em>More learning.</em>
          </h2>
        </div>
        <div className="benefit-grid">
          <article>
            <div className="benefit-icon lime-icon">◷</div>
            <h3>Flexible Reservations</h3>
            <p>Students select a date, start time, end time, and duration that fits their work.</p>
            <Link href="/equipment">
              Explore booking <span>↗</span>
            </Link>
          </article>
          <article>
            <div className="benefit-icon blue-icon">◉</div>
            <h3>Live Equipment Status</h3>
            <p>See available, busy, and maintenance equipment in real time before you walk across campus.</p>
            <Link href="/equipment">
              See equipment <span>↗</span>
            </Link>
          </article>
          <article>
            <div className="benefit-icon green-icon">⌁</div>
            <h3>Simple Access Control</h3>
            <p>Managers approve requests and students check in with a quick QR scan at the bench.</p>
            <Link href="/login">
              Get started <span>↗</span>
            </Link>
          </article>
        </div>
      </section>

      <section className="landing-section process-section" id="how-it-works">
        <div className="section-intro centered-intro">
          <span className="landing-kicker">HOW IT WORKS</span>
          <h2>
            From search to session<br />
            <em>in three simple steps.</em>
          </h2>
        </div>
        <div className="process-grid">
          <div>
            <span className="process-number">01</span>
            <div className="process-icon">⌕</div>
            <h3>Find equipment</h3>
            <p>Browse a live catalog across every lab and see what is ready to use.</p>
          </div>
          <div>
            <span className="process-number">02</span>
            <div className="process-icon">◫</div>
            <h3>Choose your time</h3>
            <p>Pick a date, duration, and slot that works for your experiment.</p>
          </div>
          <div>
            <span className="process-number">03</span>
            <div className="process-icon">⌁</div>
            <h3>Scan QR and start</h3>
            <p>Check in at the machine and get straight to meaningful work.</p>
          </div>
        </div>
      </section>

      <section className="landing-section testimonial-section">
        <div className="testimonial-heading">
          <span className="landing-kicker">FROM THE LAB</span>
          <h2>
            Built around the people<br />
            doing the <em>real work.</em>
          </h2>
        </div>
        <div className="quote-grid">
          <blockquote>
            <div className="quote-mark">“</div>
            <p>LabLink means I spend less time refreshing spreadsheets and more time helping students with their experiments.</p>
            <footer>
              <span className="quote-avatar manager-avatar">MS</span>
              <span>
                <strong>Dr. Meena Subramaniam</strong>
                <small>Lab Manager, Eastbridge University</small>
              </span>
            </footer>
          </blockquote>
          <blockquote>
            <div className="quote-mark">“</div>
            <p>I can find the right instrument between classes and know exactly when it will be ready. It has changed how I plan practicals.</p>
            <footer>
              <span className="quote-avatar student-avatar">AR</span>
              <span>
                <strong>Ananya Rao</strong>
                <small>B.Tech Computer Science, Year 3</small>
              </span>
            </footer>
          </blockquote>
        </div>
      </section>

      <section className="final-cta">
        <div>
          <span className="landing-kicker">YOUR NEXT SESSION STARTS HERE</span>
          <h2>
            Ready for a better<br />
            <em>lab day?</em>
          </h2>
          <p>Find the equipment you need and reserve a slot in minutes.</p>
        </div>
        <Link href="/equipment" className="landing-cta-light">
          Browse equipment <span>↗</span>
        </Link>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-top">
          <div>
            <Link href="/" className="landing-brand">
              <span className="landing-brand-mark">L</span>
              <span>LabLink</span>
            </Link>
            <p>Making every lab hour count.</p>
          </div>
          <div>
            <h4>Explore</h4>
            <Link href="/equipment">Equipment</Link>
            <Link href="/labs">Laboratories</Link>
            <Link href="#how-it-works">How it works</Link>
          </div>
          <div>
            <h4>Support</h4>
            <span>Mon–Sat, 9:00 AM–6:00 PM</span>
            <a href="mailto:lablink@university.edu">lablink@university.edu</a>
            <a href="tel:+911122334455">Emergency: +91 11223 34455</a>
          </div>
          <div>
            <h4>For managers</h4>
            <Link href="/admin">Manager Portal</Link>
            <Link href="/login">Log in</Link>
          </div>
        </div>
        <div className="landing-footer-bottom">
          <span>© 2026 LabLink University. All rights reserved.</span>
          <span>Designed for better lab days.</span>
        </div>
      </footer>
    </main>
  );
}
