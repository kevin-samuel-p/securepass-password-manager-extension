let vault = {};
let unlocked = false;
let key = null;

chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === "unlockVault") {
    key = await deriveKey(msg.master);
    const stored = await chrome.storage.local.get("vault");

    if (stored.vault) {
      try {
        vault = JSON.parse(await decrypt(stored.vault, key));
        unlocked = true;
        console.log("Vault unlocked.");
      } catch {
        alert("Incorrect master password.");
      }
    } else {
      vault = {};
      unlocked = true;
      console.log("New vault created.");
    }
  }

  if (msg.type === "savePassword" && unlocked) {
    vault[msg.domain] = msg.password;
    const encrypted = await encrypt(JSON.stringify(vault), key);
    await chrome.storage.local.set({ vault: encrypted });
    console.log("Password saved for", msg.domain);
  }
});
