import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Credential } from "./types";
import AddCredential from "./AddCredential";
import Settings from "./Settings";

interface Props {
  password: string;
  credentials: Credential[];
  onLock: () => void;
  onCredsChange: (creds: Credential[]) => void;
  onPasswordChange: (newPassword: string) => void;
}

export default function Dashboard({ password, credentials, onLock, onCredsChange, onPasswordChange }: Props) {
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editCred, setEditCred] = useState<Credential | null>(null);
  const [toast, setToast] = useState("");
  const [revealId, setRevealId] = useState<string | null>(null);
  const [clipboardTimer, setClipboardTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastActivity, setLastActivity] = useState(Date.now());
  const [autoLockMinutes, setAutoLockMinutes] = useState(2);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastActivity > autoLockMinutes * 60 * 1000) onLock();
    }, 10000);
    return () => clearInterval(interval);
  }, [lastActivity, autoLockMinutes]);

  useEffect(() => {
    const reset = () => setLastActivity(Date.now());
    window.addEventListener("mousemove", reset);
    window.addEventListener("keydown", reset);
    return () => {
      window.removeEventListener("mousemove", reset);
      window.removeEventListener("keydown", reset);
    };
  }, []);

  function showToast(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 3500);
  }

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      showToast(`Copied ${label}. Clears in 30s.`);
      if (clipboardTimer) clearTimeout(clipboardTimer);
      const t = setTimeout(async () => { await navigator.clipboard.writeText(""); }, 30000);
      setClipboardTimer(t);
    } catch { showToast("Failed to copy."); }
  }

  async function handleCopyUsername(cred: Credential) {
    if (!cred.username) return;
    await copyToClipboard(cred.username, `username`);
  }

  async function handleCopyValue(cred: Credential) {
    await copyToClipboard(cred.value, `secret`);
    try {
      const now = new Date().toISOString();
      await invoke("update_last_copied", { password, credentialId: cred.id, timestamp: now });
      onCredsChange(credentials.map((c) => c.id === cred.id ? { ...c, last_copied: now } : c));
    } catch { }
  }

  async function handleAdd(data: Omit<Credential, "id" | "created_at" | "last_copied">) {
    const newCred: Credential = {
      ...data,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      last_copied: null,
    };
    try {
      await invoke("add_credential", { password, credential: newCred });
      onCredsChange([...credentials, newCred]);
      setShowAdd(false);
      showToast(`"${newCred.name}" added.`);
    } catch { showToast("Failed to add."); }
  }

  async function handleEdit(data: Omit<Credential, "id" | "created_at" | "last_copied">) {
    if (!editCred) return;
    const updated = { ...editCred, ...data };
    try {
      await invoke("update_credential", { password, credential: updated });
      onCredsChange(credentials.map((c) => c.id === updated.id ? updated : c));
      setEditCred(null);
      showToast(`"${updated.name}" updated.`);
    } catch { showToast("Failed to update."); }
  }

  async function handleDelete(cred: Credential) {
    if (!confirm(`Delete "${cred.name}"? This cannot be undone.`)) return;
    try {
      await invoke("delete_credential", { password, credentialId: cred.id });
      onCredsChange(credentials.filter((c) => c.id !== cred.id));
      showToast(`"${cred.name}" deleted.`);
    } catch { showToast("Failed to delete."); }
  }

  function expiryStatus(expiry: string | null): "none" | "warning" | "expired" {
    if (!expiry) return "none";
    const days = (new Date(expiry).getTime() - Date.now()) / 86400000;
    if (days < 0) return "expired";
    if (days <= 7) return "warning";
    return "none";
  }

  function expiryDaysLeft(expiry: string): number {
    return Math.ceil((new Date(expiry).getTime() - Date.now()) / 86400000);
  }

  function formatLastCopied(ts: string | null): string {
    if (!ts) return "Never";
    const diff = Date.now() - new Date(ts).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  function getCatClass(cat: string): string {
    const map: Record<string, string> = {
      Git: "cat-Git", Cloud: "cat-Cloud", DB: "cat-DB",
      API: "cat-API", "CI/CD": "cat-CICD", Other: "cat-Other"
    };
    return map[cat] ?? "cat-Other";
  }

  const filtered = credentials.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dashboard">

      {/* Header */}
      <div className="dash-header">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span className="dash-logo">TOK<span>●</span>NLY</span>
          <span className="cred-count">
            {credentials.length} credential{credentials.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="dash-btn-primary" onClick={() => setShowAdd(true)}>+ Add</button>
          <button className="dash-btn-ghost" onClick={() => setShowSettings(true)}>⚙ Settings</button>
          <button className="dash-btn-ghost" onClick={onLock}>🔒 Lock</button>
        </div>
      </div>

      {/* Search */}
      <div className="search-wrap">
        <input
          type="text"
          className="search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or category..."
        />
      </div>

      {/* Table */}
      <div className="table-wrap">
        {filtered.length === 0 ? (
          <div className="empty-state">
            <div style={{ fontSize: 28, marginBottom: 10 }}>🔑</div>
            {search ? "No credentials match your search." : "No credentials yet. Add your first one."}
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                {["Name", "Category", "Username", "Secret", "Expiry", "Last copied", "Actions"].map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((cred) => {
                const expiry = expiryStatus(cred.expiry_date);
                return (
                  <tr
                    key={cred.id}
                    className={
                      expiry === "expired" ? "row-exp" :
                      expiry === "warning" ? "row-warn" : ""
                    }
                  >
                    <td>
                      <div className="cred-name">{cred.name}</div>
                      {cred.notes && <div className="cred-note">{cred.notes}</div>}
                    </td>
                    <td>
                      <span className={`cat ${getCatClass(cred.category)}`}>
                        {cred.category}
                      </span>
                    </td>
                    <td>
                      {cred.username ? (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="username-text">{cred.username}</span>
                          <button className="act-btn" onClick={() => handleCopyUsername(cred)}>
                            Copy
                          </button>
                        </div>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
                      )}
                    </td>
                    <td>
                      {revealId === cred.id ? (
                        <span className="revealed">{cred.value}</span>
                      ) : (
                        <span className="masked">••••••••••••</span>
                      )}
                    </td>
                    <td>
                      {cred.expiry_date ? (
                        <span className={
                          expiry === "expired" ? "expiry-exp" :
                          expiry === "warning" ? "expiry-warn" : "expiry-ok"
                        }>
                          {cred.expiry_date}
                          {expiry === "expired" && " ⚠ Expired"}
                          {expiry === "warning" && ` ⚠ ${expiryDaysLeft(cred.expiry_date)}d left`}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: 11 }}>—</span>
                      )}
                    </td>
                    <td>
                      <span style={{ color: "var(--text-muted)", fontSize: 11 }}>
                        {formatLastCopied(cred.last_copied)}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 4 }}>
                        <button className="act-btn" onClick={() => handleCopyValue(cred)}>Copy</button>
                        <button
                          className="act-btn"
                          onMouseDown={() => setRevealId(cred.id)}
                          onMouseUp={() => setRevealId(null)}
                          onMouseLeave={() => setRevealId(null)}
                        >
                          👁 Hold
                        </button>
                        <button className="act-btn" onClick={() => setEditCred(cred)}>✏</button>
                        <button className="act-btn act-btn-del" onClick={() => handleDelete(cred)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Toast */}
      {toast && <div className="toast">✓ {toast}</div>}

      {/* Add Modal */}
      {showAdd && (
        <AddCredential
          password={password}
          onSave={handleAdd}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {/* Edit Modal */}
      {editCred && (
        <AddCredential
          password={password}
          onSave={handleEdit}
          onCancel={() => setEditCred(null)}
          existing={editCred}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <Settings
          password={password}
          autoLockMinutes={autoLockMinutes}
          onClose={() => setShowSettings(false)}
          onImportComplete={async () => {
            const creds = await invoke<Credential[]>("unlock_vault", { password });
            onCredsChange(creds);
            setShowSettings(false);
          }}
          onPasswordChanged={(newPwd) => {
            onPasswordChange(newPwd);
            setShowSettings(false);
          }}
          onAutoLockChange={setAutoLockMinutes}
        />
      )}
    </div>
  );
}