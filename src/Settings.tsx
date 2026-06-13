import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";

interface Props {
  password: string;
  onClose: () => void;
  onImportComplete: () => void;
}

export default function Settings({ password, onClose, onImportComplete }: Props) {
  const [section, setSection] = useState<"main" | "export" | "import">("main");

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

        {section === "main" && <MainSection onExport={() => setSection("export")} onImport={() => setSection("import")} />}
        {section === "export" && <ExportSection password={password} onBack={() => setSection("main")} />}
        {section === "import" && <ImportSection password={password} onBack={() => setSection("main")} onComplete={onImportComplete} />}
      </div>
    </div>
  );
}

// ── Main Settings Menu ─────────────────────────────────────
function MainSection({ onExport, onImport }: { onExport: () => void; onImport: () => void }) {
  return (
    <div>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>
        Manage your vault data. All operations are local — nothing leaves your machine.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <SettingsRow
          icon="📤"
          title="Export vault"
          description="Save an encrypted backup of all credentials to a file"
          onClick={onExport}
        />
        <SettingsRow
          icon="📥"
          title="Import vault"
          description="Restore credentials from a previously exported .tkly file"
          onClick={onImport}
        />
      </div>

      <div style={{
        marginTop: 24,
        padding: "12px 14px",
        background: "var(--bg-secondary)",
        border: "1px solid var(--border)",
        borderRadius: 7,
        fontSize: 11,
        color: "var(--text-muted)",
        lineHeight: 1.6
      }}>
        🔒 Vault location: <code style={{ fontFamily: "monospace", color: "var(--text-secondary)" }}>~/.tokenly/vault.enc</code>
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
        padding: "14px 16px",
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
      <span style={{ fontSize: 22 }}>{icon}</span>
      <div>
        <div style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{description}</div>
      </div>
      <span style={{ marginLeft: "auto", color: "var(--text-muted)", fontSize: 16 }}>›</span>
    </button>
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

    if (exportPassword.length < 8) {
      setError("Export password must be at least 8 characters.");
      return;
    }
    if (exportPassword !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const filePath = await save({
        defaultPath: `tokenly-export-${today}.tkly`,
        filters: [{ name: "Tokenly Export", extensions: ["tkly"] }],
      });

      if (!filePath) { setLoading(false); return; }

      await invoke("export_vault", {
        masterPassword: password,
        exportPassword,
        exportPath: filePath,
      });

      setSuccess(`Vault exported successfully. Keep the export password safe — it cannot be recovered.`);
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
        Choose a separate export password. This password encrypts the backup file independently of your master password. You will need it to import on another machine.
      </p>

      <label className="field-label">Export password</label>
      <input
        type="password"
        className="field-input"
        value={exportPassword}
        onChange={(e) => setExportPassword(e.target.value)}
        placeholder="Min. 8 characters"
      />

      <label className="field-label">Confirm export password</label>
      <input
        type="password"
        className="field-input"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="Re-enter export password"
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
          lineHeight: 1.6
        }}>
          ✓ {success}
        </div>
      )}

      <button
        className="btn-primary"
        onClick={handleExport}
        disabled={loading || !exportPassword || !confirm}
      >
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

    if (!exportPassword) {
      setError("Enter the export password used when this file was created.");
      return;
    }

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
    } catch (e: any) {
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
        Select a <code style={{ fontFamily: "monospace" }}>.tkly</code> export file and enter the password used when it was created. Credentials with matching names will be skipped.
      </p>

      <label className="field-label">Export password</label>
      <input
        type="password"
        className="field-input"
        value={exportPassword}
        onChange={(e) => setExportPassword(e.target.value)}
        placeholder="Password used during export"
      />

      {error && <div className="error-box">{error}</div>}

      {result && (
        <div style={{
          background: "var(--bg-secondary)",
          border: "1px solid var(--border)",
          borderLeft: "3px solid var(--accent)",
          borderRadius: 7,
          padding: "10px 14px",
          fontSize: 12,
          color: "var(--text-primary)",
          marginBottom: 14,
          lineHeight: 1.8
        }}>
          ✓ Import complete.<br />
          <strong>{result.imported}</strong> credential{result.imported !== 1 ? "s" : ""} imported.<br />
          {result.skipped > 0 && (
            <span style={{ color: "var(--text-secondary)" }}>
              {result.skipped} skipped — already exist by name.
            </span>
          )}
        </div>
      )}

      <button
        className="btn-primary"
        onClick={handleImport}
        disabled={loading || !exportPassword}
      >
        {loading ? "Importing..." : "Choose file and import"}
      </button>
    </div>
  );
}