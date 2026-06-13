import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Credential } from "./types";
import Dashboard from "./Dashboard";
import "./App.css";

type Screen = "loading" | "setup" | "locked" | "dashboard";

function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [password, setPassword] = useState("");
  const [credentials, setCredentials] = useState<Credential[]>([]);

  useEffect(() => { checkVault(); }, []);

  async function checkVault() {
    const exists = await invoke<boolean>("vault_exists");
    setScreen(exists ? "locked" : "setup");
  }

  async function handleUnlock(pwd: string) {
    const creds = await invoke<Credential[]>("unlock_vault", { password: pwd });
    setPassword(pwd);
    setCredentials(creds);
    setScreen("dashboard");
  }

  function handleLock() {
    setPassword("");
    setCredentials([]);
    setScreen("locked");
  }

  if (screen === "loading") return (
    <div className="auth-wrap">
      <div style={{ textAlign: "center", color: "var(--text-secondary)", fontSize: 13 }}>
        Starting Tokenly...
      </div>
    </div>
  );

  if (screen === "setup") return <SetupScreen onComplete={() => setScreen("locked")} />;
  if (screen === "locked") return <LockScreen onUnlock={handleUnlock} />;
  if (screen === "dashboard") return (
    <Dashboard
      password={password}
      credentials={credentials}
      onLock={handleLock}
      onCredsChange={setCredentials}
      onPasswordChange={(newPwd) => {
        setPassword(newPwd);
      }}
    />
  );

  return null;
}

function SetupScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function strengthInfo(p: string): { width: string; color: string; label: string } {
    if (p.length === 0) return { width: "0%", color: "transparent", label: "" };
    if (p.length < 8) return { width: "20%", color: "var(--danger)", label: "Too short" };
    if (p.length < 12) return { width: "45%", color: "#E3B341", label: "Weak" };
    if (p.length < 16) return { width: "70%", color: "#2EA043", label: "Good" };
    return { width: "100%", color: "var(--accent)", label: "Strong" };
  }

  const str = strengthInfo(password);

  async function handleSetup() {
    setError("");
    if (password.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (password !== confirm) { setError("Passwords do not match."); return; }
    setLoading(true);
    try {
      await invoke("init_vault", { password });
      onComplete();
    } catch (e: any) {
      setError(e.toString());
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">TOK<span>●</span>NLY</div>
        <div className="auth-tagline">Your tokens. Masked. Local. Always.</div>

        <p style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 500, marginBottom: 4 }}>
          Create master password
        </p>
        <p style={{ fontSize: 12, color: "var(--text-secondary)", marginBottom: 20 }}>
          This password encrypts your vault. It is never stored anywhere. Losing it means losing access permanently.
        </p>

        <label className="field-label">Master password</label>
        <input
          type="password"
          className="field-input"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Min. 8 characters"
        />
        {password.length > 0 && (
          <div style={{ marginTop: -10, marginBottom: 14 }}>
            <div className="strength-bar-wrap">
              <div className="strength-bar" style={{ width: str.width, background: str.color }} />
            </div>
            <span style={{ fontSize: 11, color: str.color }}>{str.label}</span>
          </div>
        )}

        <label className="field-label">Confirm password</label>
        <input
          type="password"
          className="field-input"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="Re-enter password"
        />

        {error && <div className="error-box">{error}</div>}

        <button className="btn-primary" onClick={handleSetup} disabled={loading}>
          {loading ? "Creating vault..." : "Create vault"}
        </button>
      </div>
    </div>
  );
}

function LockScreen({ onUnlock }: { onUnlock: (pwd: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!lockedUntil) return;
    const interval = setInterval(() => {
      const remaining = Math.ceil((lockedUntil - Date.now()) / 1000);
      if (remaining <= 0) {
        setLockedUntil(null);
        setAttempts(0);
        setCountdown(0);
        setError("");
      } else {
        setCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockedUntil]);

  async function handleUnlock() {
    if (lockedUntil) return;
    setError("");
    setLoading(true);
    try {
      await onUnlock(password);
    } catch {
      const n = attempts + 1;
      setAttempts(n);
      if (n >= 3) {
        setLockedUntil(Date.now() + 3 * 60 * 1000);
        setCountdown(180);
        setError("Too many attempts. Vault locked for 3 minutes.");
      } else {
        setError(`Wrong password. ${3 - n} attempt${3 - n === 1 ? "" : "s"} remaining.`);
      }
    } finally {
      setLoading(false);
      setPassword("");
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">TOK<span>●</span>NLY</div>
        <div className="auth-tagline">Enter master password to unlock vault</div>

        {lockedUntil ? (
          <div className="lockout-box">
            <div className="error-box">Too many failed attempts.</div>
            <div className="lockout-timer">
              {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
            </div>
            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 8 }}>
              until vault unlocks
            </p>
          </div>
        ) : (
          <>
            <label className="field-label">Master password</label>
            <input
              type="password"
              className="field-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              placeholder="Enter master password"
              autoFocus
            />
            {error && <div className="error-box">{error}</div>}
            <button
              className="btn-primary"
              onClick={handleUnlock}
              disabled={loading || !password}
            >
              {loading ? "Unlocking..." : "Unlock vault"}
            </button>
            {attempts > 0 && (
              <div className="attempt-dots">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`dot${i < attempts ? " used" : ""}`} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default App;