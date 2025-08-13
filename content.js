// ---------- Utilities ----------
const HOST = location.hostname.replace(/^www\./, '');
const SELECTORS = {
  user: [
    "input[name='username']",
    "input[name='email']",
    "input[type='email']",
    "input[name*='user' i]",
    "input[id*='user' i]"
  ].join(','),
  pass: "input[type='password']"
};

function q(sel, root = document) { return root.querySelector(sel); }
function qa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function generatePassword(len = 16) {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{}|;:,.<>?/`~";
  const arr = new Uint32Array(len);
  crypto.getRandomValues(arr);
  return Array.from(arr, n => chars[n % chars.length]).join('');
}

function getFields() {
  const pass = q(SELECTORS.pass);
  if (!pass) return {};
  // Heuristic for username: nearest text/email input preceding the password
  let user = pass.closest('form')?.querySelector(SELECTORS.user) || q(SELECTORS.user);
  return { user, pass };
}

// ---------- Overlay (Shadow DOM) ----------
let overlay;
// function ensureOverlay() {
//   if (overlay) return overlay;
//   overlay = document.createElement('div');
//   const shadow = overlay.attachShadow({ mode: 'open' });
//   const wrap = document.createElement('div');
//   const style = document.createElement('style');
//   style.textContent = `
//     .sp-card {
//       position: fixed;
//       z-index: 2147483647;
//       top: 12px; right: 12px;
//       background: white;
//       border: 1px solid #e5e7eb;
//       border-radius: 10px;
//       box-shadow: 0 10px 20px rgba(0,0,0,.08);
//       font: 13px/1.4 system-ui, -apple-system, Segoe UI, Arial;
//       color: #111827;
//       width: 320px;
//       padding: 12px;
//     }
//     .sp-title { font-weight: 600; margin-bottom: 6px; }
//     .sp-row { margin: 8px 0; }
//     .sp-btn { padding: 6px 8px; border: 1px solid #e2e8f0; border-radius: 8px; cursor: pointer; }
//     .sp-btn.primary { border-color: #00A2ED; background:#00A2ED; color:white; }
//     .sp-meter { height: 8px; width: 100%; background: #f3f4f6; border-radius: 8px; overflow: hidden; }
//     .sp-meter > div { height: 100%; width: 0%; transition: width .15s; }
//     .sp-tips { color:#374151; font-size:12px; margin-top:6px; }
//     .sp-close { position:absolute; top: 8px; right: 10px; cursor:pointer; color:#6b7280; }
//   `;
//   wrap.innerHTML = `
//     <div class="sp-card">
//       <div class="sp-close" id="spClose">✕</div>
//       <div class="sp-title">SecurePass</div>
//       <div class="sp-body">
//         <div class="sp-row" id="spSuggestRow" style="display:none;">
//           <button class="sp-btn primary" id="spUseStrong">Use strong password</button>
//           <button class="sp-btn" id="spNewStrong">New suggestion</button>
//         </div>
//         <div class="sp-row">
//           <div class="sp-meter"><div id="spBar"></div></div>
//           <div class="sp-tips" id="spTips"></div>
//         </div>
//       </div>
//     </div>
//   `;
//   shadow.append(style, wrap);
//   document.documentElement.appendChild(overlay);

//   // events
//   shadow.getElementById('spClose').onclick = () => overlay.remove();
//   shadow.getElementById('spNewStrong').onclick = () => {
//     strongCandidate = generatePassword(16);
//     shadow.getElementById('spUseStrong').textContent = `Use: ${strongCandidate}`;
//   };
//   shadow.getElementById('spUseStrong').onclick = async () => {
//     const { user, pass } = getFields();
//     if (!pass) return;
//     pass.value = strongCandidate;
//     pass.dispatchEvent(new Event('input', { bubbles: true }));
//     if (user && user.value) {
//       await saveCreds(HOST, user.value, strongCandidate);
//     }
//   };

//   return { shadow, wrap };
// }

function ensureOverlay() {
  let shadowHost = document.getElementById('my-ext-shadow-host');
  let shadow;

  if (!shadowHost) {
    shadowHost = document.createElement('div');
    shadowHost.id = 'my-ext-shadow-host';
    document.body.appendChild(shadowHost);

    shadow = shadowHost.attachShadow({ mode: 'open' });

    // Inject the HTML for the overlay immediately
    shadow.innerHTML = `
      <style>
        #spBar {
          height: 6px;
          width: 0%;
          background: #ccc;
          border-radius: 3px;
          margin: 4px 0;
          transition: width 0.3s ease, background 0.3s ease;
        }
        #spTips {
          font-size: 12px;
          color: #555;
          margin-top: 3px;
          font-family: sans-serif;
        }
        #spSuggestRow {
          font-size: 13px;
          color: #0073e6;
          margin-top: 6px;
          font-family: sans-serif;
          cursor: pointer;
          display: none;  /* hidden by default */
        }
        #spSuggestRow:hover {
          text-decoration: underline;
        }
      </style>
      <div id="spBar"></div>
      <div id="spTips"></div>
      <div id="spSuggestRow">Click to use a suggested password</div>
    `;
  } else {
    shadow = shadowHost.shadowRoot;
  }

  return { shadow }
}

function setStrengthUI(score, suggestions) {
  const { shadow } = ensureOverlay();
  const bar = shadow.getElementById('spBar');
  const tips = shadow.getElementById('spTips');
  const widths = ['10%','30%','50%','75%','100%'];
  const colors = ['#ef4444','#f59e0b','#fbbf24','#84cc16','#10b981'];
  bar.style.width = widths[score] || '10%';
  bar.style.background = colors[score] || colors[0];
  tips.textContent = (suggestions && suggestions.length)
    ? 'Tips: ' + suggestions.join(' ')
    : (score < 3 ? 'Try adding length, symbols, and mixing cases.' : 'Looks good!');
}

// ---------- Background messaging ----------
const storageGet = (key) => new Promise(res => chrome.storage.local.get(key, v => res(v[key])));
const storageSet = (obj) => new Promise(res => chrome.storage.local.set(obj, res));

async function getCreds(host) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: 'SP_GET_CREDS', host }, resolve);
  });
}
async function saveCreds(host, username, password) {
  return new Promise(resolve => {
    chrome.runtime.sendMessage({ type: 'SP_SAVE_CREDS', host, username, password }, resolve);
  });
}

