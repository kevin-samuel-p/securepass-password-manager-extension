// content.js
(() => {
  // ---------- utilities ----------
  const q = (sel, root=document) => root.querySelector(sel);
  const qa = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const origin = location.origin;

  // Strong generator
  function generateStrong(len = 16) {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()-_=+[]{};:,.<>?";
    let out = "";
    const array = new Uint32Array(len);
    crypto.getRandomValues(array);
    for (let i = 0; i < len; i++) out += chars[array[i] % chars.length];
    return out;
  }

  // ---------- Shadow UI (one host for all widgets) ----------
  function ensureHost() {
    let host = document.getElementById("sp-shadow-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "sp-shadow-host";
      document.documentElement.appendChild(host);
      const shadow = host.attachShadow({ mode: "open" });
      shadow.innerHTML = `
        <style>
          .sp-card {
            font-family: system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
            position: fixed; right: 14px; bottom: 14px; z-index: 2147483647;
            background: #ffffff; color: #0f172a; border: 1px solid #e5e7eb;
            border-radius: 10px; box-shadow: 0 10px 30px rgba(0,0,0,.15);
            padding: 10px 12px; width: 320px;
          }
          .sp-row { display:flex; gap:8px; align-items:center; }
          .sp-title { font-weight: 600; margin-bottom: 6px; font-size: 14px; }
          .sp-muted { color:#64748b; font-size:12px; }
          .sp-btn { border:0; border-radius:8px; padding:6px 10px; cursor:pointer; }
          .sp-primary { background:#2563eb; color:#fff; }
          .sp-ghost { background:#f1f5f9; color:#0f172a; }
          .sp-meter { height:6px; border-radius:3px; background:#e5e7eb; overflow:hidden; margin-top:6px; }
          .sp-meter > div { height:100%; width:0%; transition: width .25s; }
          .sp-pill {
            position:absolute; transform: translateY(-36px);
            background:#2563eb; color:#fff; padding:4px 8px; border-radius:999px;
            font-size:12px; cursor:pointer; white-space:nowrap;
          }
          .sp-inline { position:relative; margin-top:4px; }
          .sp-tips { font-size:12px; color:#475569; margin-top:4px; }
        </style>
        <div id="root"></div>
      `;
    }
    return host.shadowRoot;
  }

  // ---------- Login detection & capture ----------
  function findLoginForms() {
    const forms = qa("form");
    return forms.filter(f => {
      const pass = q("input[type='password']", f);
      if (!pass) return false;
      // Prefer login forms (one password, likely no "confirm")
      const passCount = qa("input[type='password']", f).length;
      return passCount === 1;
    });
  }

  function captureCredentials(site, username, password) {
    chrome.runtime.sendMessage({
      action: "pendingCreds",
      data: { site, username, password }
    });
  }

  document.addEventListener("submit", function (e) {
    const form = e.target;
    const usernameField = form.querySelector(
      "input[type='text'], input[type='email'], input[name*='user'], input[name*='email'], input[id*='user'], input[id*='email'], input[placeholder*='user'], input[placeholder*='email']"
    );
    const passwordField = form.querySelector("input[type='password']");

    if (usernameField && passwordField) {
      const site = window.location.hostname;
      captureCredentials(site, usernameField.value, passwordField.value);
    }
  }, true);

  function usernameCandidate(form) {
    const fields = qa("input", form);
    let userEl = fields.find(el => {
      const t = (el.getAttribute("type") || "").toLowerCase();
      const n = (el.getAttribute("name") || "").toLowerCase();
      const id = (el.id || "").toLowerCase();
      const ph = (el.getAttribute("placeholder") || "").toLowerCase();
      const isTextish = ["text", "email", "tel"].includes(t) || t === "" || t === "search";
      const looksUser = /user|email|login|id|account|name/i.test(n + " " + id + " " + ph);
      return isTextish && looksUser;
    });

    // Fallback: first text-like input before the password
    if (!userEl) {
      const passIndex = fields.findIndex(f => f.type === "password");
      if (passIndex > 0) {
        userEl = fields[passIndex - 1];
      }
    }
    return userEl;
  }

  function attachLoginCapture() {
    findLoginForms().forEach(form => {
      if (form.__spBound) return;
      form.__spBound = true;

      form.addEventListener("submit", () => {
        const userEl = usernameCandidate(form);
        const passEl = q("input[type='password']", form);
        const username = userEl ? userEl.value : "";
        const password = passEl ? passEl.value : "";
        const site = window.location.hostname;

        captureCredentials(site, username, password);
      }, { capture: true });
    });
  }

  // ---------- Registration helper (suggest + zxcvbn) ----------
  function looksLikeSignup(form) {
    const passFields = qa("input[type='password']", form);
    if (passFields.length >= 2) return true; // password + confirm
    const text = (form.textContent || document.body.textContent || "").toLowerCase();
    return /sign\s*up|register|create\s*account/.test(text);
  }

  function mountSignupHelper(form) {
    const pass = q("input[type='password']", form);
    if (!pass || pass.__spHelper) return;
    pass.__spHelper = true;

    // Suggest pill
    const pill = document.createElement("div");
    pill.className = "sp-pill";
    pill.textContent = "Suggest strong password";
    pass.parentElement?.appendChild(pill);
    // Position approximately above the first password field
    const stylePos = () => {
      const r = pass.getBoundingClientRect();
      pill.style.left = Math.max(8, r.left + window.scrollX) + "px";
      pill.style.top  = Math.max(8, r.top  + window.scrollY) + "px";
    };
    stylePos(); window.addEventListener("scroll", stylePos, { passive:true }); window.addEventListener("resize", stylePos);

    pill.onclick = () => {
      const strong = generateStrong(16);
      pass.value = strong;
      // Fill confirm if present
      const confirms = qa("input[type='password']", form).filter(el => el !== pass);
      if (confirms[0]) confirms[0].value = strong;
      pass.dispatchEvent(new Event("input", { bubbles:true }));
    };

    // Strength UI after the field
    const inline = document.createElement("div");
    inline.className = "sp-inline";
    inline.innerHTML = `
      <div class="sp-meter"><div id="sp-bar"></div></div>
      <div class="sp-tips" id="sp-tips"></div>
    `;
    pass.insertAdjacentElement("afterend", inline);
    const bar = inline.querySelector("#sp-bar");
    const tips = inline.querySelector("#sp-tips");

    function updateStrength(pw) {
      if (!pw) { bar.style.width = "0%"; bar.style.background = "#e5e7eb"; tips.textContent = ""; return; }
      const res = zxcvbn(pw);
      const widths = ["10%","30%","55%","80%","100%"];
      const colors = ["#ef4444","#f59e0b","#fbbf24","#84cc16","#10b981"];
      bar.style.width = widths[res.score];
      bar.style.background = colors[res.score];
      tips.textContent = (res.feedback.warning || "") + (res.feedback.suggestions?.length ? " " + res.feedback.suggestions.join(" ") : "");
    }

    pass.addEventListener("input", () => updateStrength(pass.value));
  }

  function scanForSignup() {
    qa("form").forEach(f => { if (looksLikeSignup(f)) mountSignupHelper(f); });
  }

  // ---------- Password Autocomplete/Autofill Feature ----------
  function autofillCreds() {
    const site = window.location.hostname;

    chrome.storage.local.get(["passwords"], (result) => {
      const passwords = result.passwords || [];
      const creds = passwords.find(p => p.site === site);
      if (!creds) return;

      // Go through each detected login form
      findLoginForms().forEach(form => {
        const userEl = usernameCandidate(form);
        const passEl = q("input[type='password']", form);

        if (userEl && !userEl.value) {
          userEl.value = creds.username;
          userEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
        if (passEl && !passEl.value) {
          passEl.value = creds.password;
          passEl.dispatchEvent(new Event("input", { bubbles: true }));
        }
      });
    });
  }

  // ---------- Boot ----------
  attachLoginCapture();
  scanForSignup();
  autofillCreds();

  // Watch dynamic pages
  const mo = new MutationObserver(() => { 
    attachLoginCapture(); 
    scanForSignup(); 
    autofillCreds(); 
  });
  mo.observe(document.documentElement, { subtree: true, childList: true });

  window.addEventListener("DOMContentLoaded", () => {
    const loginForms = findLoginForms();
    if (loginForms.length === 0) return;

    const { usernameField, passwordField } = loginForms[0];

    chrome.runtime.sendMessage({ action: "getCreds", site: location.hostname });
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === "credsResult" && msg.site === location.hostname && msg.creds) {
        const { username, password } = msg.creds;
        if (usernameField) usernameField.value = username;
        if (passwordField) passwordField.value = password;
      }
    });
  });
})();