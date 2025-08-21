let pendingCreds = null;

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg.action === "pendingCreds") {
    pendingCreds = msg.data;

    // Wait for next page load to inject dialog
    chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
      if (changeInfo.status === "complete" && pendingCreds) {
        chrome.scripting.executeScript({
          target: { tabId },
          func: showDialog,
          args: [pendingCreds]
        });
        chrome.tabs.onUpdated.removeListener(listener);
      }
    });
  } else if (msg.action === "saveCreds") {
    chrome.storage.local.get(["passwords"], (result) => {
      const passwords = result.passwords || [];
      passwords.push({
        site: msg.data.site,
        username: msg.data.username,
        password: msg.data.password
      });
      chrome.storage.local.set({passwords}, () => {
        console.log("Credentials saved:" , msg.data);
      });
    });
    pendingCreds = null;
  } else if (msg.action === "discardCreds") {
    console.log("Credentials discarded:", pendingCreds);
    pendingCreds = null;
  }
});

function showDialog(creds) {
  // Avoid duplicates
  if (document.getElementById("securepass-dialog")) return;

  const dialog = document.createElement("div");
  dialog.id = "securepass-dialog";
  dialog.style.position = "fixed";
  dialog.style.top = "20px";
  dialog.style.right = "20px";
  dialog.style.zIndex = "999999";
  dialog.style.background = "#fff";
  dialog.style.border = "1px solid #ccc";
  dialog.style.padding = "15px";
  dialog.style.borderRadius = "12px";
  dialog.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
  dialog.style.fontFamily = "sans-serif";
  dialog.style.minWidth = "260px";

  dialog.innerHTML = `
    <div class="sp-title" style="font-size:16px; font-weight:600; margin-bottom:6px;">
      Save credentials to SecurePass?
    </div>
    <div class="sp-muted" style="margin-bottom:8px; color:#64748b; font-size:13px;">
      ${creds.site}
    </div>
    <div class="sp-row sp-muted" style="margin-bottom:4px; font-size:14px; color:#475569;">
      <strong style="min-width:80px; display:inline-block; color:#0f172a">Username</strong> 
      ${creds.username}
    </div>
    <div class="sp-row sp-muted" style="margin-bottom:6px; font-size:14px; color:#475569;">
      <strong style="min-width:80px; display:inline-block; color:#0f172a">Password</strong> 
      ${"•".repeat(creds.password.length)}
    </div>
    <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:12px;">
      <button id="securepass-save" class="sp-btn sp-primary" 
        style="background:#2563eb; color:#fff; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">
        Save
      </button>
      <button id="securepass-discard" class="sp-btn sp-ghost" 
        style="background:#f1f5f9; color:#0f172a; border:none; padding:6px 12px; border-radius:6px; cursor:pointer;">
        Discard
      </button>
    </div>
  `;

  document.body.appendChild(dialog);

  // Wire up buttons
  dialog.querySelector("#securepass-save").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "saveCreds", data: creds });
    dialog.remove();
  });
  dialog.querySelector("#securepass-discard").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "discardCreds" });
    dialog.remove();
  });
}
