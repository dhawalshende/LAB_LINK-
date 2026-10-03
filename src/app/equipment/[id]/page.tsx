"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import BookingModal from "@/components/ui/BookingModal";
import FaultModal from "@/components/ui/FaultModal";
import { supabase } from "@/lib/supabase";

const TIME_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30','12:00',
  '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'
];

const LABS_META: Record<string, any> = {
  chemistry: { name: 'Chemistry Laboratory', shortName: 'Chem Lab', inCharge: { name: 'Dr. Meena Subramaniam', email: 'meena.sub@university.edu' } },
  physics: { name: 'Physics Laboratory', shortName: 'Physics Lab', inCharge: { name: 'Prof. Arjun Krishnamurthy', email: 'arjun.k@university.edu' } },
  electronics: { name: 'Electronics Laboratory', shortName: 'Electronics Lab', inCharge: { name: 'Dr. Nikhil Menon', email: 'nikhil.menon@university.edu' } },
  biology: { name: 'Biology Laboratory', shortName: 'Biology Lab', inCharge: { name: 'Dr. Asha Thomas', email: 'asha.thomas@university.edu' } },
  computer: { name: 'Computer Laboratory', shortName: 'Computer Lab', inCharge: { name: 'Prof. Rhea Kapoor', email: 'rhea.kapoor@university.edu' } },
  mechanical: { name: 'Mechanical Laboratory', shortName: 'Mechanical Lab', inCharge: { name: 'Dr. Vivek Rao', email: 'vivek.rao@university.edu' } },
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function timeToMinutes(val: string) {
  if (!val) return 0;
  const match = val.match(/(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

export default function EquipmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const eqId = resolvedParams.id;

  const [equipment, setEquipment] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [faultReports, setFaultReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isFaultOpen, setIsFaultOpen] = useState(false);

  async function loadData() {
    setLoading(true);

    const { data: eqData } = await supabase
      .from("equipment")
      .select("*")
      .or(`id.eq.${eqId},qr_identifier.eq.${eqId}`)
      .single();

    if (eqData) {
      const normalized = {
        ...eqData,
        qrId: eqData.qr_identifier,
        location: eqData.station_number,
        room: eqData.station_number,
        status: String(eqData.status).toLowerCase(),
        lab: eqData.station_number?.startsWith("CH") ? "chemistry" : "physics",
        specs: eqData.specs
          ? typeof eqData.specs === "object" && !Array.isArray(eqData.specs)
            ? Object.entries(eqData.specs).map(([k, v]) => `${k}: ${v}`)
            : eqData.specs
          : [],
        usageInstructions: eqData.description
          ? [eqData.description, "Inspect cables and accessories before use.", "Record readings in the experiment log.", "Clean work area and power off after session."]
          : ["Review operating SOP before switching on.", "Inspect accessories before use.", "Record readings in log.", "Clean work area after use."],
        safetyChecklist: eqData.safetyRequired
          ? ["Wear required PPE listed by the lab", "Complete safety induction before operating", "Report unusual noise, heat, or vibration immediately"]
          : ["Wear lab coat and closed-toe shoes", "Use equipment within rated limits", "Report damage before starting work"],
      };
      setEquipment(normalized);

      const { data: bData } = await supabase
        .from("bookings")
        .select("*")
        .eq("equipment_id", eqData.id)
        .neq("status", "REJECTED");
      setBookings(bData || []);

      const { data: fData } = await supabase
        .from("fault_reports")
        .select("*")
        .eq("equipment_id", eqData.id)
        .order("created_at", { ascending: false });
      setFaultReports(fData || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, [eqId]);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="catalog-page" style={{ textAlign: "center", paddingTop: "120px" }}>
          <div className="admin-spinner" style={{ margin: "0 auto 16px" }} />
          <span style={{ fontSize: "14px", color: "var(--text-muted)", fontWeight: "600" }}>Loading equipment profile…</span>
        </main>
      </>
    );
  }

  if (!equipment) {
    return (
      <>
        <Navbar />
        <main className="catalog-page" style={{ textAlign: "center", paddingTop: "120px" }}>
          <h2>Equipment Not Found</h2>
          <Link href="/equipment" className="catalog-qr-btn" style={{ marginTop: "16px", display: "inline-flex" }}>
            ← Back to Equipment Catalog
          </Link>
        </main>
      </>
    );
  }

  const labMeta = LABS_META[equipment.lab] || LABS_META.physics;
  const canBook = equipment.status === "available";

  const next3Days = [0, 1, 2].map((offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const dayStr = d.toISOString().split("T")[0];

    const dayBookings = bookings.filter((b) => b.booking_date === dayStr);

    const isSlotBooked = (timeSlot: string) => {
      const slotMin = timeToMinutes(timeSlot);
      return dayBookings.some((b) => {
        const bStart = timeToMinutes(b.start_time || b.slot?.split("–")[0]);
        const bEnd = timeToMinutes(b.end_time || b.slot?.split("–")[1]);
        return slotMin >= bStart && slotMin < bEnd;
      });
    };

    return { dayStr, dayBookings, isSlotBooked };
  });

  return (
    <>
      <Navbar />

      <main className="catalog-page" style={{ paddingBottom: "80px" }}>
        <div className="catalog-body" style={{ paddingTop: "24px" }}>
          
          {/* Profile Header Card */}
          <div className="admin-action-card" style={{ padding: "28px", borderRadius: "24px", marginBottom: "24px" }}>
            <div className="admin-avatar" style={{ width: "64px", height: "64px", fontSize: "32px", borderRadius: "18px" }}>
              {equipment.icon || "🔬"}
            </div>

            <div className="admin-action-info" style={{ gap: "6px" }}>
              <div className="catalog-overline">#{equipment.id} · QR {equipment.qrId || equipment.id}</div>
              <h1 className="admin-title" style={{ fontSize: "26px", margin: 0 }}>{equipment.name}</h1>
              <div className="admin-tag-row">
                <span className="admin-tag">📍 {labMeta.name}</span>
                <span className="admin-tag">Station {equipment.room || equipment.location}</span>
                <span className={`eq-card-status-badge badge-${equipment.status}`} style={{ position: "relative", top: 0, right: 0 }}>
                  <span className="badge-dot-sm" />
                  {equipment.status.toUpperCase()}
                </span>
                <span className={`eq-safety-badge ${equipment.safetyRequired ? "safety-high" : "safety-std"}`}>
                  {equipment.safetyRequired ? "⚠ Training Required" : "✓ Standard Induction"}
                </span>
              </div>
            </div>

            <div className="admin-btn-row">
              <Link href="/equipment" className="catalog-chip" style={{ textDecoration: "none" }}>
                ← Back
              </Link>
              {canBook ? (
                <button className="eq-btn-book" onClick={() => setIsBookingOpen(true)} style={{ padding: "10px 20px" }}>
                  Book Slot →
                </button>
              ) : (
                <button className="eq-btn-disabled" disabled style={{ padding: "10px 18px" }}>
                  {equipment.status === "busy" ? "Currently Busy" : "In Maintenance"}
                </button>
              )}
              <button className="eq-btn-fault" onClick={() => setIsFaultOpen(true)} title="Report a fault">
                🚩
              </button>
            </div>
          </div>

          {/* Grid Layout: Specs & Calendar */}
          <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: "20px", marginBottom: "20px" }}>
            {/* Specs Card */}
            <div className="catalog-filters-card" style={{ padding: "24px" }}>
              <div className="admin-section-header" style={{ marginBottom: "16px" }}>
                <div>
                  <h2 className="admin-section-title" style={{ fontSize: "18px" }}>Technical Specifications</h2>
                  <p className="admin-section-sub">Unit Availability: {equipment.quantityAvailable ?? 1} / {equipment.quantity ?? 1}</p>
                </div>
              </div>

              {equipment.specs?.length > 0 && (
                <div className="eq-spec-row" style={{ marginBottom: "16px" }}>
                  {equipment.specs.map((s: string, idx: number) => (
                    <span key={idx} className="eq-spec-tag" style={{ fontSize: "11px", padding: "5px 10px" }}>{s}</span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "12px", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid var(--border-light)" }}>
                  <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>Lab Station</span>
                  <span style={{ fontWeight: "700" }}>{equipment.room || equipment.location}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid var(--border-light)" }}>
                  <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>Lab In-Charge</span>
                  <span style={{ fontWeight: "700", textAlign: "right" }}>
                    {labMeta.inCharge.name}<br />
                    <span style={{ fontSize: "11px", color: "var(--text-muted)", fontWeight: "400" }}>{labMeta.inCharge.email}</span>
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "8px", borderBottom: "1px solid var(--border-light)" }}>
                  <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>Session Limit</span>
                  <span style={{ fontWeight: "700" }}>0.5h min · {equipment.maxDuration || 2}h max</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)", fontWeight: "500" }}>Buffer Interval</span>
                  <span style={{ fontWeight: "700" }}>{equipment.bufferMinutes || 10} minutes between slots</span>
                </div>
              </div>
            </div>

            {/* 3-Day Availability Grid */}
            <div className="catalog-filters-card" style={{ padding: "24px" }}>
              <div className="admin-section-header" style={{ marginBottom: "16px" }}>
                <div>
                  <h2 className="admin-section-title" style={{ fontSize: "18px" }}>3-Day Availability</h2>
                  <p className="admin-section-sub">Live view of reserved vs open time windows.</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {next3Days.map(({ dayStr, isSlotBooked }) => (
                  <div key={dayStr} style={{ background: "var(--canvas)", padding: "12px", borderRadius: "14px", border: "1px solid var(--border-light)" }}>
                    <div style={{ fontSize: "12px", fontWeight: "700", marginBottom: "8px", color: "var(--blue-600)" }}>
                      📅 {formatDate(dayStr)}
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                      {TIME_SLOTS.slice(0, 8).map((time) => {
                        const booked = isSlotBooked(time);
                        return (
                          <span
                            key={time}
                            style={{
                              padding: "4px 6px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: "600",
                              textAlign: "center",
                              background: booked ? "#fff5f5" : "var(--green-50)",
                              color: booked ? "#dc2626" : "var(--green-700)",
                              border: `1px solid ${booked ? "rgba(239,68,68,0.2)" : "rgba(5,150,105,0.2)"}`,
                            }}
                          >
                            {time}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Operating Instructions & Safety Checklist */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
            <div className="catalog-filters-card" style={{ padding: "24px" }}>
              <h2 className="admin-section-title" style={{ fontSize: "18px", marginBottom: "12px" }}>Operating Instructions</h2>
              <ol style={{ paddingLeft: "18px", margin: 0, fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.8" }}>
                {equipment.usageInstructions.map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
              </ol>
            </div>

            <div className="catalog-filters-card" style={{ padding: "24px" }}>
              <h2 className="admin-section-title" style={{ fontSize: "18px", marginBottom: "12px" }}>Safety Protocol</h2>
              <ul style={{ paddingLeft: "18px", margin: 0, fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.8" }}>
                {equipment.safetyChecklist.map((item: string, idx: number) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Incident Log for Machine */}
          <div className="catalog-filters-card" style={{ padding: "24px" }}>
            <h2 className="admin-section-title" style={{ fontSize: "18px", marginBottom: "12px" }}>Fault Log for this Asset</h2>
            {faultReports.length === 0 ? (
              <p style={{ fontSize: "13px", color: "var(--text-muted)", margin: 0 }}>No active or past fault reports recorded for this equipment.</p>
            ) : (
              <div className="admin-list-wrap">
                {faultReports.map((report) => (
                  <div key={report.id} className="admin-action-card subtle" style={{ padding: "12px 16px" }}>
                    <div className="admin-action-info">
                      <div className="admin-action-title" style={{ fontSize: "13px" }}>
                        {report.description}
                      </div>
                      <div className="admin-action-sub" style={{ fontSize: "11px" }}>
                        Reported on {new Date(report.created_at).toLocaleDateString()} • Urgency: {report.urgency || "MEDIUM"}
                      </div>
                    </div>
                    <div>
                      <span className={`eq-card-status-badge ${report.status === "RESOLVED" ? "badge-available" : "badge-maintenance"}`}>
                        {report.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>

      <BookingModal
        equipment={equipment}
        isOpen={isBookingOpen}
        onClose={() => setIsBookingOpen(false)}
        onSuccess={loadData}
      />
      <FaultModal
        equipment={equipment}
        isOpen={isFaultOpen}
        onClose={() => setIsFaultOpen(false)}
        onSuccess={loadData}
      />
    </>
  );
}
