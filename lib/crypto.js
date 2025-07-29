async function deriveKey(password) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
        "raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveKey"]
    );

    return crypto.subtle.deriveKey({
        name: "PBKDF2",
        salt: enc.encode("salt123"),  // TODO: replace with random + stored salt
        iterations: 100000,
        hash: "SHA-256"
    }, keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

async function encrypt(data, key) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const enc = new TextEncoder().encode(data);
    const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc);
    return JSON.stringify({ iv: Array.from(iv), data: Array.from(new Uint8Array(ciphertext)) });
}

async function decrypt(json, key) {
    const obj = JSON.parse(json);
    const iv = new Uint8Array(obj.iv);
    const data = new Uint8Array(obj.data);
    const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, data);
    return new TextDecoder().decode(decrypted);
}
