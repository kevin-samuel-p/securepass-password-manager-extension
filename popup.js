document.getElementById("generate").onclick = () => {
  const length = 16;
  const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset.charAt(Math.floor(Math.random() * charset.length));
  }

  const passwordInput = document.getElementById("password");
  passwordInput.value = result;

  const score = zxcvbn(result).score;
  document.getElementById("strength").value = score;
};

document.getElementById("save").onclick = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const domain = new URL(tab.url).hostname;
  const password = document.getElementById("password").value;

  chrome.runtime.sendMessage({ type: "savePassword", domain, password });
};

document.getElementById("unlock").onclick = () => {
  const master = document.getElementById("master").value;
  chrome.runtime.sendMessage({ type: "unlockVault", master });
};

// Elements
const passwordField = document.getElementById('password');
const generateBtn = document.getElementById('generate');
const strengthMeter = document.getElementById('strength');

// Character sets
const charset = {
  lowercase: 'abcdefghijklmnopqrstuvwxyz',
  uppercase: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  digits: '0123456789',
  symbols: '!@#$%^&*()_+[]{}|;:,.<>?'
};

// Password generator
function generatePassword(length = 16) {
  const allChars = charset.lowercase + charset.uppercase + charset.digits + charset.symbols;
  const array = new Uint32Array(length);
  window.crypto.getRandomValues(array);

  return Array.from(array, (x) => allChars[x % allChars.length]).join('');
}

// Strength checker (requires zxcvbn.js)
function checkStrength(password) {
  const result = zxcvbn(password);
  strengthMeter.value = result.score; // 0 to 4
}

// Events
generateBtn.addEventListener('click', () => {
  const pwd = generatePassword(16);
  passwordField.value = pwd;
  checkStrength(pwd);
});

