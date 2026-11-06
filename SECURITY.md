# Security Policy

Tokenly is a credential vault, so security reports are the most valuable contribution you can make. Thank you for helping keep it safe.

## Supported versions

Only the latest release receives security fixes.

| Version | Supported |
|---|---|
| 1.0.x (latest) | ✅ |
| Older | ❌ |

## Reporting a vulnerability

**Please do not open a public issue, discussion, or pull request for security vulnerabilities.** Issues are public the moment they're posted.

Report privately through GitHub:

1. Go to the **[Security tab](https://github.com/MeShivsai/Tokenly/security)** of this repository.
2. Click **Report a vulnerability**.
3. Fill in the form. Only the maintainer can see it.

### What to include

- A description of the vulnerability and its impact
- The Tokenly version and OS
- Steps to reproduce, or a proof of concept
- Any suggested fix, if you have one

**Don't include real credentials or real vault files.** Create a test vault with fake data to demonstrate the issue.

## What to expect

Tokenly is maintained by one person, so these timelines are realistic rather than corporate:

| Step | Target |
|---|---|
| Acknowledge your report | within 5 days |
| Initial assessment (confirmed, needs more info, or not a vulnerability) | within 14 days |
| Fix released for confirmed issues | depends on severity; critical issues are prioritized above all other work |

Disclosure is coordinated. Once a fix is released, a GitHub Security Advisory is published, and you're credited unless you'd rather stay anonymous. Please give us a reasonable window to ship a fix before disclosing publicly.

There is no paid bug bounty.

## Scope

**In scope:**

- Encryption and key derivation (`src-tauri/src/crypto.rs`)
- Vault file handling, export and import (`src-tauri/src/vault.rs`)
- The IPC surface between the frontend and backend (`src-tauri/src/lib.rs`)
- Clipboard handling, auto-lock and unlock throttling
- Anything that causes secrets to be written to disk unencrypted, shown on screen unexpectedly, or sent off the machine
- Anything that causes vault data loss or corruption

**Out of scope:**

- Attacks that require malware or a debugger already running as your user while the vault is unlocked
- Physical access to an unlocked, unattended machine
- Social engineering

**Known limitations** are documented in the [wiki](https://github.com/MeShivsai/Tokenly/wiki#known-limitations-v101). Reports on those are still welcome if you can show a worse impact than described, or a practical exploit.

## Security model

For how Tokenly encrypts data (Argon2id + AES-256-GCM) and what it does and doesn't protect against, see the [Security model](https://github.com/MeShivsai/Tokenly/wiki#security-model) section of the wiki.
