# Tokenly — Secure Local Credential Vault

**Developed by:** Shivsai Anantwar  
**Website:** bitsandbooks.in  
**Built:** May–June 2026  
**Version:** 1.0.0  

---

## What is Tokenly?

Tokenly is a lightweight desktop application that helps developers, QA engineers, and DevOps teams store credentials — Personal Access Tokens, API keys, database passwords, and other secrets — securely on their local machine.

The core problem Tokenly solves: most SDLC teams store credentials in Notepad or plain text files. These are exposed during screen sharing, recordings, and pair programming. Tokenly ensures credential values are never visible on screen.

---

## Key Features

- Local-only — zero network calls, zero cloud dependency, ever
- AES-256-GCM encryption with Argon2id key derivation
- Values never shown on screen — copy to clipboard only
- 30-second auto-clear clipboard after copy
- Hold-to-reveal — release to hide immediately
- Auto-lock after configurable inactivity timeout
- Master password lockout after 3 wrong attempts
- Encrypted export and import (.tkly format)
- OS-aware theme — light on light mode, dark on dark mode
- Cross-platform — Windows and macOS

## Screenshots

### Dashboard
![Tokenly Dashboard](docs/Tokenly%20Dashboard.png)

### Lock Screen
![Tokenly Lock Screen](docs/Tokenly%20Lockscreen.png)

### First-Time Setup
![Tokenly Setup](docs/Tokenly%20Setup%20screen%20with%20warning.png)

---
---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop runtime | Tauri 2.x |
| Backend | Rust |
| Encryption | AES-256-GCM (aes-gcm crate) |
| Key derivation | Argon2id (argon2 crate) |
| Frontend | React 18 + TypeScript |
| Styling | Tailwind CSS |

---

## Project Structure
tokenly/

├── src/                    # React frontend

│   ├── App.tsx             # Auth screens (setup, lock)

│   ├── Dashboard.tsx       # Main credential table

│   ├── AddCredential.tsx   # Add/edit modal

│   ├── Settings.tsx        # Settings panel

│   ├── types.ts            # TypeScript types

│   └── App.css             # OS-aware theme

├── src-tauri/              # Rust backend

│   ├── src/

│   │   ├── lib.rs          # Tauri commands

│   │   ├── crypto.rs       # AES-256-GCM + Argon2id

│   │   └── vault.rs        # Vault file I/O + CRUD

│   └── Cargo.toml          # Rust dependencies

└── README.md

---

## Build

```bash
# Development
npm install
npm run tauri dev

# Production (Windows)
npm run tauri build
# Output: src-tauri/target/release/bundle/msi/Tokenly_1.0.0_x64_en-US.msi
```

---

## Security

- Vault stored at `~/.tokenly/vault.enc`
- Master password never stored — Argon2id derived key in memory only
- AES-256-GCM authenticated encryption — detects tampering
- Zero network calls — verified via netstat during runtime
- Auto-lock clears decrypted data from memory immediately

---

## License

MIT License — Copyright (c) 2026 Shivsai Anantwar

This project is open source. You are free to use, modify, and distribute 
this software, provided the copyright notice and this permission notice 
are included in all copies. See the LICENSE file for full terms.

---

Built by [Shivsai Anantwar](https://bitsandbooks.in) to solve a real 
problem observed across SDLC teams — credentials exposed during screen 
sharing. If this helps you or your team, give it a ⭐ and share it.