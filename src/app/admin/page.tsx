"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/ui/Navbar";
import { supabase } from "@/lib/supabase";
import { QRCodeSVG } from "qrcode.react";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [inventorySearch, setInventorySearch] = useState("");

  // Data states
  const [equipment, setEquipment] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [faults, setFaults] = useState<any[]>([]);

  // Add Equipment Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addName, setAddName] = useState("");
  const [addCategory, setAddCategory] = useState("Analytical");
  const [addStation, setAddStation] = useState("");
  const [addQrId, setAddQrId] = useState("");
  const [addDesc, setAddDesc] = useState("");
  const [addIcon, setAddIcon] = useState("🔬");
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [addError, setAddError] = useState("");

  // QR Print Modal state
  const [qrPrintEq, setQrPrintEq] = useState<any>(null);

  // Auth check via Supabase Auth
  useEffect(() => {
    async function checkAdminAuth() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        window.location.href = "/login";
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();

      const userRole = profile?.role || user.user_metadata?.role;
      if (userRole !== "MANAGER" && userRole !== "manager") {
        window.location.href = "/login";
        return;
      }

      setMounted(true);
      fetchDashboardData();
    }

    checkAdminAuth();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    
    // Fetch Equipment
    const { data: eqData } = await supabase.from('equipment').select('*').order('name');
    if (eqData) setEquipment(eqData);

    // Fetch Bookings
    const { data: bkData } = await supabase.from('bookings').select(`
      *,
      equipment (name, category, station_number)
    `).order('created_at', { ascending: false });
    if (bkData) setBookings(bkData);

    // Fetch Faults
    const { data: faultData } = await supabase.from('fault_reports').select(`
      *,
      equipment (name)
    `).order('created_at', { ascending: false });
    if (faultData) setFaults(faultData);

    setLoading(false);
  }

  // Actions
  async function handleBookingAction(id: string, newStatus: string) {
    const { error } = await supabase.from('bookings').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
    } else {
      console.error(error);
    }
  }

  async function handleResolveFault(faultId: string, equipmentId: string) {
    const { error: faultError } = await supabase.from('fault_reports').update({ status: 'RESOLVED' }).eq('id', faultId);
    if (faultError) {
       console.error("Fault update error:", faultError);
       return;
    }
    
    const { error: eqError } = await supabase.from('equipment').update({ status: 'AVAILABLE' }).eq('id', equipmentId);
    
    setFaults(prev => prev.map(f => f.id === faultId ? { ...f, status: 'RESOLVED' } : f));
    setEquipment(prev => prev.map(eq => eq.id === equipmentId ? { ...eq, status: 'AVAILABLE' } : eq));
    
    fetchDashboardData();
  }

  async function handleKeepInMaintenance(equipmentId: string) {
    const { error } = await supabase.from('equipment').update({ status: 'MAINTENANCE' }).eq('id', equipmentId);
    if (!error) {
      setEquipment(prev => prev.map(eq => eq.id === equipmentId ? { ...eq, status: 'MAINTENANCE' } : eq));
      fetchDashboardData();
    } else {
      console.error("Equipment maintenance error:", error);
    }
  }

  async function handleEqStatusChange(id: string, newStatus: string) {
    const { error } = await supabase.from('equipment').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setEquipment(prev => prev.map(eq => eq.id === id ? { ...eq, status: newStatus } : eq));
    }
  }

  async function handleAddEquipment(e: React.FormEvent) {
    e.preventDefault();
    setAddError("");

    if (!addName.trim() || !addStation.trim() || !addQrId.trim()) {
      setAddError("Please fill in Name, Station Number, and QR Identifier.");
      return;
    }

    setSubmittingAdd(true);

    const { data: newEq, error } = await supabase.from('equipment').insert({
      name: addName.trim(),
      category: addCategory.trim(),
      station_number: addStation.trim().toUpperCase(),
      qr_identifier: addQrId.trim().toUpperCase(),
      description: addDesc.trim() || "Laboratory equipment for general academic research and practical sessions.",
      icon: addIcon || "⚙️",
      status: "AVAILABLE",
      specs: {},
    }).select().single();

    setSubmittingAdd(false);

    if (error) {
      console.error("Error adding equipment:", error.message || error);
      setAddError(
        error.message?.includes("unique") || error.details?.includes("already exists")
          ? "An asset with this QR Identifier already exists. Please use a unique QR Identifier."
          : `Failed to add equipment: ${error.message || "Unknown error"}`
      );
      return;
    }

    setAddName("");
    setAddStation("");
    setAddQrId("");
    setAddDesc("");
    setShowAddModal(false);
    
    if (newEq) {
      setEquipment(prev => [newEq, ...prev]);
    }
    fetchDashboardData();
  }

  if (!mounted) return null;

  // Derived stats
  const totalEq = equipment.length;
  const availEq = equipment.filter(e => String(e.status).toUpperCase() === 'AVAILABLE').length;
  const busyEq = equipment.filter(e => String(e.status).toUpperCase() === 'BUSY').length;
  const maintEq = equipment.filter(e => String(e.status).toUpperCase() === 'MAINTENANCE').length;
  
  const pendingReqs = bookings.filter(b => String(b.status).toUpperCase() === 'PENDING');
  const openFaults = faults.filter(f => String(f.status).toUpperCase() === 'OPEN');

  const filteredInventory = equipment.filter(eq => 
    [eq.name, eq.qr_identifier, eq.category, eq.station_number].join(' ').toLowerCase().includes(inventorySearch.toLowerCase())
  );

  const statusBadge = (status: string, pulse: boolean = false) => {
    const s = String(status || '').toLowerCase();
    const map: Record<string, string> = {
      available: "badge-available",
      busy: "badge-busy",
      maintenance: "badge-maintenance",
      pending: "badge-busy",
      approved: "badge-available",
      rejected: "badge-maintenance",
      open: "badge-maintenance",
      resolved: "badge-available"
    };
    return (
      <span className={`eq-card-status-badge ${map[s] || 'badge-available'}`}>
        <span className="badge-dot-sm" />
        {s.toUpperCase()}
      </span>
    );
  };

  const getTimeSlotStr = (req: any) => {
    if (req.time_slot) return req.time_slot;
    if (req.start_time && req.end_time) {
      return `${String(req.start_time).substring(0, 5)} - ${String(req.end_time).substring(0, 5)}`;
    }
    return "Standard Slot";
  };

  return (
    <>
      <Navbar />

      <main className="admin-page">
        {/* ── Page Header ── */}
        <div className="admin-header">
          <div className="admin-header-inner">
            <div>
              <div className="admin-overline">Manager Portal</div>
              <h1 className="admin-title">Admin Control Center</h1>
              <p className="admin-sub">
                Manage lab assets, approve student reservations, and monitor real-time floor availability.
              </p>
            </div>

            {/* Pill Navigation Tabs */}
            <div className="admin-tab-bar">
              <button
                className={`admin-tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
                onClick={() => setActiveTab('dashboard')}
              >
                📊 Overview
              </button>
              <button
                className={`admin-tab-btn ${activeTab === 'requests' ? 'active' : ''}`}
                onClick={() => setActiveTab('requests')}
              >
                📥 Approvals
                {pendingReqs.length > 0 && (
                  <span className="admin-tab-badge green">{pendingReqs.length}</span>
                )}
              </button>
              <button
                className={`admin-tab-btn ${activeTab === 'inventory' ? 'active' : ''}`}
                onClick={() => setActiveTab('inventory')}
              >
                📦 Inventory
              </button>
              <button
                className={`admin-tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
                onClick={() => setActiveTab('reports')}
              >
                🚨 Fault Log
                {openFaults.length > 0 && (
                  <span className="admin-tab-badge red">{openFaults.length}</span>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ── Dashboard Body ── */}
        <div className="admin-body">
          {loading ? (
            <div className="admin-loading-state">
              <div className="admin-spinner" />
              <span>Syncing Lab Infrastructure Data…</span>
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW DASHBOARD */}
              {activeTab === 'dashboard' && (
                <div className="admin-tab-content">
                  {/* Bento Summary Grid */}
                  <div className="admin-bento-grid">
                    <div className="admin-bento-card">
                      <div className="admin-bento-icon blue">📊</div>
                      <div>
                        <div className="admin-bento-num">{totalEq}</div>
                        <div className="admin-bento-label">Total Registered Assets</div>
                      </div>
                    </div>

                    <div className="admin-bento-card">
                      <div className="admin-bento-icon green">✓</div>
                      <div>
                        <div className="admin-bento-num green">{availEq}</div>
                        <div className="admin-bento-label">Available for Booking</div>
                      </div>
                    </div>

                    <div className="admin-bento-card">
                      <div className="admin-bento-icon amber">⚡</div>
                      <div>
                        <div className="admin-bento-num amber">{busyEq}</div>
                        <div className="admin-bento-label">Currently Active / In Use</div>
                      </div>
                    </div>

                    <div className="admin-bento-card">
                      <div className="admin-bento-icon red">🔧</div>
                      <div>
                        <div className="admin-bento-num red">{maintEq}</div>
                        <div className="admin-bento-label">In Maintenance</div>
                      </div>
                    </div>
                  </div>

                  {/* Section Title */}
                  <div className="admin-section-header">
                    <div>
                      <h2 className="admin-section-title">Live Lab Floor Grid</h2>
                      <p className="admin-section-sub">Real-time status of all active machinery across stations.</p>
                    </div>
                  </div>

                  {/* Equipment Grid */}
                  <div className="equipment-grid">
                    {equipment.map(eq => (
                      <article key={eq.id} className="eq-card">
                        <div className={`eq-card-img eq-card-img-${String(eq.status).toLowerCase()}`}>
                          <span className="eq-card-icon">{eq.icon || '🔬'}</span>
                          {statusBadge(eq.status, String(eq.status).toUpperCase() === 'BUSY')}
                        </div>
                        <div className="eq-card-body">
                          <div className="eq-card-name">{eq.name}</div>
                          <div className="eq-card-id">Station {eq.station_number} • {eq.category}</div>
                          <div className="eq-card-meta-row" style={{ marginTop: '4px' }}>
                            <span className="eq-meta-pill">QR: {eq.qr_identifier || eq.id.substring(0, 8)}</span>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: APPROVALS */}
              {activeTab === 'requests' && (
                <div className="admin-tab-content">
                  <div className="admin-section-header">
                    <div>
                      <h2 className="admin-section-title">Pending Booking Requests</h2>
                      <p className="admin-section-sub">Review and approve student lab reservation submissions.</p>
                    </div>
                  </div>

                  {pendingReqs.length === 0 ? (
                    <div className="admin-empty-card">
                      <div className="admin-empty-icon">✅</div>
                      <h3>All Caught Up</h3>
                      <p>No pending booking requests require your review.</p>
                    </div>
                  ) : (
                    <div className="admin-list-wrap">
                      {pendingReqs.map(req => (
                        <div key={req.id} className="admin-action-card">
                          <div className="admin-avatar">
                            {(req.user_id || req.student_id || 'ST').substring(0, 2).toUpperCase()}
                          </div>

                          <div className="admin-action-info">
                            <div className="admin-action-title">
                              {req.equipment?.name || 'Lab Equipment'}
                            </div>
                            <div className="admin-action-sub">
                              Requested by Student #{(req.user_id || req.student_id || 'Student').substring(0, 8)} • Supervisor: {req.faculty_name || 'Faculty Supervisor'}
                            </div>
                            <div className="admin-tag-row">
                              <span className="admin-tag">🗓 {req.booking_date ? new Date(req.booking_date).toLocaleDateString() : 'Today'}</span>
                              <span className="admin-tag">⏰ {getTimeSlotStr(req)} ({req.duration || req.duration_hours || 1}h)</span>
                              <span className="admin-tag">🎯 {req.purpose || req.experiment_title || 'Academic Research'}</span>
                            </div>
                          </div>

                          <div className="admin-btn-row">
                            <button
                              className="admin-btn-approve"
                              onClick={() => handleBookingAction(req.id, 'APPROVED')}
                            >
                              Approve Request
                            </button>
                            <button
                              className="admin-btn-reject"
                              onClick={() => handleBookingAction(req.id, 'REJECTED')}
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Booking History */}
                  <div className="admin-section-header" style={{ marginTop: '40px' }}>
                    <div>
                      <h2 className="admin-section-title">Historical Booking Log</h2>
                      <p className="admin-section-sub">Archive of past approved and rejected requests.</p>
                    </div>
                  </div>

                  <div className="admin-list-wrap">
                    {bookings.filter(b => String(b.status).toUpperCase() !== 'PENDING').length === 0 ? (
                      <div className="admin-empty-card">
                        <p>No historical records logged yet.</p>
                      </div>
                    ) : (
                      bookings.filter(b => String(b.status).toUpperCase() !== 'PENDING').map(req => (
                        <div key={req.id} className="admin-action-card subtle">
                          <div className="admin-action-info">
                            <div className="admin-action-title">{req.equipment?.name || 'Equipment'}</div>
                            <div className="admin-action-sub">
                              {req.booking_date ? new Date(req.booking_date).toLocaleDateString() : ''} • {getTimeSlotStr(req)} • User: {(req.user_id || req.student_id || '').substring(0, 8)}
                            </div>
                          </div>
                          <div>{statusBadge(req.status)}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: INVENTORY MANAGEMENT */}
              {activeTab === 'inventory' && (
                <div className="admin-tab-content">
                  <div className="admin-toolbar">
                    <div className="catalog-search-wrap" style={{ flex: 1 }}>
                      <span className="catalog-search-icon">🔍</span>
                      <input
                        type="search"
                        className="catalog-search-input"
                        placeholder="Search assets by name, category, or station number…"
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                      />
                    </div>
                    <button
                      className="admin-add-btn"
                      onClick={() => {
                        setAddQrId(`LABLINK-EQ-${Math.random().toString(36).substring(2, 6).toUpperCase()}`);
                        setShowAddModal(true);
                      }}
                    >
                      + Add New Equipment
                    </button>
                  </div>

                  <div className="equipment-grid">
                    {filteredInventory.map(eq => (
                      <article key={eq.id} className="eq-card">
                        <div className={`eq-card-img eq-card-img-${String(eq.status).toLowerCase()}`}>
                          <span className="eq-card-icon">{eq.icon || '⚙️'}</span>
                          {statusBadge(eq.status)}
                        </div>
                        <div className="eq-card-body">
                          <div className="eq-card-name">{eq.name}</div>
                          <div className="eq-card-id">{eq.qr_identifier || eq.id.substring(0, 8)} • Station {eq.station_number}</div>

                          <div className="admin-card-control">
                            <label className="admin-control-label">Status Override</label>
                            <select
                              className="admin-select"
                              value={String(eq.status).toUpperCase()}
                              onChange={(e) => handleEqStatusChange(eq.id, e.target.value)}
                            >
                              <option value="AVAILABLE">🟢 Available</option>
                              <option value="BUSY">🟡 Busy / In Use</option>
                              <option value="MAINTENANCE">🔴 Maintenance</option>
                            </select>
                          </div>

                          <button
                            className="admin-btn-secondary"
                            style={{ marginTop: 10, width: '100%', justifyContent: 'center', display: 'flex', gap: 6, alignItems: 'center' }}
                            onClick={() => setQrPrintEq(eq)}
                          >
                            🖨️ Print QR Label
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: FAULT LOG */}
              {activeTab === 'reports' && (
                <div className="admin-tab-content">
                  <div className="admin-section-header">
                    <div>
                      <h2 className="admin-section-title">Active Fault Reports</h2>
                      <p className="admin-section-sub">Equipment issues reported by students or technical staff.</p>
                    </div>
                  </div>

                  {openFaults.length === 0 ? (
                    <div className="admin-empty-card">
                      <div className="admin-empty-icon">🛡️</div>
                      <h3>All Systems Operational</h3>
                      <p>No active maintenance faults reported on the floor.</p>
                    </div>
                  ) : (
                    <div className="admin-list-wrap">
                      {openFaults.map(fault => (
                        <div key={fault.id} className="admin-action-card fault-card">
                          <div className="admin-action-info">
                            <div className="admin-action-header-row">
                              <div className="admin-action-title">{fault.equipment?.name || 'Lab Asset'}</div>
                              {statusBadge(fault.severity || 'open')}
                            </div>
                            <div className="admin-action-sub">
                              Reported by {(fault.reported_by || fault.reporter_id || 'User').substring(0, 8)} • {new Date(fault.created_at).toLocaleString()}
                            </div>
                            <div className="admin-fault-quote">&quot;{fault.description}&quot;</div>
                          </div>

                          <div className="admin-btn-row">
                            <button
                              className="admin-btn-resolve"
                              onClick={() => handleResolveFault(fault.id, fault.equipment_id)}
                            >
                              ✓ Resolve & Restore Available
                            </button>
                            <button
                              className="admin-btn-maint"
                              onClick={() => handleKeepInMaintenance(fault.equipment_id)}
                            >
                              🔧 Keep in Maintenance
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Resolved Incident History */}
                  <div className="admin-section-header" style={{ marginTop: '40px' }}>
                    <div>
                      <h2 className="admin-section-title">Resolved Incident History</h2>
                      <p className="admin-section-sub">Past maintenance logs and resolved faults.</p>
                    </div>
                  </div>

                  <div className="admin-list-wrap">
                    {faults.filter(f => String(f.status).toUpperCase() === 'RESOLVED').length === 0 ? (
                      <div className="admin-empty-card">
                        <p>No historical resolved faults logged.</p>
                      </div>
                    ) : (
                      faults.filter(f => String(f.status).toUpperCase() === 'RESOLVED').map(fault => (
                        <div key={fault.id} className="admin-action-card subtle">
                          <div className="admin-action-info">
                            <div className="admin-action-title">{fault.equipment?.name || 'Equipment'}</div>
                            <div className="admin-action-sub">
                              Reported by {(fault.reported_by || fault.reporter_id || 'User').substring(0, 8)} • {new Date(fault.created_at).toLocaleDateString()}
                            </div>
                            <div className="admin-fault-quote">&quot;{fault.description}&quot;</div>
                          </div>
                          <div>{statusBadge('resolved')}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* ── Add Equipment Modal ── */}
      {showAddModal && (
        <div className="admin-modal-backdrop">
          <div className="admin-modal">
            <button className="admin-modal-close" onClick={() => setShowAddModal(false)}>✕</button>
            <h2 className="admin-modal-title">⚗️ Add New Lab Equipment</h2>
            <p className="admin-modal-sub">Register a new machine into the laboratory database.</p>

            {addError && (
              <div className="admin-modal-error">
                <span>⚠</span> {addError}
              </div>
            )}

            <form onSubmit={handleAddEquipment} className="admin-modal-form">
              <div className="form-group">
                <label className="form-label">Equipment Name *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Rotary Evaporator RE-100"
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  required
                />
              </div>

              <div className="admin-modal-grid-2">
                <div className="form-group">
                  <label className="form-label">Category *</label>
                  <select
                    className="admin-select"
                    value={addCategory}
                    onChange={e => setAddCategory(e.target.value)}
                  >
                    <option value="Analytical">Analytical</option>
                    <option value="Separation">Separation</option>
                    <option value="Measurement">Measurement</option>
                    <option value="Heating">Heating</option>
                    <option value="Optics">Optics</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Synthesis">Synthesis</option>
                    <option value="General">General</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Station / Room *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. CH-201-E"
                    value={addStation}
                    onChange={e => setAddStation(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="admin-modal-grid-2">
                <div className="form-group">
                  <label className="form-label">QR Identifier *</label>
                  <input
                    type="text"
                    className="form-input"
                    style={{ fontFamily: 'monospace' }}
                    placeholder="e.g. LABLINK-EQ-CH06"
                    value={addQrId}
                    onChange={e => setAddQrId(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Icon</label>
                  <select
                    className="admin-select"
                    value={addIcon}
                    onChange={e => setAddIcon(e.target.value)}
                  >
                    <option value="🔬">🔬 Microscope</option>
                    <option value="🌀">🌀 Centrifuge</option>
                    <option value="⚗️">⚗️ Flask/Distill</option>
                    <option value="🧫">🧫 Petri Dish</option>
                    <option value="🔥">🔥 Burner</option>
                    <option value="⚖️">⚖️ Balance</option>
                    <option value="📡">📡 Oscilloscope</option>
                    <option value="⚡">⚡ Meter</option>
                    <option value="⚙️">⚙️ General</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  rows={3}
                  className="form-input"
                  style={{ resize: 'vertical' }}
                  placeholder="Describe the machine, operating limits, or specifications…"
                  value={addDesc}
                  onChange={e => setAddDesc(e.target.value)}
                />
              </div>

              <div className="admin-modal-actions">
                <button
                  type="button"
                  className="admin-btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="admin-btn-primary"
                  disabled={submittingAdd}
                >
                  {submittingAdd ? "Saving…" : "+ Save & Publish Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QR Label Print Modal ── */}
      {qrPrintEq && (
        <div className="admin-modal-backdrop" onClick={() => setQrPrintEq(null)}>
          <div
            className="admin-modal"
            style={{ maxWidth: 380, textAlign: "center" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="admin-modal-close" onClick={() => setQrPrintEq(null)}>✕</button>
            <h2 className="admin-modal-title">🖨️ Print QR Label</h2>
            <p className="admin-modal-sub">
              Affix this sticker to the physical machine at Station {qrPrintEq.station_number}.
            </p>

            <div
              id="qr-print-area"
              style={{
                background: "#fff",
                border: "2px dashed #e5e7eb",
                borderRadius: 20,
                padding: "28px 24px 20px",
                margin: "20px 0",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: "#6b7280", letterSpacing: 2, textTransform: "uppercase" }}>
                LabLink Equipment
              </div>
              <QRCodeSVG
                value={qrPrintEq.qr_identifier}
                size={180}
                bgColor="#ffffff"
                fgColor="#111827"
                level="H"
                includeMargin
              />
              <div style={{ fontSize: 17, fontWeight: 800, color: "#111827", lineHeight: 1.3 }}>
                {qrPrintEq.name}
              </div>
              <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
                Station {qrPrintEq.station_number}
              </div>
              <div style={{ background: "#f3f4f6", borderRadius: 8, padding: "4px 12px", fontSize: 10, fontFamily: "monospace", color: "#374151", letterSpacing: 1 }}>
                {qrPrintEq.qr_identifier}
              </div>
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button className="admin-btn-secondary" style={{ flex: 1 }} onClick={() => setQrPrintEq(null)}>
                Cancel
              </button>
              <button
                className="admin-btn-primary"
                style={{ flex: 1 }}
                onClick={() => {
                  const printStyle = document.createElement("style");
                  printStyle.innerHTML = `
                    @media print {
                      body * { visibility: hidden !important; }
                      #qr-print-area, #qr-print-area * { visibility: visible !important; }
                      #qr-print-area {
                        position: fixed !important;
                        top: 50% !important; left: 50% !important;
                        transform: translate(-50%, -50%) !important;
                        border: none !important;
                      }
                    }
                  `;
                  document.head.appendChild(printStyle);
                  window.print();
                  document.head.removeChild(printStyle);
                }}
              >
                🖨️ Print
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
