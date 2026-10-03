"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/ui/Navbar";
import Link from "next/link";

type Booking = {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  experiment_title?: string;
  course_code?: string;
  created_at: string;
  checked_in_at?: string;
  equipment: {
    id: string;
    name: string;
    icon?: string;
    station_number: string;
    category: string;
  };
};

function statusColor(status: string) {
  switch (status.toUpperCase()) {
    case "APPROVED": return { bg: "#f0fdf4", border: "rgba(22,163,74,0.25)", text: "#15803d", dot: "#22c55e" };
    case "PENDING": return { bg: "#fffbeb", border: "rgba(234,179,8,0.25)", text: "#92400e", dot: "#f59e0b" };
    case "COMPLETED": return { bg: "#f8fafc", border: "rgba(100,116,139,0.2)", text: "#475569", dot: "#94a3b8" };
    case "REJECTED": return { bg: "#fef2f2", border: "rgba(220,38,38,0.2)", text: "#991b1b", dot: "#ef4444" };
    default: return { bg: "#f8fafc", border: "rgba(100,116,139,0.2)", text: "#475569", dot: "#94a3b8" };
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function formatTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function CountdownBadge({ endTime }: { endTime: string }) {
  const [display, setDisplay] = useState("");

  useEffect(() => {
    const tick = () => {
      const [h, m, s] = endTime.split(":").map(Number);
      const end = new Date();
      end.setHours(h, m, s || 0, 0);
      const diff = end.getTime() - Date.now();
      if (diff <= 0) { setDisplay("Expired"); return; }
      const rh = Math.floor(diff / 3600000);
      const rm = Math.floor((diff % 3600000) / 60000);
      const rs = Math.floor((diff % 60000) / 1000);
      setDisplay(`${rh > 0 ? rh + "h " : ""}${rm.toString().padStart(2, "0")}m ${rs.toString().padStart(2, "0")}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTime]);

  return (
    <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 700, color: "#2563eb", fontSize: 13 }}>
      ⏱ {display}
    </span>
  );
}

export default function MyBookingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data, error } = await supabase
        .from("bookings")
        .select(`
          *,
          equipment (id, name, icon, station_number, category)
        `)
        .eq("user_id", user.id)
        .order("booking_date", { ascending: false })
        .order("start_time", { ascending: false });

      if (error) { console.error(error); setLoading(false); return; }
      setBookings(data || []);
      setLoading(false);
    }
    load();
  }, [router]);

  async function cancelBooking(id: string) {
    if (!confirm("Are you sure you want to cancel this request?")) return;
    setCancelling(id);
    await supabase.from("bookings").delete().eq("id", id);
    setBookings((prev) => prev.filter((b) => b.id !== id));
    setCancelling(null);
  }

  const todayDate = new Date();
  const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, "0")}-${String(todayDate.getDate()).padStart(2, "0")}`;
  const nowStr = todayDate.toTimeString().split(" ")[0];

  const approved = bookings.filter((b) => b.status.toUpperCase() === "APPROVED" && b.booking_date === today);
  const pending = bookings.filter((b) => b.status.toUpperCase() === "PENDING");
  const history = bookings.filter(
    (b) => b.status.toUpperCase() === "COMPLETED" || b.status.toUpperCase() === "REJECTED" ||
           (b.status.toUpperCase() === "APPROVED" && b.booking_date < today) ||
           (b.status.toUpperCase() === "APPROVED" && b.booking_date > today)
  );

  // Determine if an approved booking is currently in its time window
  function isActive(b: Booking) {
    return b.booking_date === today && nowStr >= b.start_time && nowStr <= b.end_time;
  }

  if (loading) {
    return (
      <main className="page-wrap">
        <Navbar />
        <div className="page-loader">
          <div className="loader-ring" />
          <p className="loader-text">Loading your bookings…</p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-wrap">
      <Navbar />
      <div className="container section" style={{ maxWidth: 760, margin: "0 auto" }}>

        {/* Page header */}
        <div className="page-header" style={{ background: "transparent", borderBottom: "none", padding: "0 0 32px 0", boxShadow: "none" }}>
          <div className="page-header-row">
            <div>
              <h1 className="page-title">My Bookings</h1>
              <p className="page-subtitle">Your active passes, pending requests, and usage history.</p>
            </div>
          </div>
        </div>

        {/* ── SECTION 1: Active / Upcoming Approved Passes ── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeader
            icon="✅"
            title="Approved Passes"
            subtitle="Today's confirmed slots. Scan on-site to start."
            count={approved.length}
          />

          {approved.length === 0 ? (
            <EmptyState icon="🎟️" message="No approved bookings for today." hint="When you have an approved booking for today, it will appear here with a button to scan the equipment QR code." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {approved.map((b) => {
                const active = isActive(b);
                const colors = statusColor("APPROVED");
                return (
                  <div
                    key={b.id}
                    className="booking-card"
                    style={{
                      border: active ? "2px solid rgba(37,99,235,0.35)" : `1px solid ${colors.border}`,
                      boxShadow: active ? "0 8px 32px -8px rgba(37,99,235,0.2)" : undefined,
                    }}
                  >
                    {/* Icon */}
                    <div className="booking-eq-icon" style={{ background: active ? "#eff6ff" : "#f8fafc" }}>
                      {b.equipment.icon || "⚙️"}
                    </div>

                    {/* Info */}
                    <div className="booking-info">
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                        <span className="booking-eq-name">{b.equipment.name}</span>
                        {active && (
                          <span className="badge badge-pending" style={{ background: "#2563eb", color: "#fff", border: "none" }}>
                            ACTIVE NOW
                          </span>
                        )}
                      </div>
                      <div className="booking-eq-lab">
                        Station {b.equipment.station_number} • {formatDate(b.booking_date)}
                      </div>
                      <div className="booking-slot-row">
                        <span className="slot-tag">
                          {formatTime(b.start_time)} – {formatTime(b.end_time)}
                        </span>
                        {b.experiment_title && <span className="slot-tag" style={{ background: "var(--canvas)", color: "var(--text-secondary)", borderColor: "var(--border-light)" }}>{b.experiment_title}</span>}
                      </div>
                      {active && (
                        <div style={{ marginTop: 8 }}>
                          <CountdownBadge endTime={b.end_time} />
                        </div>
                      )}
                    </div>

                    {/* Action */}
                    <div className="booking-actions" style={{ alignSelf: "center", marginLeft: "auto" }}>
                      {active && b.checked_in_at ? (
                        <Link href={`/session/active?bookingId=${b.id}`} className="btn btn-primary btn-sm">
                          Resume →
                        </Link>
                      ) : (
                        <Link href="/scan" className={`btn btn-sm ${active ? "btn-primary" : "btn-outline"}`} style={active ? {} : { opacity: 0.6, pointerEvents: "none" }}>
                          {active ? "Scan QR →" : "Not started"}
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── SECTION 2: Pending Queue ── */}
        <section style={{ marginBottom: 40 }}>
          <SectionHeader
            icon="🕐"
            title="Pending Approval"
            subtitle="Requests waiting for manager review."
            count={pending.length}
          />

          {pending.length === 0 ? (
            <EmptyState icon="📭" message="No pending requests." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pending.map((b) => (
                <div key={b.id} className="booking-card" style={{ border: "1px solid rgba(234,179,8,0.25)", padding: "16px 20px" }}>
                  <div className="booking-eq-icon" style={{ background: "#fffbeb", fontSize: 20, width: 44, height: 44 }}>
                    {b.equipment.icon || "⚙️"}
                  </div>
                  <div className="booking-info">
                    <div className="booking-eq-name" style={{ fontSize: 14 }}>{b.equipment.name}</div>
                    <div className="booking-eq-lab">
                      {formatDate(b.booking_date)} · {formatTime(b.start_time)} – {formatTime(b.end_time)}
                    </div>
                  </div>
                  <div className="booking-actions">
                    <span className="badge badge-busy">PENDING</span>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ color: "#ef4444", borderColor: "rgba(239,68,68,0.3)" }}
                      disabled={cancelling === b.id}
                      onClick={() => cancelBooking(b.id)}
                    >
                      {cancelling === b.id ? "…" : "Cancel"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── SECTION 3: History ── */}
        <section>
          <SectionHeader
            icon="📋"
            title="Usage History"
            subtitle="Completed sessions and rejected requests."
            count={history.length}
          />

          {history.length === 0 ? (
            <EmptyState icon="📂" message="No history yet." />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {history.map((b) => {
                const colors = statusColor(b.status);
                return (
                  <div key={b.id} className="booking-card" style={{ padding: "12px 20px", opacity: 0.85, marginBottom: 0 }}>
                    <div className="booking-eq-icon" style={{ width: 40, height: 40, fontSize: 18, background: "#f8fafc" }}>
                      {b.equipment.icon || "⚙️"}
                    </div>
                    <div className="booking-info">
                      <div className="booking-eq-name" style={{ fontSize: 13, marginBottom: 1 }}>{b.equipment.name}</div>
                      <div className="booking-eq-lab" style={{ fontSize: 11 }}>
                        {formatDate(b.booking_date)} · {formatTime(b.start_time)} – {formatTime(b.end_time)}
                      </div>
                    </div>
                    <div className="booking-actions">
                      <span className="badge" style={{ background: colors.bg, color: colors.text, border: `1px solid ${colors.border}` }}>
                        {b.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

      </div>
    </main>
  );
}

function SectionHeader({ icon, title, subtitle, count }: { icon: string; title: string; subtitle: string; count: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
      <div>
        <h2 className="section-heading" style={{ fontSize: 16, display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
          <span>{icon}</span> {title}
          {count > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, background: "var(--blue-600)", color: "#fff", borderRadius: 20, padding: "1px 8px" }}>
              {count}
            </span>
          )}
        </h2>
        <p className="section-sub" style={{ fontSize: 12, margin: 0 }}>{subtitle}</p>
      </div>
    </div>
  );
}

function EmptyState({ icon, message, hint }: { icon: string; message: string, hint?: string }) {
  return (
    <div className="empty-state" style={{ padding: "28px 20px" }}>
      <div className="empty-state-icon" style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <p className="empty-state-title" style={{ fontSize: 13, marginBottom: hint ? 8 : 0 }}>{message}</p>
      {hint && <p className="empty-state-sub" style={{ fontSize: 12, marginBottom: 0 }}>{hint}</p>}
    </div>
  );
}
