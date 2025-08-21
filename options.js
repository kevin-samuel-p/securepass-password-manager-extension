(async () => {
  const tbody = document.getElementById("pw-tbody");

  async function load() {
    const { passwords = [] } = await chrome.storage.local.get(["passwords"]);
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
        <td><button class="btn" data-i="${i}">Delete</button></td>
      `;
      tbody.appendChild(tr);
    });

    tbody.querySelectorAll("button[data-i]").forEach(btn => {
      btn.onclick = async (e) => {
        const i = +e.target.getAttribute("data-i");
        const { passwords = [] } = await chrome.storage.local.get(["passwords"]);
        passwords.splice(i, 1);
        await chrome.storage.local.set({ passwords });
        load();
      };
    });
  }

  load();
})();
