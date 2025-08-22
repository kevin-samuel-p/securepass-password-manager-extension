async function applyTheme() {
  const { theme } = await chrome.storage.local.get(["theme"]);
  if (theme === "dark") {
    document.body.classList.add("dark");
  } else {
    document.body.classList.remove("dark");
  }
}

async function toggleTheme() {
  const { theme } = await chrome.storage.local.get(["theme"]);
  const newTheme = (theme === "dark") ? "light" : "dark";
  await chrome.storage.local.set({ theme: newTheme });
  applyTheme();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && changes.theme) {
    applyTheme();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  applyTheme();

  const themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", toggleTheme);
  }
});
