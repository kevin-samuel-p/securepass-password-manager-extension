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
    // TODO: Save creds securely to chrome.storage.local or your password vault
    pendingCreds = null;
  } else if (msg.action === "discardCreds") {
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
  dialog.style.borderRadius = "8px";
  dialog.style.boxShadow = "0 4px 12px rgba(0,0,0,0.2)";
  dialog.innerHTML = `
    <strong>Save this login?</strong><br>
    <em>${creds.site}</em><br>
    Username: ${creds.username}<br>
    Password: ${"*".repeat(creds.password.length)}<br><br>
    <button id="securepass-save">Save</button>
    <button id="securepass-discard">Discard</button>
  `;

  document.body.appendChild(dialog);

  document.getElementById("securepass-save").onclick = () => {
    chrome.runtime.sendMessage({ action: "saveCreds", data: creds });
    dialog.remove();
  };
  document.getElementById("securepass-discard").onclick = () => {
    chrome.runtime.sendMessage({ action: "discardCreds" });
    dialog.remove();
  };
}
