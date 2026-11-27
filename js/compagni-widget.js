import { db } from "./firebase-config.js";
import { collection, onSnapshot } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const REP_EMAILS = [
  "andrea.ilproplayer23@gmail.com",
  "alessandromoreschi.712@gmail.com"
];

const FRAME_STYLES = {
  "frame-default": "border: 2px solid #38bdf8;",
  "frame-gold": "border: 3px solid #fbbf24; box-shadow: 0 0 14px rgba(251, 191, 36, 0.7);",
  "frame-neon": "border: 3px solid #ec4899; box-shadow: 0 0 15px rgba(236, 72, 153, 0.75);",
  "frame-matrix": "border: 3px solid #10b981; box-shadow: 0 0 15px rgba(16, 185, 129, 0.75);",
  "frame-fire": "border: 3px solid #f97316; box-shadow: 0 0 16px rgba(249, 115, 22, 0.8);",
  "frame-diamond": "border: 3px solid #22d3ee; box-shadow: 0 0 18px rgba(34, 211, 238, 0.9);"
};

const TITLE_LABELS = {
  "title-base": "Studente 1BI Informatica",
  "title-bughunter": "🐛 Bug Hunter C++",
  "title-secchione": "👑 Re delle Interrogazioni",
  "title-gamer": "🎮 Pro Player 1BI",
  "title-architect": "⚡ System Architect"
};

const BADGE_ICONS = {
  "badge-base": "🎓",
  "badge-rocket": "🚀",
  "badge-brain": "🧠",
  "badge-crown": "👑",
  "badge-dragon": "🐉"
};

