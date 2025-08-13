document.addEventListener("DOMContentLoaded", () => {
  const themeToggle = document.getElementById("theme-toggle");
  const body = document.body;

  // Load saved theme preference
  chrome.storage.sync.get(["theme"], (data) => {
    if (data.theme === "light") {
      body.classList.add("light-theme");
      themeToggle.textContent = "🌙";
    } else {
      themeToggle.textContent = "☀️";
    }
  });

  themeToggle.addEventListener("click", () => {
    body.classList.toggle("light-theme");
    const isLight = body.classList.contains("light-theme");

    chrome.storage.sync.set({ theme: isLight ? "light" : "dark" });
    themeToggle.textContent = isLight ? "🌙" : "☀️";
  });

  // Placeholder button actions
  document.getElementById("manage-passwords").addEventListener("click", () => {
    alert("Manage Passwords clicked!");
  });

  document.getElementById("check-strength").addEventListener("click", () => {
    alert("Check Password Strength clicked!");
  });
});
