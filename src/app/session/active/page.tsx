"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Navbar from "@/components/ui/Navbar";
import FaultModal from "@/components/ui/FaultModal";

export default function ActiveSessionPage() {
  return (
    <Suspense fallback={
      <main className="page-wrap">
        <Navbar />
        <div className="page-loader">
          <div className="loader-ring" />
          <p className="loader-text">Loading session…</p>
        </div>
      </main>
    }>
      <ActiveSessionInner />
    </Suspense>
  );
}

function ActiveSessionInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const bookingId = searchParams.get("bookingId");

  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState("--:--:--");
  const [expired, setExpired] = useState(false);
  const [showFaultModal, setShowFaultModal] = useState(false);
  const [isFinishing, setIsFinishing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!bookingId) { router.push("/equipment"); return; }

    async function loadSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data, error } = await supabase
        .from("bookings")
        .select(`*, equipment (id, name, station_number, icon, category, qr_identifier)`)
        .eq("id", bookingId)
        .eq("user_id", user.id)
        .single();

      if (error || !data) {
        alert("Session not found or access denied.");
        router.push("/my-bookings");
        return;
      }

      setBooking(data);
      setLoading(false);
    }

    loadSession();
  }, [bookingId, router]);

  // Live countdown timer
  useEffect(() => {
    if (!booking?.end_time) return;

    const tick = () => {
      const [h, m, s] = booking.end_time.split(":").map(Number);
      const endDate = new Date();
      endDate.setHours(h, m, s || 0, 0);
      const diff = endDate.getTime() - Date.now();

      if (diff <= 0) {
        setTimeLeft("00:00:00");
        setExpired(true);
        if (timerRef.current) clearInterval(timerRef.current);
        return;
      }

      const rh = Math.floor(diff / 3600000);
      const rm = Math.floor((diff % 3600000) / 60000);
      const rs = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${rh.toString().padStart(2, "0")}:${rm.toString().padStart(2, "0")}:${rs.toString().padStart(2, "0")}`
      );
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [booking]);

  async function handleFinishSession() {
    if (!booking || isFinishing) return;
    setIsFinishing(true);
    try {
      await supabase.from("equipment").update({ status: "AVAILABLE" }).eq("id", booking.equipment.id);
      await supabase.from("bookings").update({ status: "COMPLETED" }).eq("id", booking.id);
      router.push("/my-bookings");
    } catch (e) {
      console.error(e);
      alert("Failed to end session. Please try again.");
      setIsFinishing(false);
    }
  }

  async function handleFaultSuccess() {
    // Fault submitted → equipment already set to MAINTENANCE inside FaultModal
    // Mark booking completed and go back
    await supabase.from("bookings").update({ status: "COMPLETED" }).eq("id", booking.id);
    router.push("/my-bookings");
  }

  if (loading) {
    return (
      <main className="page-wrap">
        <Navbar />
        <div className="page-loader">
          <div className="loader-ring" />
          <p className="loader-text">Loading session…</p>
        </div>
      </main>
    );
  }

  const timerColor = expired ? "#ef4444" : timeLeft.startsWith("00:0") ? "#f59e0b" : "#2563eb";

  return (
    <main className="page-wrap">
      <Navbar />

      <div className="container section" style={{ maxWidth: 680, margin: "0 auto" }}>

        {/* Live indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: expired ? "#ef4444" : "#22c55e", boxShadow: expired ? "0 0 0 4px rgba(239,68,68,0.2)" : "0 0 0 4px rgba(34,197,94,0.2)", display: "inline-block" }} />
          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1, textTransform: "uppercase" }}>
            {expired ? "Session Expired" : "Active Session"}
          </span>
        </div>

        {/* Countdown card */}
        <div
          className="card"
          style={{
            marginBottom: 16,
            border: `2px solid ${expired ? "rgba(239,68,68,0.2)" : "rgba(37,99,235,0.15)"}`,
            boxShadow: `0 12px 48px -12px ${expired ? "rgba(239,68,68,0.12)" : "rgba(37,99,235,0.15)"}`,
            overflow: "hidden",
          }}
        >
          {/* Timer display */}
          <div style={{ padding: "36px 24px 28px", textAlign: "center", borderBottom: "1px solid var(--border-light, #f1f5f9)" }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>
              {expired ? "Time Expired" : "Time Remaining"}
            </p>
            <div style={{
              fontSize: "clamp(52px, 15vw, 80px)",
              fontWeight: 900,
              color: timerColor,
              letterSpacing: "-2px",
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1,
              transition: "color 0.5s ease",
            }}>
              {timeLeft}
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 12, fontWeight: 500 }}>
              Scheduled: <strong>{booking.start_time?.substring(0, 5)}</strong> – <strong>{booking.end_time?.substring(0, 5)}</strong>
              {booking.booking_date && (
                <> · {new Date(booking.booking_date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</>
              )}
            </p>
          </div>

          {/* Equipment info strip */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "18px 24px", background: "var(--bg-subtle, #f8fafc)" }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14, background: "#fff",
              boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: 26, flexShrink: 0,
            }}>
              {booking.equipment.icon || "⚙️"}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: "var(--text-primary)", marginBottom: 2 }}>
                {booking.equipment.name}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                Station {booking.equipment.station_number}
                {booking.experiment_title ? ` · ${booking.experiment_title}` : ""}
              </div>
            </div>
          </div>
        </div>

        {/* Safety guidelines */}
        <div className="card" style={{ padding: "20px 24px", marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 14, display: "flex", alignItems: "center", gap: 8, color: "var(--text-primary)" }}>
            ⚠️ Safety Guidelines
          </h3>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              "Wear appropriate personal protective equipment (PPE) at all times.",
              "Do not leave the equipment unattended while actively running.",
              "In case of emergency, use the red E-Stop and notify the lab manager immediately.",
              "Clean the station thoroughly before checking out.",
            ].map((rule, i) => (
              <li key={i} style={{ display: "flex", gap: 10, fontSize: 13, color: "var(--text-secondary, #4b5563)" }}>
                <span style={{ color: "#2563eb", marginTop: 1, flexShrink: 0 }}>•</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <button
            className="btn btn-primary btn-xl"
            style={{ flex: 1, justifyContent: "center", minWidth: 160 }}
            onClick={handleFinishSession}
            disabled={isFinishing}
          >
            {isFinishing ? "Checking out…" : "✓ Finish Session & Check-Out"}
          </button>
          <button
            style={{
              flex: "0 0 auto", padding: "14px 20px",
              border: "1.5px solid rgba(220,38,38,0.35)", borderRadius: "var(--radius-lg, 14px)",
              background: "#fff5f5", color: "#dc2626", fontWeight: 700, fontSize: 14,
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
            }}
            onClick={() => setShowFaultModal(true)}
          >
            🚨 Report Fault
          </button>
        </div>

        {expired && (
          <div style={{
            marginTop: 16, padding: "12px 16px", borderRadius: 12,
            background: "#fef2f2", border: "1px solid rgba(239,68,68,0.25)",
            fontSize: 13, color: "#991b1b", fontWeight: 600,
          }}>
            ⚠️ Your session window has ended. Please finish and check out so the equipment can be freed for others.
          </div>
        )}
      </div>

      <FaultModal
        equipment={booking.equipment}
        isOpen={showFaultModal}
        onClose={() => setShowFaultModal(false)}
        onSuccess={handleFaultSuccess}
      />
    </main>
  );
}
