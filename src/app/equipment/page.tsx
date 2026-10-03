"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Navbar from "@/components/ui/Navbar";
import BookingModal from "@/components/ui/BookingModal";
import FaultModal from "@/components/ui/FaultModal";
import TiltCard from "@/components/ui/TiltCard";
import MagneticButton from "@/components/ui/MagneticButton";
import { supabase } from "@/lib/supabase";
import FadeContent from "@/components/ui/FadeContent";
import ShinyText from "@/components/ui/ShinyText";

const LABS_META = [
  { id: "chemistry",  name: "Chemistry Lab",   icon: "⚗️" },
  { id: "physics",    name: "Physics Lab",      icon: "🔭" },
  { id: "electronics",name: "Electronics Lab",  icon: "⚡" },
  { id: "biology",    name: "Biology Lab",      icon: "🧬" },
  { id: "computer",   name: "Computer Lab",     icon: "💻" },
  { id: "mechanical", name: "Mechanical Lab",   icon: "⚙️" },
];

const STATUS_FILTERS = [
  { value: "all",         label: "All",         dot: "" },
  { value: "available",   label: "Available",   dot: "green" },
  { value: "busy",        label: "Busy",        dot: "amber" },
  { value: "maintenance", label: "Maintenance", dot: "red" },
];

