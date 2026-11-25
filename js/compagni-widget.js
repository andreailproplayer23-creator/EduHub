// js/compagni-widget.js
import { db } from "./firebase-config.js";
import { isRappresentante } from "./auth.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function initCompagniWidget() {
  if (document.getElementById("compagniFab")) return;

  const style = document.createElement("style");
  style.textContent = `
    .compagni-fab {
      position: fixed;
      bottom: 24px;
      left: 24px;
      z-index: 9990;
      display: flex;
      align-items: center;
      gap: 10px;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      color: #ffffff;
      border: none;
      border-radius: 999px;
      padding: 13px 20px;
      font-weight: 800;
      font-size: 0.92rem;
      cursor: pointer;
      box-shadow: 0 10px 28px rgba(37, 99, 235, 0.45);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .compagni-fab:hover {
      transform: translateY(-3px) scale(1.03);
      box-shadow: 0 14px 34px rgba(37, 99, 235, 0.6);
    }
    .compagni-count-badge {
      background: rgba(255, 255, 255, 0.22);
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.78rem;
      font-weight: 800;
    }
    .compagni-drawer {
      position: fixed;
      bottom: 84px;
      left: 24px;
      width: 370px;
      max-width: calc(100vw - 32px);
      max-height: 520px;
      background: var(--card-bg, #131b2e);
      border: 1px solid var(--table-border, rgba(255,255,255,0.1));
      border-radius: 20px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.55);
      z-index: 9991;
      display: none;
      flex-direction: column;
      overflow: hidden;
      animation: popDrawer 0.2s ease-out;
    }
    .compagni-drawer.open {
      display: flex;
    }
    @keyframes popDrawer {
      from { opacity: 0; transform: translateY(14px) scale(0.97); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .compagni-header {
      padding: 16px 18px;
      background: linear-gradient(135deg, rgba(37, 99, 235, 0.18), rgba(79, 70, 229, 0.18));
      border-bottom: 1px solid var(--table-border, rgba(255,255,255,0.08));
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .compagni-header h3 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 800;
      color: var(--text-main, #fff);
    }
    .compagni-close {
      background: transparent;
      border: none;
      color: var(--text-muted, #94a3b8);
      font-size: 1.3rem;
      cursor: pointer;
      line-height: 1;
      padding: 4px;
    }
    .compagni-search-wrap {
      padding: 10px 14px;
      border-bottom: 1px solid var(--table-border, rgba(255,255,255,0.08));
    }
    .compagni-search {
      width: 100%;
      padding: 9px 12px;
      border-radius: 10px;
      border: 1px solid var(--table-border, rgba(255,255,255,0.12));
      background: var(--surface-sub, rgba(255,255,255,0.04));
      color: var(--text-main, #fff);
      font-size: 0.88rem;
      outline: none;
    }
    .compagni-list {
      padding: 12px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .compagno-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 14px;
      background: var(--surface-sub, rgba(255,255,255,0.04));
      border: 1px solid var(--table-border, rgba(255,255,255,0.06));
    }
    .compagno-item.is-rep {
      border-color: rgba(245, 158, 11, 0.45);
      background: linear-gradient(135deg, rgba(245, 158, 11, 0.08), rgba(37, 99, 235, 0.06));
    }
    .compagno-avatar {
      width: 42px;
      height: 42px;
      border-radius: 12px;
      background: linear-gradient(135deg, #2563eb, #4f46e5);
      color: #fff;
      font-weight: 800;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      overflow: hidden;
    }
    .compagno-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .compagno-item.is-rep .compagno-avatar {
      background: linear-gradient(135deg, #f59e0b, #d97706);
    }
    .compagno-info {
      flex: 1;
      min-width: 0;
    }
    .compagno-name-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }
    .compagno-name {
      font-weight: 700;
      font-size: 0.92rem;
      color: var(--text-main, #fff);
    }
    .compagno-badge-rep {
      font-size: 0.68rem;
      font-weight: 800;
      padding: 2px 7px;
      border-radius: 999px;
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
    .compagno-bio {
      font-size: 0.8rem;
      color: var(--text-muted, #94a3b8);
      margin-top: 3px;
      word-break: break-word;
    }
  `;
  document.head.appendChild(style);

  const fab = document.createElement("button");
  fab.id = "compagniFab";
  fab.className = "compagni-fab";
  fab.title = "Apri Rubrica Compagni 1BI";
  fab.innerHTML = `
    <i data-lucide="users" style="width:18px;height:18px;"></i>
    <span>Compagni 1BI</span>
    <span class="compagni-count-badge" id="compagniCountBadge">0</span>
  `;

  const drawer = document.createElement("div");
  drawer.id = "compagniDrawer";
  drawer.className = "compagni-drawer";
  drawer.innerHTML = `
    <div class="compagni-header">
      <div>
        <h3>Rubrica Classe 1BI</h3>
        <small style="color: var(--text-muted); font-size: 0.76rem;">Studenti registrati su EduHub</small>
      </div>
      <button class="compagni-close" id="closeCompagniDrawer" title="Chiudi">&times;</button>
    </div>
    <div class="compagni-search-wrap">
      <input type="text" id="compagniSearchInput" class="compagni-search" placeholder="Cerca compagno o rappresentante..." />
    </div>
    <div class="compagni-list" id="compagniListContainer">
      <div style="text-align:center; color: var(--text-muted); padding: 20px; font-size: 0.85rem;">Caricamento compagni...</div>
    </div>
  `;

  document.body.appendChild(fab);
  document.body.appendChild(drawer);

  if (window.lucide) window.lucide.createIcons();

  fab.addEventListener("click", () => {
    drawer.classList.toggle("open");
    if (drawer.classList.contains("open")) {
      document.getElementById("compagniSearchInput")?.focus();
    }
  });

  document.getElementById("closeCompagniDrawer").addEventListener("click", () => {
    drawer.classList.remove("open");
  });

  let allCompagni = [];

  function renderList(filterText = "") {
    const container = document.getElementById("compagniListContainer");
    const q = filterText.trim().toLowerCase();

    const filtered = allCompagni.filter(c =>
      c.nome.toLowerCase().includes(q) ||
      (c.descrizione || "").toLowerCase().includes(q) ||
      (c.isRep && "rappresentante".includes(q))
    );

    if (filtered.length === 0) {
      container.innerHTML = `<div style="text-align:center; color: var(--text-muted); padding: 20px; font-size: 0.85rem;">Nessun compagno trovato.</div>`;
      return;
    }

    container.innerHTML = filtered.map(c => {
      const initial = escapeHtml(c.nome.charAt(0).toUpperCase());
      const avatarHtml = c.photoURL
        ? `<img src="${escapeHtml(c.photoURL)}" alt="${escapeHtml(c.nome)}" referrerpolicy="no-referrer" onerror="this.parentElement.textContent='${initial}'" />`
        : initial;

      return `
        <div class="compagno-item ${c.isRep ? "is-rep" : ""}">
          <div class="compagno-avatar">${avatarHtml}</div>
          <div class="compagno-info">
            <div class="compagno-name-row">
              <span class="compagno-name">${escapeHtml(c.nome)}</span>
              ${c.isRep ? `<span class="compagno-badge-rep">★ Rappresentante</span>` : ""}
            </div>
            <div class="compagno-bio">${escapeHtml(c.descrizione || "Studente 1BI")}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  document.getElementById("compagniSearchInput").addEventListener("input", (e) => {
    renderList(e.target.value);
  });

  onSnapshot(collection(db, "utenti_registrati"), (snapshot) => {
    const list = [];
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const nome = data.nome || (data.email ? data.email.split("@")[0] : "Studente 1BI");
      const isRep = data.ruolo === "rappresentante" || isRappresentante(data.email || "");
      list.push({
        id: docSnap.id,
        nome,
        descrizione: data.descrizione || "",
        photoURL: data.photoURL || "",
        isRep
      });
    });

    list.sort((a, b) => {
      if (a.isRep !== b.isRep) return a.isRep ? -1 : 1;
      return a.nome.localeCompare(b.nome, "it");
    });

    allCompagni = list;
    document.getElementById("compagniCountBadge").textContent = list.length;
    renderList(document.getElementById("compagniSearchInput")?.value || "");
  }, (err) => {
    console.warn("Errore lettura rubrica compagni:", err);
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}