let manageView, mainView;
let strengthInput, strengthResult, siteInput, userInput, passInput, masterPassInput;
let manageBtn, backBtn, saveBtn, unlockBtn, themeToggle;
let passwordList;

document.addEventListener("DOMContentLoaded", () => {
  themeToggle = document.getElementById("theme-toggle");
  strengthInput = document.getElementById("strength-input");
  strengthResult = document.getElementById("strength-result");

  manageBtn = document.getElementById("manage-btn");
  backBtn = document.getElementById("back-btn");
  mainView = document.getElementById("main-view");
  manageView = document.getElementById("manage-view");

  siteInput = document.getElementById("site-input");
  userInput = document.getElementById("user-input");
  passInput = document.getElementById("pass-input");
  saveBtn = document.getElementById("save-btn");
  passwordList = document.getElementById("password-list");

  unlockBtn = document.getElementById("unlock-btn");
  masterPassInput = document.getElementById("master-pass");

  // Theme toggle
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
  });

  // Password strength checker
  strengthInput.addEventListener("input", () => {
    const val = strengthInput.value;
    strengthResult.textContent = getStrengthText(val);
  });

  function getStrengthText(password) {
    if (!password) return "No password entered";
    if (password.length < 6) return "Weak";
    if (password.match(/[A-Z]/) && password.match(/[0-9]/) && password.match(/[^A-Za-z0-9]/)) {
      return "Strong";
    }
    return "Medium";
  }

  // Switch to Manage view
  manageBtn.addEventListener("click", () => {
    mainView.style.display = "none";
    document.getElementById("auth-view").style.display = "block";
  });

  // Back to main view
  backBtn.addEventListener("click", () => {
    manageView.style.display = "none";
    mainView.style.display = "block";
  });

  // Save password
  saveBtn.addEventListener("click", async () => {
    const site = siteInput.value.trim();
    const user = userInput.value.trim();
    const pass = passInput.value.trim();

    if (!site || !user || !pass) {
      alert("Please fill all fields");
      return;
    }

    const encryptedPass = await encryptData(pass);
    chrome.storage.local.get(["passwords"], (result) => {
      const passwords = result.passwords || [];
      passwords.push({ site, user, pass: encryptedPass });
      chrome.storage.local.set({ passwords }, () => {
        siteInput.value = "";
        userInput.value = "";
        passInput.value = "";
        loadPasswords();
      });
    });
  });

  // Load stored passwords
  async function loadPasswords() {
    try {
      const result = await chrome.storage.local.get(["passwords"]);
      const passwords = result.passwords || [];
      passwordList.innerHTML = "";

      if (passwords.length === 0) {
        passwordList.innerHTML = "<p class='muted'>No passwords saved</p>";
        return;
      }

      for (let [index, entry] of passwords.entries()) {
        const decryptedPass = await decryptData(entry.pass);
        const div = document.createElement("div");
        div.className = "password-entry";
        div.innerHTML = `
          <strong>${entry.site}</strong> - ${entry.user} - <em>${decryptedPass}</em>
          <button data-index="${index}" class="btn delete-btn">Delete</button>
        `;
        passwordList.appendChild(div);
      }

      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", (e) => {
          const idx = e.target.getAttribute("data-index");
          deletePassword(idx);
        });
      });
    } catch (err) {
      console.error("Error loading passwords:", err);
    }
  };

  // Delete password
  function deletePassword(index) {
    chrome.storage.local.get(["passwords"], (result) => {
      const passwords = result.passwords || [];
      passwords.splice(index, 1);
      chrome.storage.local.set({ passwords }, loadPasswords);
    });
  };

  unlockBtn.addEventListener("click", async () => {
    const masterPassword = masterPassInput.value.trim();
    if (!masterPassword) return alert("Enter a master password");

    encryptionKey = await deriveKey(masterPassword);
    masterPassInput.value = "";

    document.getElementById("auth-view").style.display = "none";
    manageView.style.display = "block";
    loadPasswords();
  })
});

let encryptionKey = null; // AES key for this session

// Convert string to ArrayBuffer
function str2buf(str) {
  return new TextEncoder().encode(str);
}

// Convert ArrayBuffer to Base64
function buf2b64(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

// Convert Base64 to ArrayBuffer
function b642buf(b64) {
  return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
}

// Derive AES key from master password
async function deriveKey(masterPassword) {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    str2buf(masterPassword),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: str2buf("passmanager-salt"),
      iterations: 100000,
      hash: "SHA-256"
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

// Encrypt a string
async function encryptData(text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = str2buf(text);

  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    encryptionKey,
    encoded
  );

  return { iv: buf2b64(iv), data: buf2b64(ciphertext) };
}

// Decrypt to string
async function decryptData(encryptedObj) {
  const iv = b642buf(encryptedObj.iv);
  const data = b642buf(encryptedObj.data);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    encryptionKey,
    data
  );

  return new TextDecoder().decode(decrypted);
}