const EQ_ICONS: Record<string, string> = {
  chemistry: "⚗️", physics: "🔭", electronics: "⚡",
  biology: "🧬", computer: "💻", mechanical: "⚙️",
};

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<any[]>([]);
  const [search, setSearch]           = useState("");
  const [filterStatus, setFilterStatus]   = useState("all");
  const [filterLab, setFilterLab]         = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [mounted, setMounted]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [selectedBookingEq, setSelectedBookingEq] = useState<any>(null);
  const [selectedFaultEq, setSelectedFaultEq]     = useState<any>(null);

  async function fetchEquipment() {
    const { data, error } = await supabase
      .from("equipment")
      .select("*")
      .order("created_at", { ascending: true });

    if (!error && data) {
      const normalized = data.map((eq) => ({
        ...eq,
        qrId: eq.qr_identifier,
        location: eq.station_number,
        room: eq.station_number,
        specs: eq.specs
          ? typeof eq.specs === "object" && !Array.isArray(eq.specs)
            ? Object.entries(eq.specs).map(([, v]) => `${v}`)
            : eq.specs
          : [],
        status: String(eq.status).toLowerCase(),
        lab: eq.station_number?.startsWith("CH") ? "chemistry" : "physics",
      }));
      setEquipment(normalized);
    }
    setLoading(false);
    setMounted(true);
  }

  useEffect(() => { fetchEquipment(); }, []);

  const categories = Array.from(new Set(equipment.map((eq) => eq.category))).filter(Boolean).sort();

  let filtered = equipment;
  const query = search.toLowerCase();
  if (query) {
    filtered = filtered.filter((eq) =>
      [eq.name, eq.id, eq.category, eq.location, ...(eq.specs || [])].join(" ").toLowerCase().includes(query)
    );
  }
  if (filterStatus !== "all")   filtered = filtered.filter((eq) => eq.status === filterStatus);
  if (filterCategory !== "all") filtered = filtered.filter((eq) => eq.category === filterCategory);
  if (filterLab !== "all")      filtered = filtered.filter((eq) => eq.lab === filterLab);

  const availableCount = equipment.filter((e) => e.status === "available").length;
  const busyCount      = equipment.filter((e) => e.status === "busy").length;

  if (!mounted) return null;

  return (
    <>
      <Navbar />

      <main className="catalog-page">
        <FadeContent blur duration={800} initialOpacity={0}>
          <div className="catalog-header">
            <div className="catalog-header-inner">
              <div>
                <div className="catalog-overline">Live Inventory</div>
                <h1 className="catalog-title">Equipment Catalog</h1>
                <p className="catalog-sub">
                  Search, filter, and reserve lab equipment across every department.
                </p>
              </div>

              {/* Quick stat pills */}
              <div className="catalog-stats">
                <div className="catalog-stat-pill green">
                  <span className="catalog-stat-dot green" />
                  <strong>{availableCount}</strong>
                  <span>Available</span>
                </div>
                <div className="catalog-stat-pill amber">
                  <span className="catalog-stat-dot amber" />
                  <strong>{busyCount}</strong>
                  <span>In use</span>
                </div>
                <div className="catalog-stat-pill neutral">
                  <strong>{equipment.length}</strong>
                  <span>Total</span>
                </div>
                <Link href="/scan" className="catalog-qr-btn">
                  <span>📷</span> QR Scan
                </Link>
              </div>
            </div>
          </div>
        </FadeContent>

        <FadeContent delay={200} duration={800}>
          <div className="catalog-body">
          {/* ── Search + Filters ── */}
          <div className="catalog-filters-card">
            {/* Search bar */}
            <div className="catalog-search-wrap">
              <span className="catalog-search-icon">🔍</span>
              <input
                type="search"
                id="catalog-search"
                className="catalog-search-input"
                placeholder="Search by name, equipment ID, or specification…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <button className="catalog-search-clear" onClick={() => setSearch("")}>✕</button>
              )}
            </div>

            {/* Filter rows */}
            <div className="catalog-filter-row">
              {/* Status chips */}
              <div className="catalog-chip-group">
                {STATUS_FILTERS.map((s) => (
                  <button
                    key={s.value}
                    className={`catalog-chip${filterStatus === s.value ? " active" : ""}`}
                    onClick={() => setFilterStatus(s.value)}
                  >
                    {s.dot && <span className={`chip-dot ${s.dot}`} />}
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Lab chips */}
              <div className="catalog-chip-group">
                <button
                  className={`catalog-chip${filterLab === "all" ? " active" : ""}`}
                  onClick={() => setFilterLab("all")}
                >
                  All labs
                </button>
                {LABS_META.map((l) => (
                  <button
                    key={l.id}
                    className={`catalog-chip${filterLab === l.id ? " active" : ""}`}
                    onClick={() => setFilterLab(l.id)}
                  >
                    {l.icon} {l.name}
                  </button>
                ))}
              </div>

              {/* Category chips — only when categories exist */}
              {categories.length > 0 && (
                <div className="catalog-chip-group">
                  <button
                    className={`catalog-chip${filterCategory === "all" ? " active" : ""}`}
                    onClick={() => setFilterCategory("all")}
                  >
                    All categories
                  </button>
                  {categories.map((c: any) => (
                    <button
                      key={c}
                      className={`catalog-chip${filterCategory === c ? " active" : ""}`}
                      onClick={() => setFilterCategory(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Results count ── */}
          <div className="catalog-results-row">
            <span className="catalog-count">
              {loading ? "Loading…" : `${filtered.length} item${filtered.length !== 1 ? "s" : ""} found`}
            </span>
            {(filterStatus !== "all" || filterLab !== "all" || filterCategory !== "all" || search) && (
              <button
                className="catalog-clear-btn"
                onClick={() => { setSearch(""); setFilterStatus("all"); setFilterCategory("all"); setFilterLab("all"); }}
              >
                Clear filters
              </button>
            )}
          </div>

          {/* ── Loading skeleton ── */}
          {loading && (
            <div className="equipment-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="eq-skeleton" />
              ))}
            </div>
          )}

          {/* ── Equipment grid ── */}
          {!loading && (
            <div className="equipment-grid" id="equipment-grid">
              {filtered.length === 0 ? (
                <div className="empty-state" style={{ gridColumn: "1/-1" }}>
                  <div className="empty-state-icon">🔍</div>
                  <div className="empty-state-title">No equipment matches these filters</div>
                  <p className="empty-state-sub">Try adjusting your search or clearing the filters.</p>
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => { setSearch(""); setFilterStatus("all"); setFilterCategory("all"); setFilterLab("all"); }}
                  >
                    Clear all filters
                  </button>
                </div>
              ) : (
                filtered.map((eq, i) => {
                  const canBook = !["maintenance", "busy"].includes(eq.status);
                  const labMeta = LABS_META.find((l) => l.id === eq.lab);

                  return (
                    <article
                      key={eq.id}
                      className="eq-card"
                    >
                      {/* Card image / icon area */}
                      <div className={`eq-card-img eq-card-img-${eq.status}`}>
                        <span className="eq-card-icon">{eq.icon || EQ_ICONS[eq.lab] || "🔬"}</span>
                        {/* Status badge top-right */}
                        <span className={`eq-card-status-badge badge-${eq.status}`}>
                          <span className="badge-dot-sm" />
                          <ShinyText 
                            text={eq.status.charAt(0).toUpperCase() + eq.status.slice(1)} 
                            dark={false} 
                            speed={2} 
                          />
                        </span>
                      </div>

                      {/* Card body */}
                      <div className="eq-card-body">
                        <div className="eq-card-top-row">
                          <div>
                            <div className="eq-card-name">{eq.name}</div>
                            <div className="eq-card-id">#{eq.id}</div>
                          </div>
                        </div>

                        {/* Meta row */}
                        <div className="eq-card-meta-row">
                          <span className="eq-meta-pill">
                            📍 {eq.room || eq.location || "Lab"}
                          </span>
                          <span className="eq-meta-pill">
                            📦 {eq.quantityAvailable ?? 1}/{eq.quantity ?? 1}
                          </span>
                          {labMeta && (
                            <span className="eq-meta-pill">
                              {labMeta.icon} {labMeta.name}
                            </span>
                          )}
                        </div>

                        {/* Spec tags */}
                        {eq.specs?.length > 0 && (
                          <div className="eq-spec-row">
                            {eq.specs.slice(0, 3).map((s: string, idx: number) => (
                              <span key={idx} className="eq-spec-tag">{s}</span>
                            ))}
                          </div>
                        )}

                        {/* Safety indicator */}
                        <div className="eq-safety-row">
                          <span className={`eq-safety-badge ${eq.safetyRequired ? "safety-high" : "safety-std"}`}>
                            {eq.safetyRequired ? "⚠ Safety required" : "✓ Standard induction"}
                          </span>
                        </div>

                        {/* Action buttons */}
                        <div className="eq-card-actions">
                          <Link href={`/equipment/${eq.id}`} className="eq-btn-details">
                            Details
                          </Link>
                          {canBook ? (
                            <MagneticButton
                              className="eq-btn-book"
                              onClick={() => setSelectedBookingEq(eq)}
                            >
                              Book Slot →
                            </MagneticButton>
                          ) : (
                            <button className="eq-btn-disabled" disabled>
                              {eq.status === "busy" ? "Currently busy" : "Under maintenance"}
                            </button>
                          )}
                          <MagneticButton
                            className="eq-btn-fault"
                            title="Report a fault"
                            onClick={() => setSelectedFaultEq(eq)}
                          >
                            🚩
                          </MagneticButton>
                        </div>
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          )}
        </div>
        </FadeContent>
      </main>

      {/* Modals — unchanged */}
      <BookingModal
        equipment={selectedBookingEq}
        isOpen={!!selectedBookingEq}
        onClose={() => setSelectedBookingEq(null)}
        onSuccess={fetchEquipment}
      />
      <FaultModal
        equipment={selectedFaultEq}
        isOpen={!!selectedFaultEq}
        onClose={() => setSelectedFaultEq(null)}
        onSuccess={fetchEquipment}
      />
    </>
  );
}
