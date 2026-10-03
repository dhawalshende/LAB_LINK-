"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [role, setRole] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    async function initAuth() {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        setUser(currentUser);
        fetchUserProfile(currentUser.id, currentUser);
      } else {
        setUser(null); setRole(null); setName(null);
      }
    }
    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserProfile(session.user.id, session.user);
      } else {
        setUser(null); setRole(null); setName(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchUserProfile(userId: string, authUser: any) {
    const { data } = await supabase
      .from("users")
      .select("role, name")
      .eq("id", userId)
      .single();

    if (data) {
      setRole(data.role);
      setName(data.name);
    } else if (authUser?.user_metadata) {
      setRole(authUser.user_metadata.role || "STUDENT");
      setName(authUser.user_metadata.name || authUser.email?.split("@")[0]);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    sessionStorage.clear();
    setUser(null); setRole(null); setName(null);
    router.push("/login");
  }

  const displayName = name || user?.email?.split("@")[0] || "User";
  const isManager = role === "MANAGER";

  const navLinks = [
    { href: "/", label: "Home" },
    { href: "/equipment", label: "Equipment" },
    ...(user && !isManager ? [{ href: "/my-bookings", label: "My Bookings" }] : []),
    ...(isManager ? [{ href: "/admin", label: "Manager Portal" }] : []),
  ];

  return (
    <>
      {/* Floating pill navbar shell */}
      <header className="nav-shell">
        <div className="nav-pill">

          {/* ── Brand ── */}
          <Link href="/" className="nav-brand" style={{ textDecoration: "none" }}>
            <div className="nav-brand-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18"/>
              </svg>
            </div>
            <span className="nav-brand-name">
              Lab<span style={{ color: "var(--accent-primary)" }}>Link</span>
            </span>
          </Link>

          {/* ── Center Nav Links (pill group) ── */}
          <nav className="nav-links-group">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`nav-link-pill${pathname === link.href ? " active" : ""}`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* ── Right: User chip + CTA ── */}
          <div className="nav-right">
            {user ? (
              <>
                <div className="nav-user-chip">
                  <span className={`role-pip ${isManager ? "manager" : "student"}`} />
                  <span style={{ maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {displayName}
                  </span>
                  <span style={{ fontSize: 10, opacity: 0.65, textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 700 }}>
                    {role || "STUDENT"}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="nav-logout-btn"
                  title="Log out"
                >
                  Logout
                </button>
              </>
            ) : (
              <Link href="/login" className="nav-login-btn">
                Log in
              </Link>
            )}

            <Link href="/equipment" className="nav-cta-btn">
              Explore <span style={{ fontSize: 14, lineHeight: 1 }}>↗</span>
            </Link>

            {/* Mobile hamburger */}
            <button
              className="nav-hamburger"
              onClick={() => setMenuOpen(!menuOpen)}
              aria-label="Toggle menu"
            >
              {menuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* ── Mobile Dropdown ── */}
        {menuOpen && (
          <div className="nav-mobile-menu">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="nav-mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Link href="/equipment" className="nav-mobile-cta" onClick={() => setMenuOpen(false)}>
              Explore Equipment ↗
            </Link>
          </div>
        )}
      </header>
    </>
  );
}
