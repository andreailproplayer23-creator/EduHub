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

// Favicon EduHub caricata automaticamente su tutte le pagine
(function injectEduHubFavicon() {
  if (document.querySelector("link[rel*='icon']")) return;

  const svgIcon = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <defs>
        <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#2563eb"/>
          <stop offset="100%" stop-color="#7c3aed"/>
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#g)"/>
      <path d="M32 14L10 25l22 11 18-9v13h4V25L32 14zm-12 17v9c0 4 5.4 7 12 7s12-3 12-7v-9l-12 6-12-6z" fill="#ffffff"/>
    </svg>
  `.trim();

  const link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/svg+xml";
  link.href = "data:image/svg+xml," + encodeURIComponent(svgIcon);
  document.head.appendChild(link);
})();