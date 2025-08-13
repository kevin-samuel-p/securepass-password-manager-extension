// Minimal vault structure: { [host]: { username, password, updatedAt } }
async function loadVault() {
  return new Promise(res => chrome.storage.local.get('vault', r => res(r.vault || {})));
}
async function saveVault(vault) {
  return new Promise(res => chrome.storage.local.set({ vault }, res));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    if (msg.type === 'SP_GET_CREDS') {
      const vault = await loadVault();
      sendResponse(vault[msg.host] || null);
    }

    if (msg.type === 'SP_SAVE_CREDS') {
      const vault = await loadVault();
      vault[msg.host] = {
        username: msg.username,
        password: msg.password,
        updatedAt: Date.now()
      };
      await saveVault(vault);
      sendResponse({ ok: true });
    }
  })();
  return true; // keep channel open for async
});
