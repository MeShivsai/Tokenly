import { useState } from "react";
import { Credential, CATEGORIES } from "./types";

interface Props {
  password: string;
  onSave: (cred: Omit<Credential, "id" | "created_at" | "last_copied">) => void;
  onCancel: () => void;
  existing?: Credential;
}

export default function AddCredential({ onSave, onCancel, existing }: Props) {
  const [name, setName] = useState(existing?.name ?? "");
  const [username, setUsername] = useState(existing?.username ?? "");
  const [value, setValue] = useState(existing?.value ?? "");
  const [category, setCategory] = useState(existing?.category ?? "Other");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [expiry, setExpiry] = useState(existing?.expiry_date ?? "");
  const [showValue, setShowValue] = useState(false);
  const [error, setError] = useState("");

  function handleSave() {
    setError("");
    if (!name.trim()) { setError("Name is required."); return; }
    if (!value.trim()) { setError("Value is required."); return; }
    onSave({
      name: name.trim(),
      username: username.trim() || null,
      value: value.trim(),
      category,
      notes: notes.trim(),
      expiry_date: expiry || null,
    });
  }

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-title">{existing ? "Edit credential" : "Add credential"}</div>

        <label className="field-label">Name <span style={{ color: "var(--danger)" }}>*</span></label>
        <input
          type="text"
          className="field-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. GitHub PAT - Prod"
          maxLength={100}
        />

        <label className="field-label">Username <span style={{ color: "var(--text-muted)" }}>(optional)</span></label>
        <input
          type="text"
          className="field-input"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="e.g. shivsai_srv"
          maxLength={200}
        />

        <label className="field-label">Secret / Token / Password <span style={{ color: "var(--danger)" }}>*</span></label>
        <div className="reveal-wrap">
          <input
            type={showValue ? "text" : "password"}
            className="field-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Paste your token or password"
            style={{ paddingRight: 56 }}
          />
          <button
            className="reveal-btn"
            onMouseDown={() => setShowValue(true)}
            onMouseUp={() => setShowValue(false)}
            onMouseLeave={() => setShowValue(false)}
          >
            {showValue ? "Hide" : "Show"}
          </button>
        </div>

        <label className="field-label">Category</label>
        <select
          className="field-input"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <label className="field-label">Notes <span style={{ color: "var(--text-muted)" }}>(optional)</span></label>
        <input
          type="text"
          className="field-input"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Expires Dec 2026"
          maxLength={200}
        />

        <label className="field-label">Expiry date <span style={{ color: "var(--text-muted)" }}>(optional)</span></label>
        <input
          type="date"
          className="field-input"
          value={expiry}
          onChange={(e) => setExpiry(e.target.value)}
        />

        {error && <div className="error-box">{error}</div>}

        <div className="modal-actions">
          <button className="btn-cancel" onClick={onCancel}>Cancel</button>
          <button className="btn-save" onClick={handleSave}>
            {existing ? "Save changes" : "Add credential"}
          </button>
        </div>
      </div>
    </div>
  );
}