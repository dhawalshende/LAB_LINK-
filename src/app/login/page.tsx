"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AuroraBackground from "@/components/ui/AuroraBackground";

type Role = "student" | "manager";

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole]           = useState<Role>("student");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");
  const [showRegister, setShowRegister] = useState(false);
  const [showPass, setShowPass]   = useState(false);
  // Register fields
  const [regName, setRegName]     = useState("");
  const [regEmail, setRegEmail]   = useState("");
  const [regPass, setRegPass]     = useState("");

  useEffect(() => {
    async function checkExistingSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase.from("users").select("role").eq("id", user.id).single();
        const userRole = data?.role || user.user_metadata?.role || "STUDENT";
        router.replace(userRole === "MANAGER" ? "/admin" : "/equipment");
      }
    }
    checkExistingSession();
  }, [router]);

  function switchRole(newRole: Role) {
    setRole(newRole);
    setEmail(""); setPassword(""); setError(""); setShowRegister(false);
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");

    const expectedRole = role === "manager" ? "MANAGER" : "STUDENT";
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    if (authErr || !authData.user) {
      setLoading(false);
      setError("Invalid email or password. Please check your credentials.");
      return;
    }

    const { data, error: dbErr } = await supabase
      .from("users")
      .select("id, name, email, role, avatar")
      .eq("id", authData.user.id)
      .single();

    let userData = data;

    // If profile is missing in 'users' table, fall back to auth metadata and try inserting
    if (dbErr || !userData) {
      userData = {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.user_metadata?.name || authData.user.email?.split("@")[0] || "User",
        role: authData.user.user_metadata?.role || "STUDENT",
        avatar: authData.user.user_metadata?.avatar || "👩‍🎓",
      };
      
      // Attempt to silently insert to fix the missing profile
      await supabase.from("users").insert(userData);
    }

    setLoading(false);

    if (userData.role !== expectedRole) {
      setError(
        userData.role === "MANAGER"
          ? "This account is a Lab Manager. Please switch to the Manager tab."
          : "This account is a Student. Please switch to the Student tab."
      );
      return;
    }

    sessionStorage.setItem("lablink_session", JSON.stringify(userData));
    sessionStorage.setItem("lab_user_role", userData.role);
    router.push(userData.role === "MANAGER" ? "/admin" : "/equipment");
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");

    const { data: existing } = await supabase
      .from("users").select("id").eq("email", regEmail.trim().toLowerCase()).single();

    if (existing) { setError("This email is already registered. Please sign in."); setLoading(false); return; }

    const { data: authData, error: insertErr } = await supabase.auth.signUp({
      email: regEmail.trim().toLowerCase(),
      password: regPass,
      options: { data: { name: regName.trim(), role: "STUDENT", avatar: "👩‍🎓" } }
    });

    setLoading(false);
    if (insertErr || !authData.user) { 
      console.error("Supabase Auth Error:", insertErr);
      setError(insertErr?.message || "Registration failed. Please try again."); 
      return; 
    }

    // Explicitly insert into public.users
    await supabase.from("users").insert({
      id: authData.user.id,
      email: regEmail.trim().toLowerCase(),
      name: regName.trim(),
      role: "STUDENT",
      avatar: "👩‍🎓"
    });

    setEmail(regEmail.trim().toLowerCase());
    setPassword(regPass);
    setShowRegister(false); setError("");
    alert("Account created! You can now sign in.");
  }

  const features = [
    { icon: "📅", title: "Smart Scheduling", desc: "Reserve equipment slots with zero conflicts." },
    { icon: "📷", title: "QR Check-In", desc: "Scan on-site to verify your physical presence." },
    { icon: "⚡", title: "Instant Approvals", desc: "Lab managers approve in one tap, anywhere." },
    { icon: "🔴", title: "Live Status", desc: "Real-time availability across every machine." },
  ];

  return (
    <div className="login-page">

      {/* ── Left Panel — Brand Story ───────────────────── */}
      <AuroraBackground className="login-left">
        <div className="login-left-content">
          {/* Back home link */}
          <Link href="/" className="login-back-link">
            <span>←</span> Back to LabLink
          </Link>

          {/* Brand */}
          <div className="login-brand-lockup">
            <div className="login-brand-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
              </svg>
            </div>
            <div>
              <div className="login-brand-name">LabLink</div>
              <div className="login-brand-tagline">University Lab Management</div>
            </div>
          </div>

          <h2 className="login-left-headline">
            Your next great<br />
            experiment starts<br />
            <em>right here.</em>
          </h2>
          <p className="login-left-sub">
            Book equipment, get approvals, and check in — all from one place designed for how college labs actually work.
          </p>

          {/* Feature list */}
          <div className="login-features">
            {features.map((f) => (
              <div className="login-feature" key={f.title}>
                <div className="login-feature-icon">{f.icon}</div>
                <div className="login-feature-text">
                  <strong>{f.title}</strong>
                  <span>{f.desc}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Student count badge */}
          <div className="login-social-proof">
            <div className="login-avatar-stack">
              {["🧑‍🔬","👩‍🎓","👨‍🏫","🧑‍💻"].map((e, i) => (
                <span key={i} className="login-avatar-badge" style={{ zIndex: 4 - i }}>{e}</span>
              ))}
            </div>
            <span>Trusted by <strong>2,400+</strong> students &amp; managers</span>
          </div>
        </div>
      </AuroraBackground>

      {/* ── Right Panel — Auth Card ────────────────────── */}
      <div className="login-right">
        <div className="login-card">

          {/* Card header */}
          <div className="login-card-header">
            <div className="login-card-emoji">{showRegister ? "✨" : role === "student" ? "🎓" : "🔬"}</div>
            <h1 className="login-title">
              {showRegister ? "Create your account" : "Welcome back"}
            </h1>
            <p className="login-sub">
              {showRegister
                ? "Students only. Managers are added by admins."
                : "Sign in to access your lab workspace"}
            </p>
          </div>

          {/* Role toggle — only on login */}
          {!showRegister && (
            <div className="login-role-toggle" role="group" aria-label="Select your role">
              <button
                id="role-btn-student"
                className={`login-role-btn${role === "student" ? " active" : ""}`}
                onClick={() => switchRole("student")}
                type="button"
                suppressHydrationWarning
              >
                <span className="login-role-icon">🎓</span>
                Student
              </button>
              <button
                id="role-btn-manager"
                className={`login-role-btn${role === "manager" ? " active manager-active" : ""}`}
                onClick={() => switchRole("manager")}
                type="button"
                suppressHydrationWarning
              >
                <span className="login-role-icon">👨‍🏫</span>
                Lab Manager
              </button>
            </div>
          )}

          {/* Error banner */}
          {error && (
            <div className="login-error-banner">
              <span>⚠</span> {error}
            </div>
          )}

          {/* ── Login Form ── */}
          {!showRegister && (
            <>
              <form className="login-form" id="login-form" onSubmit={handleLogin}>
                <div className="form-group">
                  <label className="form-label" htmlFor="login-email">Email address</label>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">✉</span>
                    <input
                      type="email"
                      id="login-email"
                      className="form-input login-input"
                      placeholder={role === "student" ? "student@university.edu" : "manager@university.edu"}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      suppressHydrationWarning
                    />
                  </div>
                </div>
                <div className="form-group">
                  <div className="login-label-row">
                    <label className="form-label" htmlFor="login-password">Password</label>
                    <a href="#" className="login-forgot">Forgot password?</a>
                  </div>
                  <div className="login-input-wrap">
                    <span className="login-input-icon">🔒</span>
                    <input
                      type={showPass ? "text" : "password"}
                      id="login-password"
                      className="form-input login-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      suppressHydrationWarning
                    />
                    <button type="button" className="login-eye-btn" onClick={() => setShowPass(!showPass)} suppressHydrationWarning>
                      {showPass ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  className={`login-submit-btn${role === "manager" ? " manager-submit" : ""}`}
                  id="login-btn"
                  disabled={loading}
                  suppressHydrationWarning
                >
                  {loading ? (
                    <span className="login-spinner" />
                  ) : (
                    <>
                      Sign in to {role === "student" ? "my workspace" : "Manager Portal"}
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>

              {role === "student" && (
                <div className="login-register-row">
                  <span>Don&apos;t have an account?</span>
                  <button
                    type="button"
                    className="login-register-link"
                    id="show-register-btn"
                    onClick={() => { setShowRegister(true); setError(""); }}
                    suppressHydrationWarning
                  >
                    Create one →
                  </button>
                </div>
              )}
            </>
          )}

          {/* ── Register Form ── */}
          {showRegister && (
            <form className="login-form" id="register-form" onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label" htmlFor="register-name">Full name</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">👤</span>
                  <input
                    type="text"
                    id="register-name"
                    className="form-input login-input"
                    placeholder="Ananya Rao"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    required
                    autoComplete="name"
                    suppressHydrationWarning
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="register-email">University email</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">✉</span>
                  <input
                    type="email"
                    id="register-email"
                    className="form-input login-input"
                    placeholder="you@university.edu"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    required
                    autoComplete="email"
                    suppressHydrationWarning
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="register-password">Password</label>
                <div className="login-input-wrap">
                  <span className="login-input-icon">🔒</span>
                  <input
                    type="password"
                    id="register-password"
                    className="form-input login-input"
                    placeholder="Min. 8 characters"
                    value={regPass}
                    onChange={(e) => setRegPass(e.target.value)}
                    required
                    autoComplete="new-password"
                    suppressHydrationWarning
                  />
                </div>
              </div>
              <button type="submit" className="login-submit-btn" id="register-btn" disabled={loading} suppressHydrationWarning>
                {loading ? <span className="login-spinner" /> : <>Create my account <span>→</span></>}
              </button>
              <button
                type="button"
                className="login-back-btn"
                onClick={() => { setShowRegister(false); setError(""); }}
                suppressHydrationWarning
              >
                ← Back to sign in
              </button>
            </form>
          )}

          <p className="login-help">
            Need help?{" "}
            <a href="mailto:admin@lab.edu">admin@lab.edu</a>
          </p>
        </div>
      </div>
    </div>
  );
}
