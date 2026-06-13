import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

interface Props {
  password: string;
  autoLockMinutes: number;
  onClose: () => void;
  onImportComplete: () => void;
  onPasswordChanged: (newPassword: string) => void;
  onAutoLockChange: (minutes: number) => void;
}

export default function Settings({
  password,
  autoLockMinutes,
  onClose,
  onImportComplete,
  onPasswordChanged,
  onAutoLockChange,
}: Props) {
  const [section, setSection] = useState<"main" | "export" | "import" | "password" | "about">("main");

  return (
    <div className="modal-overlay">
      <div className="modal-card" style={{ maxWidth: 460 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div className="modal-title" style={{ marginBottom: 0 }}>Settings</div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 18 }}
          >
            ✕
          </button>
        </div>

        {section === "main" && (
          <MainSection
            autoLockMinutes={autoLockMinutes}
            onAutoLockChange={onAutoLockChange}
            onExport={() => setSection("export")}
            onImport={() => setSection("import")}
            onPassword={() => setSection("password")}
            onAbout={() => setSection("about")}
          />
        )}
        {section === "export" && (
          <ExportSection password={password} onBack={() => setSection("main")} />
        )}
        {section === "import" && (
          <ImportSection
            password={password}
            onBack={() => setSection("main")}
            onComplete={onImportComplete}
          />
        )}
        {section === "password" && (
          <ChangePasswordSection
            password={password}
            onBack={() => setSection("main")}
            onChanged={onPasswordChanged}
          />
        )}
        {section === "about" && (
          <AboutSection onBack={() => setSection("main")} />
        )}
      </div>
    </div>
  );
}