// ---------- Main flow ----------
let strongCandidate = generatePassword(16);

async function tryAutofill() {
  const { user, pass } = getFields();
  if (!pass) return;
  const existing = await getCreds(HOST);
  if (existing && existing.username && existing.password) {
    if (user && !user.value) user.value = existing.username;
    if (!pass.value) pass.value = existing.password;
    pass.dispatchEvent(new Event('input', { bubbles: true }));
    return; // done
  }

  // Not found: show suggest row when username is present and password is empty/focused
  const { shadow } = ensureOverlay();
  const suggestRow = shadow.getElementById('spSuggestRow');

  function updateSuggestVisibility() {
    const { user, pass } = getFields();
    if (!pass) return;
    const ready = user && user.value && !pass.value && (document.activeElement === pass || document.activeElement === user);
    suggestRow.style.display = ready ? '' : 'none';
  }

  // live strength meter
  pass.addEventListener('input', () => {
    const res = zxcvbn(pass.value || '');
    setStrengthUI(res.score, res.feedback.suggestions);
    updateSuggestVisibility();
  });

  if (user) user.addEventListener('input', updateSuggestVisibility);
  pass.addEventListener('focus', updateSuggestVisibility);
  updateSuggestVisibility();
}

function observeForFields() {
  tryAutofill();
  const mo = new MutationObserver(() => tryAutofill());
  mo.observe(document.documentElement, { childList: true, subtree: true });
}

observeForFields();

// ---------- Popup command: open strength widget ----------
chrome.runtime.onMessage.addListener((msg) => {
  if (msg?.type === 'SP_OPEN_STRENGTH_WIDGET') {
    ensureOverlay(); // simply shows the meter; user can type in the page’s field
  }
});