export function initCompagniWidget() {
  if (document.getElementById("compagniFloatingBtn")) return;

  // Stili dedicati per Rubrica e Modale Profilo Pubblico
  const style = document.createElement("style");
  style.textContent = `
    #compagniFloatingBtn {
      position: fixed;
      bottom: 20px;
      left: 20px;
      z-index: 990;
      display: inline-flex;
      align-items: center;
      gap: 9px;
      padding: 11px 18px;
      border-radius: 999px;
      border: 1px solid rgba(96, 165, 250, 0.45);
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #fff;
      font-weight: 800;
      font-size: 0.86rem;
      cursor: pointer;
      box-shadow: 0 10px 26px rgba(37, 99, 235, 0.4);
      transition: transform 0.15s ease;
    }
    #compagniFloatingBtn:hover { transform: translateY(-2px); }
    #compagniCountPill {
      background: rgba(255, 255, 255, 0.22);
      padding: 2px 8px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 900;
    }

    #compagniDrawer {
      position: fixed;
      bottom: 74px;
      left: 20px;
      width: 340px;
      max-width: calc(100vw - 40px);
      max-height: 70vh;
      background: #0f172a;
      border: 1px solid rgba(148, 163, 184, 0.26);
      border-radius: 18px;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
      z-index: 995;
      display: none;
      flex-direction: column;
      overflow: hidden;
      color: #f8fafc;
    }
    html[data-theme="light"] #compagniDrawer {
      background: #ffffff;
      color: #0f172a;
      border-color: rgba(15, 23, 42, 0.16);
    }

    .compagni-drawer-head {
      padding: 15px 16px 10px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .compagni-search-wrap {
      padding: 0 14px 12px;
    }
    #compagniSearchInput {
      width: 100%;
      padding: 9px 12px;
      border-radius: 10px;
      border: 1px solid rgba(148, 163, 184, 0.25);
      background: rgba(30, 41, 59, 0.75);
      color: inherit;
      font-size: 0.82rem;
      box-sizing: border-box;
    }
    html[data-theme="light"] #compagniSearchInput {
      background: #f1f5f9;
    }

    #compagniListContainer {
      padding: 0 14px 14px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 9px;
    }

    .compagno-row-card {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 10px 12px;
      border-radius: 13px;
      background: rgba(30, 41, 59, 0.72);
      border: 1px solid rgba(148, 163, 184, 0.18);
      cursor: pointer;
      transition: transform 0.14s ease, border-color 0.14s ease, background 0.14s ease;
      text-align: left;
      width: 100%;
      color: inherit;
    }
    html[data-theme="light"] .compagno-row-card {
      background: #f8fafc;
      border-color: rgba(15, 23, 42, 0.12);
    }
    .compagno-row-card:hover {
      transform: translateX(3px);
      border-color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
    }

    .compagno-mini-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 0.95rem;
      background: linear-gradient(135deg, #2563eb, #1d4ed8);
      color: #fff;
      overflow: hidden;
    }
    .compagno-mini-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .rep-mini-badge {
      display: inline-block;
      margin-top: 2px;
      padding: 1px 7px;
      border-radius: 999px;
      background: rgba(245, 158, 11, 0.18);
      border: 1px solid rgba(251, 191, 36, 0.45);
      color: #fbbf24;
      font-size: 0.66rem;
      font-weight: 800;
    }

    /* MODALE PROFILO COMPAGNO */
    #publicProfileBackdrop {
      position: fixed;
      inset: 0;
      background: rgba(2, 6, 23, 0.76);
      backdrop-filter: blur(4px);
      z-index: 1200;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }
    #publicProfileCard {
      width: 100%;
      max-width: 420px;
      background: #0f172a;
      color: #f8fafc;
      border: 1px solid rgba(148, 163, 184, 0.28);
      border-radius: 22px;
      padding: 24px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.7);
      position: relative;
      text-align: center;
    }
    html[data-theme="light"] #publicProfileCard {
      background: #ffffff;
      color: #0f172a;
    }
    .pub-avatar-large {
      width: 86px;
      height: 86px;
      border-radius: 50%;
      margin: 0 auto 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 900;
      background: linear-gradient(135deg, #2563eb, #1e293b);
      color: #fff;
      overflow: hidden;
    }
    .pub-avatar-large img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .pub-stats-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-top: 16px;
    }
    .pub-stat-box {
      background: rgba(30, 41, 59, 0.75);
      border: 1px solid rgba(148, 163, 184, 0.2);
      border-radius: 13px;
      padding: 10px;
    }
    html[data-theme="light"] .pub-stat-box {
      background: #f1f5f9;
    }
  `;
  document.head.appendChild(style);

  // Bottone fluttuante in basso a sinistra
  const floatBtn = document.createElement("button");
  floatBtn.type = "button";
  floatBtn.id = "compagniFloatingBtn";
  floatBtn.innerHTML = `
    <span>👥 Compagni 1BI</span>
    <span id="compagniCountPill">0</span>
  `;
  document.body.appendChild(floatBtn);

  // Pannello Rubrica
  const drawer = document.createElement("div");
  drawer.id = "compagniDrawer";
  drawer.innerHTML = `
    <div class="compagni-drawer-head">
      <div>
        <div style="font-weight:900; font-size:0.96rem;">Rubrica Classe 1BI</div>
        <div style="font-size:0.74rem; opacity:0.7;">Clicca su un compagno per vedere il profilo</div>
      </div>
      <button type="button" id="closeCompagniDrawerBtn" style="background:none; border:none; color:inherit; font-size:1.1rem; cursor:pointer; padding:2px 6px;">✕</button>
    </div>
    <div class="compagni-search-wrap">
      <input type="text" id="compagniSearchInput" placeholder="Cerca compagno o rappresentante..." />
    </div>
    <div id="compagniListContainer"></div>
  `;
  document.body.appendChild(drawer);

  // Modale Profilo Pubblico
  const modalBackdrop = document.createElement("div");
  modalBackdrop.id = "publicProfileBackdrop";
  modalBackdrop.innerHTML = `<div id="publicProfileCard"></div>`;
  document.body.appendChild(modalBackdrop);

  let allUsers = [];

  floatBtn.addEventListener("click", () => {
    const isOpen = drawer.style.display === "flex";
    drawer.style.display = isOpen ? "none" : "flex";
  });

  document.getElementById("closeCompagniDrawerBtn").addEventListener("click", () => {
    drawer.style.display = "none";
  });

  modalBackdrop.addEventListener("click", (e) => {
    if (e.target === modalBackdrop) modalBackdrop.style.display = "none";
  });

  document.getElementById("compagniSearchInput").addEventListener("input", renderList);

  function renderList() {
    const queryTxt = (document.getElementById("compagniSearchInput").value || "").toLowerCase().trim();
    const listEl = document.getElementById("compagniListContainer");

    const filtered = allUsers.filter(u => {
      const name = (u.nomeCompleto || u.displayName || "").toLowerCase();
      const bio = (u.bio || "").toLowerCase();
      return name.includes(queryTxt) || bio.includes(queryTxt);
    });

    listEl.innerHTML = filtered.map(u => {
      const name = u.nomeCompleto || u.displayName || "Studente 1BI";
      const email = (u.email || "").toLowerCase();
      const isRep = u.ruolo === "rappresentante" || REP_EMAILS.includes(email);
      const bio = u.bio || "Ciao! Sono nella 1BI Informatica.";
      const frameCss = FRAME_STYLES[u.equippedFrame] || FRAME_STYLES["frame-default"];
      const badgeIcon = BADGE_ICONS[u.equippedBadge] || "";
      const photoUrl = u.photoURL || u.avatarUrl || "";

      return `
        <button type="button" class="compagno-row-card" data-uid="${u.id}">
          <div class="compagno-mini-avatar" style="${frameCss}">
            ${photoUrl ? `<img src="${escapeAttr(photoUrl)}" alt="" />` : escapeHtml(name.charAt(0).toUpperCase())}
          </div>
          <div style="flex:1; min-width:0;">
            <div style="display:flex; align-items:center; gap:5px; font-weight:800; font-size:0.86rem;">
              <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(name)}</span>
              ${badgeIcon ? `<span>${badgeIcon}</span>` : ""}
            </div>
            ${isRep ? `<div><span class="rep-mini-badge">★ Rappresentante</span></div>` : ""}
            <div style="font-size:0.74rem; opacity:0.72; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-top:2px;">
              ${escapeHtml(bio)}
            </div>
          </div>
          <span style="font-size:0.75rem; opacity:0.6; font-weight:800;">›</span>
        </button>
      `;
    }).join("");

    listEl.querySelectorAll(".compagno-row-card").forEach(btn => {
      btn.addEventListener("click", () => {
        const userObj = allUsers.find(item => item.id === btn.dataset.uid);
        if (userObj) openPublicProfileModal(userObj);
      });
    });
  }

  function openPublicProfileModal(u) {
    const name = u.nomeCompleto || u.displayName || "Studente 1BI";
    const email = (u.email || "").toLowerCase();
    const isRep = u.ruolo === "rappresentante" || REP_EMAILS.includes(email);
    const bio = u.bio || "Ciao! Sono nella 1BI Informatica.";
    const xp = Number(u.xp ?? u.punti ?? 0);
    const frameCss = FRAME_STYLES[u.equippedFrame] || FRAME_STYLES["frame-default"];
    const titleLabel = TITLE_LABELS[u.equippedTitle] || TITLE_LABELS["title-base"];
    const badgeIcon = BADGE_ICONS[u.equippedBadge] || "🎓";
    const photoUrl = u.photoURL || u.avatarUrl || "";
    const unlockedCount = Array.isArray(u.shopOwned) ? u.shopOwned.length : 3;

    const card = document.getElementById("publicProfileCard");
    card.innerHTML = `
      <button type="button" id="closePublicProfileBtn" style="position:absolute; top:14px; right:16px; background:none; border:none; color:inherit; font-size:1.2rem; cursor:pointer;">✕</button>

      <div class="pub-avatar-large" style="${frameCss}">
        ${photoUrl ? `<img src="${escapeAttr(photoUrl)}" alt="${escapeAttr(name)}" />` : escapeHtml(name.charAt(0).toUpperCase())}
      </div>

      <div style="display:flex; justify-content:center; align-items:center; gap:8px; flex-wrap:wrap;">
        <h3 style="margin:0; font-size:1.25rem; font-weight:900;">${escapeHtml(name)}</h3>
        <span style="font-size:1.25rem;">${badgeIcon}</span>
      </div>

      <div style="display:flex; justify-content:center; gap:6px; flex-wrap:wrap; margin-top:8px;">
        <span style="padding:3px 11px; border-radius:999px; background:rgba(56,189,248,0.18); color:#38bdf8; font-size:0.76rem; font-weight:800;">
          ${escapeHtml(titleLabel)}
        </span>
        ${isRep ? `
          <span style="padding:3px 11px; border-radius:999px; background:rgba(245,158,11,0.18); border:1px solid rgba(251,191,36,0.45); color:#fbbf24; font-size:0.76rem; font-weight:800;">
            ★ Rappresentante 1BI
          </span>
        ` : ""}
      </div>

      <div style="margin-top:14px; padding:12px 14px; border-radius:13px; background:rgba(148,163,184,0.1); font-size:0.86rem; line-height:1.5;">
        "${escapeHtml(bio)}"
      </div>

      <div class="pub-stats-row">
        <div class="pub-stat-box">
          <div style="font-size:0.7rem; font-weight:800; text-transform:uppercase; opacity:0.7;">Punti XP 1BI</div>
          <div style="font-size:1.25rem; font-weight:900; color:#fbbf24; margin-top:2px;">⚡ ${xp} XP</div>
        </div>
        <div class="pub-stat-box">
          <div style="font-size:0.7rem; font-weight:800; text-transform:uppercase; opacity:0.7;">Oggetti Negozio</div>
          <div style="font-size:1.25rem; font-weight:900; color:#38bdf8; margin-top:2px;">✨ ${unlockedCount}</div>
        </div>
      </div>

      <div style="margin-top:14px; font-size:0.74rem; opacity:0.65;">
        Classe 1BI Informatica • Profilo Verificato EduHub
      </div>
    `;

    modalBackdrop.style.display = "flex";
    document.getElementById("closePublicProfileBtn").addEventListener("click", () => {
      modalBackdrop.style.display = "none";
    });
  }

  onSnapshot(collection(db, "utenti_registrati"), (snap) => {
    allUsers = snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.nomeCompleto || "").localeCompare(b.nomeCompleto || "", "it"));

    document.getElementById("compagniCountPill").textContent = allUsers.length;
    renderList();
  });
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str) {
  return String(str || "").replace(/"/g, "&quot;");
}