// ── Main Settings Menu ─────────────────────────────────────
function MainSection({
  autoLockMinutes,
  onAutoLockChange,
  onExport,
  onImport,
  onPassword,
  onAbout,
}: {
  autoLockMinutes: number;
  onAutoLockChange: (minutes: number) => void;
  onExport: () => void;
  onImport: () => void;
  onPassword: () => void;
  onAbout: () => void;
}) {
  const lockOptions = [1, 2, 5, 10, 15, 30, 60];

  return (
    <div>
      {/* Auto-lock */}
      <div style={{
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "14px 16px",
        marginBottom: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>
              Auto-lock timeout
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              Lock vault after inactivity
            </div>
          </div>
          <select
            value={autoLockMinutes}
            onChange={(e) => onAutoLockChange(Number(e.target.value))}
            style={{
              background: "var(--bg-primary)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              padding: "6px 10px",
              fontSize: 12,
              color: "var(--text-primary)",
              cursor: "pointer",
              outline: "none",
            }}
          >
            {lockOptions.map((m) => (
              <option key={m} value={m}>
                {m < 60 ? `${m} min` : "1 hour"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Other settings */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
        <SettingsRow icon="🔑" title="Change master password" description="Update the password that unlocks your vault" onClick={onPassword} />
        <SettingsRow icon="📤" title="Export vault" description="Save an encrypted backup of all credentials" onClick={onExport} />
        <SettingsRow icon="📥" title="Import vault" description="Restore credentials from a .tkly backup file" onClick={onImport} />
        <SettingsRow icon="ℹ️" title="About Tokenly" description="Version info and vault location" onClick={onAbout} />
      </div>

      {/* Vault path */}
      <div style={{
        padding: "10px 14px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 7,
        fontSize: 11,
        color: "var(--text-muted)",
        lineHeight: 1.6,
      }}>
        🔒 Vault: <code style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>~/.tokenly/vault.enc</code>
      </div>
    </div>
  );
}

function SettingsRow({ icon, title, description, onClick }: {
  icon: string;
  title: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "12px 16px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        cursor: "pointer",
        textAlign: "left",
        width: "100%",
        transition: "border-color 0.12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--accent)")}
      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      <span style={{ fontSize: 20 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{description}</div>
      </div>
      <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 16 }}>›</span>
    </button>
  );
}

// ── Change Password Section ────────────────────────────────
function ChangePasswordSection({
  password,
  onBack,
  onChanged,
}: {
  password: string;
  onBack: () => void;
  onChanged: (newPassword: string) => void;
}) {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleChange() {
    setError("");
    setSuccess(false);

    if (current !== password) {
      setError("Current password is wrong.");
      return;
    }
    if (newPass.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPass !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    if (newPass === password) {
      setError("New password must be different from current password.");
      return;
    }

    setLoading(true);
    try {
      // Read vault with old password, re-encrypt with new password
      const creds = await invoke<any[]>("unlock_vault", { password: current });
      await invoke("init_vault", { password: newPass });
      for (const cred of creds) {
        await invoke("add_credential", { password: newPass, credential: cred });
      }
      setSuccess(true);
      onChanged(newPass);
    } catch (e: any) {
      setError("Failed to change password. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, marginBottom: 20, padding: 0 }}>
        ← Back
      </button>

      <div className="modal-title">Change master password</div>

      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
        Your vault will be re-encrypted with the new password immediately. The old password will no longer work.
      </p>

      <label className="field-label">Current password</label>
      <input
        type="password"
        className="field-input"
        value={current}
        onChange={(e) => setCurrent(e.target.value)}
        placeholder="Enter current master password"
      />

      <label className="field-label">New password</label>
      <input
        type="password"
        className="field-input"
        value={newPass}
        onChange={(e) => setNewPass(e.target.value)}
        placeholder="Min. 8 characters"
      />

      <label className="field-label">Confirm new password</label>
      <input
        type="password"
        className="field-input"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Re-enter new password"
      />

      {error && <div className="error-box">{error}</div>}

      {success && (
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: 7,
          padding: "10px 14px",
          fontSize: 12,
          color: "var(--text-primary)",
          marginBottom: 14,
        }}>
          ✓ Master password changed successfully.
        </div>
      )}

      <button
        className="btn-primary"
        onClick={handleChange}
        disabled={loading || !current || !newPass || !confirm}
      >
        {loading ? "Changing password..." : "Change password"}
      </button>
    </div>
  );
}

// ── Export Section ─────────────────────────────────────────
function ExportSection({ password, onBack }: { password: string; onBack: () => void }) {
  const [exportPassword, setExportPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleExport() {
    setError("");
    setSuccess("");
    if (exportPassword.length < 8) { setError("Export password must be at least 8 characters."); return; }
    if (exportPassword !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const filePath = await save({
        defaultPath: `tokenly-export-${today}.tkly`,
        filters: [{ name: "Tokenly Export", extensions: ["tkly"] }],
      });
      if (!filePath) { setLoading(false); return; }
      await invoke("export_vault", { masterPassword: password, exportPassword, exportPath: filePath });
      setSuccess("Vault exported successfully. Keep the export password safe — it cannot be recovered.");
      setExportPassword("");
      setConfirm("");
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, marginBottom: 20, padding: 0 }}>
        ← Back
      </button>
      <div className="modal-title">Export vault</div>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
        Choose a separate export password. You will need it to import on another machine.
      </p>
      <label className="field-label">Export password</label>
      <input type="password" className="field-input" value={exportPassword} onChange={(e) => setExportPassword(e.target.value)} placeholder="Min. 8 characters" />
      <label className="field-label">Confirm export password</label>
      <input type="password" className="field-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Re-enter export password" />
      {error && <div className="error-box">{error}</div>}
      {success && (
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", borderRadius: 7, padding: "10px 14px", fontSize: 12, color: "var(--text-primary)", marginBottom: 14, lineHeight: 1.6 }}>
          ✓ {success}
        </div>
      )}
      <button className="btn-primary" onClick={handleExport} disabled={loading || !exportPassword || !confirm}>
        {loading ? "Exporting..." : "Choose location and export"}
      </button>
    </div>
  );
}

// ── Import Section ─────────────────────────────────────────
function ImportSection({ password, onBack, onComplete }: {
  password: string;
  onBack: () => void;
  onComplete: () => void;
}) {
  const [exportPassword, setExportPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  async function handleImport() {
    setError("");
    setResult(null);
    if (!exportPassword) { setError("Enter the export password used when this file was created."); return; }
    setLoading(true);
    try {
      const filePath = await open({
        multiple: false,
        filters: [{ name: "Tokenly Export", extensions: ["tkly"] }],
      });
      if (!filePath) { setLoading(false); return; }
      const res = await invoke<{ imported: number; skipped: number }>("import_vault", {
        masterPassword: password,
        exportPassword,
        importPath: filePath,
      });
      setResult(res);
      setExportPassword("");
      onComplete();
    } catch {
      setError("Import failed. Wrong export password or invalid file.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, marginBottom: 20, padding: 0 }}>
        ← Back
      </button>
      <div className="modal-title">Import vault</div>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20, lineHeight: 1.6 }}>
        Select a <code style={{ fontFamily: "monospace" }}>.tkly</code> file and enter the password used when it was created. Credentials with matching names will be skipped.
      </p>
      <label className="field-label">Export password</label>
      <input type="password" className="field-input" value={exportPassword} onChange={(e) => setExportPassword(e.target.value)} placeholder="Password used during export" />
      {error && <div className="error-box">{error}</div>}
      {result && (
        <div style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderLeft: "3px solid var(--accent)", borderRadius: 7, padding: "10px 14px", fontSize: 12, color: "var(--text-primary)", marginBottom: 14, lineHeight: 1.8 }}>
          ✓ Import complete.<br />
          <strong>{result.imported}</strong> credential{result.imported !== 1 ? "s" : ""} imported.<br />
          {result.skipped > 0 && <span style={{ color: "var(--text-secondary)" }}>{result.skipped} skipped — already exist by name.</span>}
        </div>
      )}
      <button className="btn-primary" onClick={handleImport} disabled={loading || !exportPassword}>
        {loading ? "Importing..." : "Choose file and import"}
      </button>
    </div>
  );
}

// ── About Section ──────────────────────────────────────────
function AboutSection({ onBack }: { onBack: () => void }) {
  return (
    <div>
      <button onClick={onBack} style={{ background: "transparent", border: "none", color: "var(--text-secondary)", cursor: "pointer", fontSize: 12, marginBottom: 20, padding: 0 }}>
        ← Back
      </button>

      <div className="modal-title">About Tokenly</div>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {[
          ["Version", "1.0.0"],
          ["Build", "Phase 9 — MVP"],
          ["Encryption", "AES-256-GCM"],
          ["Key derivation", "Argon2id"],
          ["Vault location", "~/.tokenly/vault.enc"],
          ["Cloud sync", "Never"],
          ["Network calls", "Zero"],
        ].map(([label, value]) => (
          <div key={label} style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border)",
            borderRadius: 7,
          }}>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
            <span style={{ fontSize: 12, color: "var(--text-primary)", fontFamily: label === "Vault location" || label === "Encryption" || label === "Key derivation" ? "monospace" : "inherit" }}>
              {value}
            </span>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 16,
        padding: "10px 14px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderLeft: "3px solid var(--accent)",
        borderRadius: 7,
        fontSize: 11,
        color: "var(--text-muted)",
        lineHeight: 1.6,
      }}>
        Your tokens. Masked. Local. Always.
      </div>
    </div>
  );
}