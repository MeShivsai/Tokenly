use std::fs;
use std::path::PathBuf;
use serde::{Deserialize, Serialize};
use crate::crypto;

// ── Data Structures ────────────────────────────────────────

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Credential {
    pub id: String,
    pub name: String,
    pub username: Option<String>,
    pub value: String,
    pub category: String,
    pub notes: String,
    pub expiry_date: Option<String>,
    pub created_at: String,
    pub last_copied: Option<String>,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct Vault {
    pub version: u32,
    pub credentials: Vec<Credential>,
}

impl Vault {
    pub fn new() -> Self {
        Vault {
            version: 1,
            credentials: Vec::new(),
        }
    }
}

// ── Vault File Path ────────────────────────────────────────

pub fn vault_path() -> Result<PathBuf, String> {
    let home = dirs::home_dir()
        .ok_or("Cannot locate home directory".to_string())?;
    let tokenly_dir = home.join(".tokenly");

    if !tokenly_dir.exists() {
        fs::create_dir_all(&tokenly_dir)
            .map_err(|e| format!("Failed to create .tokenly directory: {}", e))?;
    }

    Ok(tokenly_dir.join("vault.enc"))
}

// ── Vault Exists Check ─────────────────────────────────────

pub fn vault_exists() -> bool {
    vault_path().map(|p| p.exists()).unwrap_or(false)
}

// ── Initialize New Vault ───────────────────────────────────

pub fn init_vault(password: &str) -> Result<(), String> {
    let vault = Vault::new();
    write_vault(&vault, password)
}

// ── Read + Decrypt Vault ───────────────────────────────────

pub fn read_vault(password: &str) -> Result<Vault, String> {
    let path = vault_path()?;

    if !path.exists() {
        return Err("Vault file not found".to_string());
    }

    let encrypted = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read vault file: {}", e))?;

    let decrypted = crypto::decrypt(&encrypted, password)?;

    serde_json::from_str(&decrypted)
        .map_err(|e| format!("Failed to parse vault: {}", e))
}

// ── Encrypt + Write Vault ──────────────────────────────────

pub fn write_vault(vault: &Vault, password: &str) -> Result<(), String> {
    let path = vault_path()?;

    let json = serde_json::to_string(vault)
        .map_err(|e| format!("Failed to serialize vault: {}", e))?;

    let encrypted = crypto::encrypt(&json, password)?;

    fs::write(&path, encrypted)
        .map_err(|e| format!("Failed to write vault file: {}", e))?;

    Ok(())
}

// ── CRUD Operations ────────────────────────────────────────

pub fn add_credential(
    password: &str,
    credential: Credential,
) -> Result<(), String> {
    let mut vault = read_vault(password)?;
    vault.credentials.push(credential);
    write_vault(&vault, password)
}

pub fn update_credential(
    password: &str,
    updated: Credential,
) -> Result<(), String> {
    let mut vault = read_vault(password)?;
    let pos = vault.credentials.iter().position(|c| c.id == updated.id)
        .ok_or("Credential not found".to_string())?;
    vault.credentials[pos] = updated;
    write_vault(&vault, password)
}

pub fn delete_credential(
    password: &str,
    credential_id: &str,
) -> Result<(), String> {
    let mut vault = read_vault(password)?;
    vault.credentials.retain(|c| c.id != credential_id);
    write_vault(&vault, password)
}

pub fn update_last_copied(
    password: &str,
    credential_id: &str,
    timestamp: &str,
) -> Result<(), String> {
    let mut vault = read_vault(password)?;
    if let Some(cred) = vault.credentials.iter_mut().find(|c| c.id == credential_id) {
        cred.last_copied = Some(timestamp.to_string());
    }
    write_vault(&vault, password)
}

// ── Export Vault ───────────────────────────────────────────

pub fn export_vault(
    master_password: &str,
    export_password: &str,
    export_path: &str,
) -> Result<(), String> {
    let vault = read_vault(master_password)?;

    let json = serde_json::to_string(&vault)
        .map_err(|e| format!("Failed to serialize vault: {}", e))?;

    let encrypted = crypto::encrypt(&json, export_password)?;

    std::fs::write(export_path, encrypted)
        .map_err(|e| format!("Failed to write export file: {}", e))?;

    Ok(())
}

// ── Import Vault ───────────────────────────────────────────

pub struct ImportResult {
    pub imported: usize,
    pub skipped: usize,
}

pub fn import_vault(
    master_password: &str,
    export_password: &str,
    import_path: &str,
) -> Result<ImportResult, String> {
    let encrypted = std::fs::read_to_string(import_path)
        .map_err(|e| format!("Failed to read import file: {}", e))?;

    let decrypted = crypto::decrypt(&encrypted, export_password)
        .map_err(|_| "Wrong export password or invalid file.".to_string())?;

    let imported_vault: Vault = serde_json::from_str(&decrypted)
        .map_err(|_| "Invalid export file format.".to_string())?;

    let mut current_vault = read_vault(master_password)?;

    let mut imported = 0;
    let mut skipped = 0;

    for cred in imported_vault.credentials {
        let exists = current_vault.credentials
            .iter()
            .any(|c| c.name.to_lowercase() == cred.name.to_lowercase());

        if exists {
            skipped += 1;
        } else {
            current_vault.credentials.push(cred);
            imported += 1;
        }
    }

    write_vault(&current_vault, master_password)?;

    Ok(ImportResult { imported, skipped })
}