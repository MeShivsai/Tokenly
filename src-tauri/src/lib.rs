mod crypto;
mod vault;

use vault::Credential;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            vault_exists,
            init_vault,
            unlock_vault,
            add_credential,
            update_credential,
            delete_credential,
            update_last_copied,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}