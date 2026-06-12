mod crypto;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn test_encryption(password: &str, plaintext: &str) -> Result<String, String> {
    let encrypted = crypto::encrypt(plaintext, password)?;
    let decrypted = crypto::decrypt(&encrypted, password)?;
    Ok(format!(
        "Encrypted: {}...\nDecrypted: {}",
        &encrypted[..20],
        decrypted
    ))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![greet, test_encryption])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}