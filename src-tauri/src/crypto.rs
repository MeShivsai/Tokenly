use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Key, Nonce,
};
use argon2::Argon2;
use rand::RngCore;
use base64::{Engine as _, engine::general_purpose};

// Derive a 256-bit encryption key from master password + salt
pub fn derive_key(password: &str, salt: &[u8]) -> Result<[u8; 32], String> {
    let mut key = [0u8; 32];
    Argon2::default()
        .hash_password_into(password.as_bytes(), salt, &mut key)
        .map_err(|e| format!("Key derivation failed: {}", e))?;
    Ok(key)
}

// Generate a random 16-byte salt
pub fn generate_salt() -> [u8; 16] {
    let mut salt = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut salt);
    salt
}

// Encrypt plaintext with AES-256-GCM
// Returns base64(salt + nonce + ciphertext)
pub fn encrypt(plaintext: &str, password: &str) -> Result<String, String> {
    // Generate fresh salt and derive key
    let salt = generate_salt();
    let key_bytes = derive_key(password, &salt)?;

    // Build cipher
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);

    // Generate random 12-byte nonce
    let mut nonce_bytes = [0u8; 12];
    rand::thread_rng().fill_bytes(&mut nonce_bytes);
    let nonce = Nonce::from_slice(&nonce_bytes);

    // Encrypt
    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption failed: {}", e))?;

    // Pack: salt(16) + nonce(12) + ciphertext
    let mut packed = Vec::with_capacity(16 + 12 + ciphertext.len());
    packed.extend_from_slice(&salt);
    packed.extend_from_slice(&nonce_bytes);
    packed.extend_from_slice(&ciphertext);

    // Return as base64 string
    Ok(general_purpose::STANDARD.encode(&packed))
}

// Decrypt base64 blob back to plaintext
pub fn decrypt(encrypted_b64: &str, password: &str) -> Result<String, String> {
    // Decode base64
    let packed = general_purpose::STANDARD
        .decode(encrypted_b64)
        .map_err(|_| "Invalid vault format".to_string())?;

    // Must be at least salt(16) + nonce(12) + tag(16) = 44 bytes
    if packed.len() < 44 {
        return Err("Vault data too short — corrupted".to_string());
    }

    // Unpack
    let salt = &packed[0..16];
    let nonce_bytes = &packed[16..28];
    let ciphertext = &packed[28..];

    // Derive key from password + stored salt
    let key_bytes = derive_key(password, salt)?;
    let key = Key::<Aes256Gcm>::from_slice(&key_bytes);
    let cipher = Aes256Gcm::new(key);
    let nonce = Nonce::from_slice(nonce_bytes);

    // Decrypt — fails if password wrong or data tampered
    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|_| "Wrong password or corrupted vault".to_string())?;

    String::from_utf8(plaintext)
        .map_err(|_| "Decrypted data is not valid UTF-8".to_string())
}