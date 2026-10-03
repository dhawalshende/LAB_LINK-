"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Navbar from "@/components/ui/Navbar";

type Status = "loading" | "scanning" | "denied" | "error";

export default function ScanPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // We need a robust way to handle React Strict Mode double-invocations
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      const { data: profile } = await supabase
        .from("users").select("role").eq("id", user.id).single();
      const userRole = profile?.role || user.user_metadata?.role;

      if (userRole !== "STUDENT" && userRole !== "student") {
        if (isMounted) {
          setErrorMsg("Only students can use the check-in scanner.");
          setStatus("error");
        }
        return;
      }

      if (isMounted) {
        await startScanner(user.id);
      }
    }

    async function startScanner(uid: string) {
      if (!isMounted) return;
      
      // Clean up any existing scanner instance before creating a new one
      if (scannerRef.current) {
        try {
          if (scannerRef.current.isScanning) {
            await scannerRef.current.stop();
          }
          scannerRef.current.clear();
        } catch (e) {
          console.error("Cleanup error before restart", e);
        }
      }

      const scanner = new Html5Qrcode("reader");
      scannerRef.current = scanner;
      try {
        await scanner.start(
          { facingMode: "environment" },
          {
            fps: 10,
            qrbox: (viewfinderWidth, viewfinderHeight) => {
              const minDimension = Math.min(viewfinderWidth, viewfinderHeight);
              const size = Math.floor(minDimension * 0.7);
              return { width: size, height: size };
            },
            aspectRatio: 1.0,
          },
          (text) => {
            if (isMounted) handleScan(text, uid);
          },
          () => {} // per-frame not-found is normal
        );
        if (isMounted) setStatus("scanning");
      } catch (err) {
        console.error("Camera error:", err);
        if (isMounted) setStatus("denied");
      }
    }

    // Delay initialization slightly to allow Strict Mode's rapid unmount to happen
    // before we try to grab the camera hardware
    const initTimer = setTimeout(() => {
      init();
    }, 100);

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      const scanner = scannerRef.current;
      if (scanner) {
        try {
          if (scanner.isScanning) {
            scanner.stop()
              .then(() => { try { scanner.clear(); } catch (_) {} })
              .catch(() => { try { scanner.clear(); } catch (_) {} });
          } else {
            scanner.clear();
          }
        } catch (e) {
          console.error("Cleanup error", e);
        }
        scannerRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleScan(decodedText: string, userId: string) {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;
    setErrorMsg("");

    try {
      // 1. QR must match a known equipment
      const { data: equipment, error: eqError } = await supabase
        .from("equipment")
        .select("id, status, name")
        .eq("qr_identifier", decodedText)
        .single();

      if (eqError || !equipment) {
        showError("Wrong machine scanned. QR code not found in inventory.");
        return;
      }

      // 2. User must have an APPROVED booking for this machine today
      const today = new Date();
      const dateString = today.toLocaleDateString("en-CA"); // YYYY-MM-DD

      const { data: bookings, error: bookingError } = await supabase
        .from("bookings")
        .select("*")
        .eq("user_id", userId)
        .eq("equipment_id", equipment.id)
        .eq("booking_date", dateString)
        .eq("status", "APPROVED");

      if (bookingError || !bookings || bookings.length === 0) {
        showError(`Booking not approved. No approved booking found for "${equipment.name}" today.`);
        return;
      }

      // 3. Current time must fall within the booked slot
      const currentTimeStr = today.toTimeString().split(" ")[0]; // HH:MM:SS
      const activeBooking = bookings.find(
        (b) => currentTimeStr >= b.start_time && currentTimeStr <= b.end_time
      );

      if (!activeBooking) {
        showError("Session not yet active. Check your scheduled start time and try again.");
        return;
      }

      // ── All three checks passed ──
      setSuccessMsg("✓ Check-in successful! Starting your session…");
      isProcessingRef.current = false;

      const scanner = scannerRef.current;
      if (scanner) {
        await scanner.stop().catch(() => {});
        try { scanner.clear(); } catch (_) {}
        scannerRef.current = null;
      }

      await supabase.from("equipment").update({ status: "BUSY" }).eq("id", equipment.id);
      await supabase.from("bookings")
        .update({ checked_in_at: new Date().toISOString() })
        .eq("id", activeBooking.id);

      setTimeout(() => router.push(`/session/active?bookingId=${activeBooking.id}`), 1500);

    } catch (e) {
      console.error(e);
      showError("Validation error. Please try scanning again.");
    }
  }

  function showError(msg: string) {
    setErrorMsg(msg);
    setTimeout(() => {
      setErrorMsg("");
      isProcessingRef.current = false;
    }, 4000);
  }

  return (
    <main className="page-wrap">
      <Navbar />

      <div style={{ minHeight: "calc(100dvh - 64px)", background: "var(--bg-canvas)", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px" }}>
        <div style={{ width: "100%", maxWidth: 420 }}>

          {/* Header */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 48, height: 48, background: "var(--blue-50)", color: "var(--blue-600)",
              borderRadius: 14, marginBottom: 12, fontSize: 22,
            }}>⌁</div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6, color: "var(--text-primary)" }}>QR Check-In</h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.5 }}>
              Point your camera at the QR sticker on the machine to verify and start your session.
            </p>
          </div>

          {/* Viewfinder card */}
          <div style={{
            background: "#000",
            borderRadius: 24,
            overflow: "hidden",
            boxShadow: "var(--shadow-xl)",
            marginBottom: 16,
            // Force a square aspect ratio on the wrapper
            aspectRatio: "1 / 1",
            position: "relative",
            width: "100%",
          }}>
            {/*
              #reader is EXCLUSIVELY owned by html5-qrcode.
              aspectRatio: 1.0 in the scanner config forces a square video feed.
              React renders NO children inside this div.
            */}
            <div
              id="reader"
              style={{
                width: "100%",
                height: "100%",
                position: "absolute",
                inset: 0,
              }}
            />

            {/* Loading overlay — absolutely positioned, sibling to nothing inside #reader */}
            {status === "loading" && (
              <div style={{
                position: "absolute", inset: 0, background: "#111",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12,
                zIndex: 10,
              }}>
                <div className="loader-ring" style={{ borderTopColor: "#fff", borderColor: "rgba(255,255,255,0.2)" }} />
                <p style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)" }}>Initializing camera…</p>
              </div>
            )}

            {status === "denied" && (
              <div style={{
                position: "absolute", inset: 0, background: "#111",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 10, padding: 28, textAlign: "center", zIndex: 10,
              }}>
                <span style={{ fontSize: 32 }}>📷</span>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#f87171" }}>Camera Access Denied</p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", lineHeight: 1.5 }}>
                  Allow camera access in your browser settings, then reload this page.
                </p>
              </div>
            )}

            {status === "error" && (
              <div style={{
                position: "absolute", inset: 0, background: "#111",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                gap: 10, padding: 28, textAlign: "center", zIndex: 10,
              }}>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#f87171" }}>{errorMsg}</p>
              </div>
            )}
          </div>

          {/* Feedback pills */}
          {errorMsg && status === "scanning" && (
            <div style={{
              background: "var(--red-50)", border: "1px solid rgba(239,68,68,0.25)",
              borderRadius: 14, padding: "12px 16px",
              display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 12,
            }}>
              <span style={{ flexShrink: 0, fontSize: 16 }}>⚠️</span>
              <p style={{ fontSize: 13, fontWeight: 600, color: "#991b1b", lineHeight: 1.4 }}>{errorMsg}</p>
            </div>
          )}

          {successMsg && (
            <div style={{
              background: "var(--green-50)", border: "1px solid rgba(5,150,105,0.25)",
              borderRadius: 14, padding: "12px 16px",
              display: "flex", alignItems: "center", gap: 10, marginBottom: 12,
            }}>
              <span style={{ color: "var(--green-600)", fontSize: 16, flexShrink: 0 }}>✓</span>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--green-700)" }}>{successMsg}</p>
            </div>
          )}

          {/* Instructions */}
          {status === "scanning" && !errorMsg && !successMsg && (
            <p style={{ textAlign: "center", fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
              Hold steady within 15–30 cm of the sticker
            </p>
          )}

          {/* Cancel */}
          <button
            className="btn btn-outline btn-fw"
            style={{ marginTop: 14 }}
            onClick={() => router.push("/equipment")}
          >
            Cancel &amp; Return to Equipment
          </button>
        </div>
      </div>
    </main>
  );
}
