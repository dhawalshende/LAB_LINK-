"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const TIME_SLOTS = [
  '09:00','09:30','10:00','10:30','11:00','11:30','12:00',
  '13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30','17:00','17:30','18:00'
];

function timeToMinutes(val: string) {
  if (!val) return 0;
  const match = val.match(/(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

function formatDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h > 0 ? `${h}h` : ''}${m > 0 ? ` ${m}m` : ''}`.trim() || '0m';
}

interface BookingModalProps {
  equipment: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function BookingModal({ equipment, isOpen, onClose, onSuccess }: BookingModalProps) {
  const router = useRouter();
  const todayStr = new Date().toISOString().split("T")[0];

  const [date, setDate] = useState(todayStr);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("10:00");
  const [title, setTitle] = useState("");
  const [course, setCourse] = useState("");
  const [faculty, setFaculty] = useState("");
  const [team, setTeam] = useState("");
  const [purpose, setPurpose] = useState("");
  const [safetyChecked, setSafetyChecked] = useState(false);

  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen || !equipment?.id) return;
    async function loadBookings() {
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .eq("equipment_id", equipment.id)
        .eq("booking_date", date)
        .neq("status", "REJECTED");
      setExistingBookings(data || []);
    }
    loadBookings();
  }, [isOpen, equipment?.id, date]);

  if (!isOpen || !equipment) return null;

  const startMin = timeToMinutes(startTime);
  const endMin = timeToMinutes(endTime);
  const durationMin = endMin - startMin;
  const maxDurationMin = (equipment.maxDuration || 2) * 60;

  const endTimeOptions = TIME_SLOTS.filter(
    (t) => timeToMinutes(t) > startMin && timeToMinutes(t) <= startMin + maxDurationMin
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please log in as a student to book equipment.");
      onClose();
      router.push("/login");
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    const userRole = profile?.role || user.user_metadata?.role || "STUDENT";
    if (userRole !== "STUDENT" && userRole !== "student") {
      alert("Only students can create booking requests.");
      return;
    }

    if (durationMin <= 0) {
      setErrorMessage("End time must be after start time.");
      return;
    }

    if (durationMin > maxDurationMin) {
      setErrorMessage(`Booking exceeds maximum duration of ${equipment.maxDuration || 2} hours.`);
      return;
    }

    if (equipment.safetyRequired && !safetyChecked) {
      setErrorMessage("You must confirm safety training completion before booking.");
      return;
    }

    const hasConflict = existingBookings.some((b) => {
      const bStart = timeToMinutes(b.start_time || b.slot?.split("–")[0]);
      const bEnd = timeToMinutes(b.end_time || b.slot?.split("–")[1]);
      return startMin < bEnd && endMin > bStart;
    });

    if (hasConflict) {
      setErrorMessage("This time window overlaps with an existing reservation. Please select a different slot.");
      return;
    }

    setSubmitting(true);
    const isAutoApprove = durationMin <= 60;
    const initialStatus = isAutoApprove ? "APPROVED" : "PENDING";

    const { error: insertErr } = await supabase.from("bookings").insert({
      user_id: user.id,
      equipment_id: equipment.id,
      booking_date: date,
      start_time: startTime,
      end_time: endTime,
      duration: durationMin / 60,
      experiment_title: title,
      course_code: course,
      faculty_name: faculty,
      team_members: team,
      purpose: purpose,
      status: initialStatus,
    });

    setSubmitting(false);

    if (insertErr) {
      setErrorMessage("Failed to submit booking request. Please try again.");
      return;
    }

    alert(
      isAutoApprove
        ? "✅ Booking approved automatically (<= 1 hour)!"
        : "⏳ Booking submitted! Requires Lab Manager approval for reservations > 1 hour."
    );

    if (onSuccess) onSuccess();
    onClose();
  }

  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal" style={{ maxWidth: "580px", maxHeight: "90vh", overflowY: "auto" }}>
        <button className="admin-modal-close" onClick={onClose} aria-label="Close">✕</button>

        {/* Modal Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "20px" }}>
          <div className="admin-avatar" style={{ width: "52px", height: "52px", fontSize: "28px", borderRadius: "14px" }}>
            {equipment.icon || "🔬"}
          </div>
          <div>
            <h2 className="admin-modal-title" style={{ fontSize: "20px" }}>Reserve {equipment.name}</h2>
            <p className="admin-modal-sub" style={{ margin: 0 }}>
              Asset #{equipment.id} · Station {equipment.station_number || equipment.room || equipment.location || "Lab"}
            </p>
          </div>
        </div>

        {/* Safety Warning */}
        {equipment.safetyRequired && (
          <div className="admin-modal-error" style={{ background: "#fffbeb", borderColor: "#fde68a", color: "#92400e" }}>
            <span style={{ fontSize: "16px" }}>⚠️</span>
            <div style={{ fontSize: "12px" }}>
              <strong>Safety Induction Required:</strong> Confirm safety training completion before booking.
              <label style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "6px", cursor: "pointer", fontWeight: "600" }}>
                <input type="checkbox" checked={safetyChecked} onChange={(e) => setSafetyChecked(e.target.checked)} />
                I confirm my safety training is complete and I will wear required PPE.
              </label>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="admin-modal-error">
            <span>❌</span> {errorMessage}
          </div>
        )}

        {/* Form */}
        <form className="admin-modal-form" onSubmit={handleSubmit}>
          <div className="admin-modal-grid-2">
            <div className="form-group">
              <label className="form-label">Booking Date</label>
              <input className="form-input" type="date" min={todayStr} value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Buffer Time</label>
              <div className="form-input" style={{ background: "var(--surface-2)", color: "var(--text-muted)", display: "flex", alignItems: "center", fontSize: "13px" }}>
                {equipment.bufferMinutes || 10} min buffer slot
              </div>
            </div>
          </div>

          <div className="admin-modal-grid-2">
            <div className="form-group">
              <label className="form-label">Start Time</label>
              <select className="admin-select" value={startTime} onChange={(e) => setStartTime(e.target.value)} required>
                {TIME_SLOTS.slice(0, -1).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">End Time</label>
              <select className="admin-select" value={endTime} onChange={(e) => setEndTime(e.target.value)} required>
                {endTimeOptions.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ fontSize: "12px", color: "var(--blue-600)", fontWeight: "600", marginTop: "-4px" }}>
            Duration: <strong>{formatDuration(durationMin)}</strong> (Max: {equipment.maxDuration || 2}h)
          </div>

          <div className="admin-modal-grid-2">
            <div className="form-group">
              <label className="form-label">Experiment Title</label>
              <input className="form-input" required placeholder="e.g. RC Circuit Response" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Course Code</label>
              <input className="form-input" required placeholder="e.g. PHY301" value={course} onChange={(e) => setCourse(e.target.value)} />
            </div>
          </div>

          <div className="admin-modal-grid-2">
            <div className="form-group">
              <label className="form-label">Faculty Supervisor</label>
              <input className="form-input" required placeholder="e.g. Dr. Subramaniam" value={faculty} onChange={(e) => setFaculty(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Team Members</label>
              <input className="form-input" placeholder="Commas separated" value={team} onChange={(e) => setTeam(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Booking Purpose</label>
            <textarea className="form-input" required rows={3} style={{ resize: "vertical" }} placeholder="Describe your intended experiment..." value={purpose} onChange={(e) => setPurpose(e.target.value)} />
          </div>

          <div className="admin-modal-actions">
            <button type="button" className="admin-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="admin-btn-primary" disabled={submitting}>
              {submitting ? "Submitting…" : "Confirm Reservation →"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
