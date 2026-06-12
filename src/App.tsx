import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./App.css";

// ── Types ──────────────────────────────────────────────────
type Screen = "loading" | "setup" | "locked" | "dashboard";

// ── Main App ───────────────────────────────────────────────
function App() {
  const [screen, setScreen] = useState<Screen>("loading");

  useEffect(() => {
    checkVault();
  }, []);

  async function checkVault() {
    const exists = await invoke<boolean>("vault_exists");
    setScreen(exists ? "locked" : "setup");
  }

  return (
    <div className="min-h-screen bg-[#0F1117] text-white flex items-center justify-center">
      {screen === "loading" && <LoadingScreen />}
      {screen === "setup" && <SetupScreen onComplete={() => setScreen("locked")} />}
      {screen === "locked" && <LockScreen onUnlock={() => setScreen("dashboard")} />}
      {screen === "dashboard" && <DashboardPlaceholder onLock={() => setScreen("locked")} />}
    </div>
  );
}

// ── Loading Screen ─────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-[#6C63FF] border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400 text-sm">Starting Tokenly...</p>
    </div>
  );
}

// ── Setup Screen ───────────────────────────────────────────
function SetupScreen({ onComplete }: { onComplete: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function getStrength(p: string): { label: string; color: string; width: string } {
    if (p.length === 0) return { label: "", color: "", width: "w-0" };
    if (p.length < 8) return { label: "Too short", color: "bg-red-500", width: "w-1/4" };
    if (p.length < 12) return { label: "Weak", color: "bg-orange-500", width: "w-2/4" };
    if (p.length < 16) return { label: "Good", color: "bg-yellow-500", width: "w-3/4" };
    return { label: "Strong", color: "bg-[#00D4AA]", width: "w-full" };
  }

  const strength = getStrength(password);

  async function handleSetup() {
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
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
    <div className="w-full max-w-md px-6">
      <div className="text-center mb-10">
        <h1 className="text-5xl font-bold text-[#6C63FF] tracking-tight">Tokenly</h1>
        <p className="text-gray-400 mt-2 text-sm">Your tokens. Masked. Local. Always.</p>
      </div>

      <div className="bg-[#1A1B26] rounded-2xl p-8 border border-[#2D2B55]">
        <h2 className="text-lg font-semibold text-white mb-1">Create Master Password</h2>
        <p className="text-gray-400 text-sm mb-6">
          This password encrypts your vault. It is never stored. If you lose it, your vault cannot be recovered.
        </p>

        <div className="mb-4">
          <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">
            Master Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
            className="w-full bg-[#0F1117] border border-[#2D2B55] rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#6C63FF] transition-colors"
          />
          {password.length > 0 && (
            <div className="mt-2">
              <div className="h-1 bg-[#2D2B55] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`} />
              </div>
              <p className={`text-xs mt-1 ${strength.color.replace("bg-", "text-")}`}>
                {strength.label}
              </p>
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">
            Confirm Password
          </label>
          <input
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter password"
            className="w-full bg-[#0F1117] border border-[#2D2B55] rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#6C63FF] transition-colors"
          />
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          onClick={handleSetup}
          disabled={loading}
          className="w-full bg-[#6C63FF] hover:bg-[#5A52E0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-sm"
        >
          {loading ? "Creating vault..." : "Create Vault"}
        </button>
      </div>
    </div>
  );
}

// ── Lock Screen ────────────────────────────────────────────
function LockScreen({ onUnlock }: { onUnlock: () => void }) {
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
      await invoke("unlock_vault", { password });
      onUnlock();
    } catch {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        const until = Date.now() + 3 * 60 * 1000;
        setLockedUntil(until);
        setCountdown(180);
        setError("Too many attempts. Locked for 3 minutes.");
      } else {
        setError(`Wrong password. ${3 - newAttempts} attempt${3 - newAttempts === 1 ? "" : "s"} remaining.`);
      }
    } finally {
      setLoading(false);
      setPassword("");
    }
  }

  const isLocked = !!lockedUntil;

  return (
    <div className="w-full max-w-md px-6">
      <div className="text-center mb-10">
        <div className="w-16 h-16 bg-[#6C63FF]/10 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-[#6C63FF]/30">
          <span className="text-3xl">🔒</span>
        </div>
        <h1 className="text-4xl font-bold text-[#6C63FF] tracking-tight">Tokenly</h1>
        <p className="text-gray-400 mt-2 text-sm">Enter your master password to unlock</p>
      </div>

      <div className="bg-[#1A1B26] rounded-2xl p-8 border border-[#2D2B55]">
        {isLocked ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/30">
              <span className="text-2xl">🚫</span>
            </div>
            <p className="text-red-400 font-semibold mb-1">Vault Locked</p>
            <p className="text-gray-400 text-sm">Too many failed attempts.</p>
            <div className="mt-4 bg-[#0F1117] rounded-lg px-6 py-4 border border-[#2D2B55]">
              <p className="text-3xl font-bold text-white font-mono">
                {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, "0")}
              </p>
              <p className="text-gray-500 text-xs mt-1">until unlock</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <label className="text-xs text-gray-400 uppercase tracking-widest mb-2 block">
                Master Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                placeholder="Enter master password"
                autoFocus
                className="w-full bg-[#0F1117] border border-[#2D2B55] rounded-lg px-4 py-3 text-white text-sm placeholder-gray-600 focus:outline-none focus:border-[#6C63FF] transition-colors"
              />
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              onClick={handleUnlock}
              disabled={loading || !password}
              className="w-full bg-[#6C63FF] hover:bg-[#5A52E0] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {loading ? "Unlocking..." : "Unlock Vault"}
            </button>

            {attempts > 0 && (
              <div className="flex justify-center gap-2 mt-4">
                {[0, 1, 2].map((i) => (
                  <div key={i} className={`w-2 h-2 rounded-full ${i < attempts ? "bg-red-500" : "bg-[#2D2B55]"}`} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ── Dashboard Placeholder ──────────────────────────────────
function DashboardPlaceholder({ onLock }: { onLock: () => void }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-[#6C63FF]">Tokenly</h1>
        <p className="text-[#00D4AA] mt-2 text-sm font-medium">Vault Unlocked</p>
      </div>
      <div className="bg-[#1A1B26] rounded-2xl p-8 border border-[#2D2B55] text-center max-w-sm">
        <p className="text-gray-400 text-sm mb-6">Dashboard coming in Phase 5.</p>
        <button
          onClick={onLock}
          className="bg-[#2D2B55] hover:bg-[#3D3B65] text-white text-sm font-semibold px-6 py-2 rounded-lg transition-colors"
        >
          Lock Vault
        </button>
      </div>
    </div>
  );
}

export default App;