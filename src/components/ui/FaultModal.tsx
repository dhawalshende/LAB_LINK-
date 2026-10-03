"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

interface FaultModalProps {
  equipment: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function FaultModal({ equipment, isOpen, onClose, onSuccess }: FaultModalProps) {
  const router = useRouter();

  const [severity, setSeverity] = useState("MEDIUM");
  const [urgency, setUrgency] = useState("medium");
  const [description, setDescription] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen || !equipment) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage("");

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Please log in to report equipment faults.");
      onClose();
      router.push("/login");
      return;
    }

    if (!description.trim()) {
      setErrorMessage("Please enter a detailed description of the fault.");
      return;
    }

    setSubmitting(true);

    const { error: insertErr } = await supabase.from("fault_reports").insert({
      equipment_id: equipment.id,
      reported_by: user.id,
      description: description.trim(),
      severity: severity,
      urgency: urgency,
      status: "OPEN",
    });

    if (insertErr) {
      setSubmitting(false);
      setErrorMessage("Failed to submit fault report. Please try again.");
      return;
    }

    if (severity === "HIGH" || severity === "CRITICAL") {
      await supabase
        .from("equipment")
        .update({ status: "MAINTENANCE" })
        .eq("id", equipment.id);
    }

    setSubmitting(false);
    alert("🚨 Fault report submitted successfully to the Lab Manager!");

    if (onSuccess) onSuccess();
    onClose();
  }

  return (
    <div className="admin-modal-backdrop">
      <div className="admin-modal">
        <button className="admin-modal-close" onClick={onClose} aria-label="Close">✕</button>

        <div style={{ marginBottom: "20px" }}>
          <h2 className="admin-modal-title" style={{ fontSize: "20px" }}>🚨 Report Equipment Fault</h2>
          <p className="admin-modal-sub" style={{ margin: 0 }}>
            Asset: <strong>{equipment.name}</strong> (#{equipment.id})
          </p>
        </div>

        {errorMessage && (
          <div className="admin-modal-error">
            <span>❌</span> {errorMessage}
          </div>
        )}

        <form className="admin-modal-form" onSubmit={handleSubmit}>
          <div className="admin-modal-grid-2">
            <div className="form-group">
              <label className="form-label">Severity Level</label>
              <select className="admin-select" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                <option value="LOW">Low — Minor cosmetic/noise</option>
                <option value="MEDIUM">Medium — Degraded performance</option>
                <option value="HIGH">High — Major malfunction</option>
                <option value="CRITICAL">Critical — Safety hazard / Broken</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Urgency</label>
              <select className="admin-select" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                <option value="low">Low — Next maintenance cycle</option>
                <option value="medium">Medium — Within 48 hours</option>
                <option value="high">High — Within 24 hours</option>
                <option value="critical">Critical — Immediate attention</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Fault Description</label>
            <textarea
              className="form-input"
              required
              rows={4}
              style={{ resize: "vertical" }}
              placeholder="Describe what went wrong, unusual sounds, error codes, or physical damage observed…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="admin-modal-actions">
            <button type="button" className="admin-btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="admin-btn-primary"
              style={{ background: "#dc2626", boxShadow: "0 4px 16px rgba(220,38,38,0.25)" }}
              disabled={submitting}
            >
              {submitting ? "Submitting Report…" : "Submit Incident Report"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
