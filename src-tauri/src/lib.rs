mod crypto;
mod vault;

use vault::Credential;
use serde::Serialize;

#[derive(Serialize)]
struct ImportResult {
    imported: usize,
    skipped: usize,
}

#[tauri::command]
fn vault_exists() -> bool {
    vault::vault_exists()
}

#[tauri::command]
fn init_vault(password: &str) -> Result<(), String> {
    vault::init_vault(password)
}

#[tauri::command]
fn unlock_vault(password: &str) -> Result<Vec<Credential>, String> {
    let v = vault::read_vault(password)?;
    Ok(v.credentials)
}

#[tauri::command]
fn add_credential(password: &str, credential: Credential) -> Result<(), String> {
    vault::add_credential(password, credential)
}

#[tauri::command]
fn update_credential(password: &str, credential: Credential) -> Result<(), String> {
    vault::update_credential(password, credential)
}

#[tauri::command]
fn delete_credential(password: &str, credential_id: &str) -> Result<(), String> {
    vault::delete_credential(password, credential_id)
}

#[tauri::command]
fn update_last_copied(
    password: &str,
    credential_id: &str,
    timestamp: &str,
) -> Result<(), String> {
    vault::update_last_copied(password, credential_id, timestamp)
}

#[tauri::command]
fn export_vault(
    master_password: &str,
    export_password: &str,
    export_path: &str,
) -> Result<(), String> {
    vault::export_vault(master_password, export_password, export_path)
}

#[tauri::command]
fn import_vault(
    master_password: &str,
    export_password: &str,
    import_path: &str,
) -> Result<ImportResult, String> {
    let result = vault::import_vault(master_password, export_password, import_path)?;
    Ok(ImportResult {
        imported: result.imported,
        skipped: result.skipped,
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            vault_exists,
            init_vault,
            unlock_vault,
            add_credential,
            update_credential,
            delete_credential,
            update_last_copied,
            export_vault,
            import_vault,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application")
}