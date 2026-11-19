"use client";
import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { restaurant } from "@/lib/config";

type StaffUser = {
  id: string;
  username: string;
  display_name: string;
  role: "manager" | "staff";
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
};

const API = restaurant.apiBaseUrl;
async function api(path: string, options: RequestInit = {}) {
  const response = await fetch(API + path, {
    ...options,
    credentials: "include",
    headers: { "content-type": "application/json", ...(options.headers || {}) }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

export default function StaffManagementPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<"manager" | "staff">("staff");
  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);

  async function loadUsers() {
    const me = await api("/api/auth/me");
    if (me.user?.role !== "manager") {
      setAllowed(false);
      return;
    }
    setAllowed(true);
    const data = await api("/api/admin/users");
    setUsers(data.users || []);
  }

  useEffect(() => {
    loadUsers().catch(e => setError(e instanceof Error ? e.message : "Could not load staff"))
      .finally(() => setLoading(false));
  }, []);

  async function createUser(e: FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({ display_name: displayName, username, password, role })
      });
      setDisplayName("");
      setUsername("");
      setPassword("");
      setRole("staff");
      setNotice("Staff account created. The user must change the temporary password at first sign-in.");
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create account");
    }
  }

  async function toggleActive(user: StaffUser) {
    setError("");
    setNotice("");
    try {
      await api("/api/admin/users/" + user.id, {
        method: "PATCH",
        body: JSON.stringify({ action: "set-active", is_active: !user.is_active })
      });
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update account");
    }
  }

  async function changeRole(user: StaffUser) {
    const nextRole = user.role === "manager" ? "staff" : "manager";
    if (!window.confirm("Change " + user.username + " role to " + nextRole + "?")) return;
    setError("");
    setNotice("");
    try {
      await api("/api/admin/users/" + user.id, {
        method: "PATCH",
        body: JSON.stringify({ action: "set-role", role: nextRole })
      });
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not change role");
    }
  }

  function resetPassword(user: StaffUser) {
    setResetTarget(user.id);
    setResetPasswordValue("");
    setError("");
    setNotice("");
  }

  async function submitPasswordReset(e: FormEvent) {
    e.preventDefault();
    if (!resetTarget) return;
    if (resetPasswordValue.length < 12 || resetPasswordValue.length > 128) {
      setError("Password must be 12-128 characters");
      return;
    }
    setError("");
    setNotice("");
    try {
      await api("/api/admin/users/" + resetTarget, {
        method: "PATCH",
        body: JSON.stringify({ action: "reset-password", password: resetPasswordValue })
      });
      setResetTarget(null);
      setResetPasswordValue("");
      setNotice("Password reset. All existing sessions for this user were revoked.");
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not reset password");
    }
  }

  if (loading) return <main className="admin-shell staff-admin-theme"><p>Loading staff management…</p></main>;
  if (!allowed) return <main className="admin-shell"><section className="admin-panel admin-login"><h1>Manager access required</h1><p>Sign in with an active manager account to manage staff.</p><Link href="/admin">Return to staff sign in</Link></section></main>;

  return <main className="admin-shell">
    <header className="admin-top">
      <div><span className="eyebrow">STAFF ADMINISTRATION</span><h1>Manage staff</h1><p>Create accounts, assign roles, reset passwords, and control access.</p></div>
      <Link className="admin-secondary" href="/admin">Back to menu dashboard</Link>
    </header>
    {error && <p className="admin-error">{error}</p>}
    {notice && <p className="admin-success">{notice}</p>}
    <section className="admin-grid">
      <form className="admin-panel" onSubmit={createUser}>
        <h2>Add staff account</h2>
        <label>Employee name<input value={displayName} onChange={e=>setDisplayName(e.target.value)} maxLength={100} required /></label>
        <label>Username<input value={username} onChange={e=>setUsername(e.target.value)} minLength={3} maxLength={64} pattern="[A-Za-z0-9._-]+" autoComplete="off" required /></label>
        <label>Temporary password<div style={{display:"flex",gap:8,alignItems:"center"}}><input style={{flex:1,minWidth:0}} type={showPassword?"text":"password"} value={password} onChange={e=>setPassword(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required /><button type="button" className="admin-secondary" onClick={()=>setShowPassword(v=>!v)} aria-label={showPassword?"Hide password":"Show password"}>{showPassword?"Hide":"Show"}</button></div></label>
        <label>Role<select value={role} onChange={e=>setRole(e.target.value as "manager"|"staff")}><option value="staff">Staff – read-only</option><option value="manager">Manager – full access</option></select></label>
        <button className="admin-primary">Create account</button>
        <small>New accounts must replace their temporary password at first sign-in.</small>
      </form>
      <section className="admin-panel">
        <h2>Staff accounts ({users.length})</h2>
        <ul className="admin-list">
          {users.map(user=><li key={user.id} className="staff-user-row">
            <div><b>{user.display_name || user.username}</b><small>@{user.username} · {user.role} · {user.is_active ? "Active" : "Disabled"}{user.must_change_password ? " · Password change required" : ""}</small>{resetTarget===user.id&&<form className="staff-reset-form" onSubmit={submitPasswordReset}><label>New temporary password<div style={{display:"flex",gap:8,alignItems:"center"}}><input style={{flex:1,minWidth:0}} type={showResetPassword?"text":"password"} value={resetPasswordValue} onChange={e=>setResetPasswordValue(e.target.value)} minLength={12} maxLength={128} autoComplete="new-password" required /><button type="button" className="admin-secondary" onClick={()=>setShowResetPassword(v=>!v)} aria-label={showResetPassword?"Hide password":"Show password"}>{showResetPassword?"Hide":"Show"}</button></div></label><button className="admin-primary">Save password</button><button type="button" className="admin-secondary" onClick={()=>setResetTarget(null)}>Cancel</button></form>}</div>
            <div className="admin-actions">
              <button type="button" className="admin-secondary" onClick={()=>resetPassword(user)}>Reset password</button>
              <button type="button" className="admin-secondary" onClick={()=>changeRole(user)}>{user.role==="manager"?"Make staff":"Make manager"}</button>
              <button type="button" className={user.is_active?"admin-danger":"admin-primary"} onClick={()=>toggleActive(user)}>{user.is_active?"Disable":"Enable"}</button>
            </div>
          </li>)}
        </ul>
      </section>
    </section>
  </main>;
}
