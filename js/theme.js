// js/theme.js
const savedTheme = localStorage.getItem("eduhub_theme") || "light";
document.documentElement.setAttribute("data-theme", savedTheme);

window.addEventListener("DOMContentLoaded", () => {
  const toggleBtn = document.getElementById("themeToggleBtn");

  function renderThemeIcon() {
    if (!toggleBtn) return;
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    toggleBtn.innerHTML = isDark
      ? `<i data-lucide="sun"></i>`
      : `<i data-lucide="moon"></i>`;
    if (window.lucide) window.lucide.createIcons();
  }

  renderThemeIcon();

  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("eduhub_theme", next);
      renderThemeIcon();
    });
  }

  if (window.lucide) {
    window.lucide.createIcons();
  }
});