(async () => {
  const tbody = document.getElementById("pw-tbody");

  async function load() {
    const {passwords = []} = await chrome.storage.local.get(["passwords"]);
    tbody.innerHTML = "";
    if (!passwords.length) {
      tbody.innerHTML = `<tr><td colspan="4" class="muted">No passwords saved</td></tr>`;
      return;
    }
    passwords.forEach((p, i) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td title="${p.site}">${p.site}</td>
        <td title="${p.username}">${p.username}</td>
        <td><span class="badge">••••••••</span></td>
        <td>
          <button class="see" data-i="${i}">👁️</button>
          <button class="del" data-i="${i}">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("button.see").forEach(see => {
      see.onclick = async (e) => {
        const p = +e.target.getAttribute("data-i");
        const {passwords = []} = await chrome.storage.local.get(["passwords"]);
        const creds = passwords[p];
        
        // Locate span in the same row
        const row = e.target.closest("tr");
        const badge = row.querySelector("span.badge");

        // Toggle logic
        if (e.target.dataset.state !== "visible") {
          badge.textContent = creds.password;
          e.target.textContent = "🔒";
          e.target.dataset.state = "visible";
        } else {
          badge.textContent = "••••••••";
          e.target.textContent = "👁️";
          e.target.dataset.state = "hidden";
        }
      };
    });

    tbody.querySelectorAll("button.del").forEach(del => {
      del.onclick = async (e) => {
        const i = +e.target.getAttribute("data-i");
        const {passwords = []} = await chrome.storage.local.get(["passwords"]);
        passwords.splice(i, 1);
        await chrome.storage.local.set({passwords});
        load();
      };
    });
  }

  load();
})();
