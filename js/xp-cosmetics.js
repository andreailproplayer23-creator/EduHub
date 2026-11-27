// js/xp-cosmetics.js
import { db } from "./firebase-config.js";
import { isRappresentante } from "./auth.js";
import {
  collection,
  doc,
  onSnapshot,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export const FRAME_STYLES = {
  "frame-default": "border: 2px solid #38bdf8;",
  "frame-gold": "border: 3px solid #fbbf24; box-shadow: 0 0 14px rgba(251, 191, 36, 0.75);",
  "frame-neon": "border: 3px solid #ec4899; box-shadow: 0 0 15px rgba(236, 72, 153, 0.8);",
  "frame-matrix": "border: 3px solid #10b981; box-shadow: 0 0 15px rgba(16, 185, 129, 0.8);",
  "frame-fire": "border: 3px solid #f97316; box-shadow: 0 0 16px rgba(249, 115, 22, 0.85);",
  "frame-diamond": "border: 3px solid #22d3ee; box-shadow: 0 0 18px rgba(34, 211, 238, 0.95);"
};

export const TITLE_LABELS = {
  "title-base": "Studente 1BI Informatica",
  "title-bughunter": "🐛 Bug Hunter C++",
  "title-secchione": "👑 Re delle Interrogazioni",
  "title-gamer": "🎮 Pro Player 1BI",
  "title-architect": "⚡ System Architect"
};

export const BADGE_ICONS = {
  "badge-base": "🎓",
  "badge-rocket": "🚀",
  "badge-brain": "🧠",
  "badge-crown": "👑",
  "badge-dragon": "🐉"
};

export function getUserCosmetics(userData = {}) {
  const frameKey = userData.equippedFrame || "frame-default";
  const titleKey = userData.equippedTitle || "title-base";
  const badgeKey = userData.equippedBadge || "";

  return {
    frameCss: FRAME_STYLES[frameKey] || FRAME_STYLES["frame-default"],
    titleText: TITLE_LABELS[titleKey] || TITLE_LABELS["title-base"],
    badgeIcon: BADGE_ICONS[badgeKey] || "",
    xp: Number(userData.xp ?? userData.punti ?? 0)
  };
}

// Restituisce l'HTML compatto (Badge + Pillola Titolo) da mettere accanto al nome in Classifica, Chat e Profilo
export function renderCosmeticInlineHtml(userData = {}, showTitle = true) {
  const { titleText, badgeIcon } = getUserCosmetics(userData);
  const badgePart = badgeIcon
    ? `<span title="Badge XP" style="font-size:1rem; line-height:1;">${badgeIcon}</span>`
    : "";
  const titlePart = showTitle && userData.equippedTitle && userData.equippedTitle !== "title-base"
    ? `<span style="display:inline-block; padding:2px 8px; border-radius:999px; background:rgba(56,189,248,0.16); border:1px solid rgba(56,189,248,0.35); color:#38bdf8; font-size:0.7rem; font-weight:800;">${escapeHtml(titleText)}</span>`
    : "";
  return `${badgePart} ${titlePart}`;
}

/**
 * Monta il Pannello Admin XP (solo per Rappresentanti, nascosto in Vista Studente)
 * dentro qualsiasi contenitore HTML (es. Negozio XP o Classifica).
 */
export function mountRepXpAdminPanel(targetContainer, currentUser) {
  if (!targetContainer || !currentUser || !isRappresentante(currentUser)) return;
  if (document.getElementById("repXpAdminCard")) return;

  const panel = document.createElement("section");
  panel.id = "repXpAdminCard";
  panel.style.cssText = `
    margin: 18px 0;
    padding: 18px 20px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.14), rgba(217, 119, 6, 0.08));
    border: 1.5px solid rgba(251, 191, 36, 0.48);
    box-shadow: 0 12px 30px rgba(0, 0, 0, 0.25);
  `;

  panel.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px; margin-bottom:12px;">
      <div>
        <strong style="font-size:1rem; color:#fbbf24;">👑 Pannello Gestione XP 1BI (Solo Rappresentanti)</strong>
        <div style="font-size:0.78rem; opacity:0.85;">Assegna o rimuovi punti XP a qualsiasi compagno o a te stesso in tempo reale</div>
      </div>
      <span id="repSelectedUserXpBadge" style="padding:5px 12px; border-radius:999px; background:rgba(15,23,42,0.65); border:1px solid rgba(251,191,36,0.4); color:#fde68a; font-weight:900; font-size:0.82rem;">
        ⚡ Saldo attuale: -- XP
      </span>
    </div>

    <div style="display:grid; grid-template-columns: 1.4fr 0.8fr auto auto auto; gap:10px; align-items:center;">
      <select id="repXpUserSelect" style="padding:10px 12px; border-radius:10px; border:1px solid rgba(148,163,184,0.3); background:rgba(15,23,42,0.85); color:#f8fafc; font-weight:700; font-size:0.84rem;">
        <option value="">Caricamento compagni...</option>
      </select>

      <input type="number" id="repXpAmountInput" min="1" step="10" value="500" placeholder="Quantità XP"
        style="padding:10px 12px; border-radius:10px; border:1px solid rgba(148,163,184,0.3); background:rgba(15,23,42,0.85); color:#f8fafc; font-weight:800; font-size:0.86rem;" />

      <button type="button" id="repAddXpBtn"
        style="padding:10px 14px; border-radius:10px; border:none; background:#10b981; color:#fff; font-weight:900; font-size:0.82rem; cursor:pointer; white-space:nowrap;">
        ➕ Aggiungi XP
      </button>

      <button type="button" id="repSubXpBtn"
        style="padding:10px 14px; border-radius:10px; border:none; background:#ef4444; color:#fff; font-weight:900; font-size:0.82rem; cursor:pointer; white-space:nowrap;">
        ➖ Rimuovi XP
      </button>

      <button type="button" id="repSetXpBtn"
        style="padding:10px 14px; border-radius:10px; border:1px solid rgba(251,191,36,0.5); background:rgba(245,158,11,0.2); color:#fbbf24; font-weight:900; font-size:0.82rem; cursor:pointer; white-space:nowrap;">
        🎯 Imposta Esatti
      </button>
    </div>

    <div id="repXpFeedbackMsg" style="margin-top:8px; font-size:0.78rem; font-weight:800; color:#34d399; display:none;"></div>
  `;

  targetContainer.prepend(panel);

  let usersMap = {};
  const selectEl = document.getElementById("repXpUserSelect");
  const amountEl = document.getElementById("repXpAmountInput");
  const badgeEl = document.getElementById("repSelectedUserXpBadge");
  const feedbackEl = document.getElementById("repXpFeedbackMsg");

  function refreshSelectedBadge() {
    const uid = selectEl.value;
    const u = usersMap[uid];
    if (!u) {
      badgeEl.textContent = "⚡ Saldo attuale: -- XP";
      return;
    }
    const curXp = Number(u.xp ?? u.punti ?? 0);
    badgeEl.textContent = `⚡ Saldo attuale: ${curXp} XP`;
  }

  selectEl.addEventListener("change", refreshSelectedBadge);

  onSnapshot(collection(db, "utenti_registrati"), (snap) => {
    const prevSelected = selectEl.value || currentUser.uid;
    usersMap = {};
    const list = [];

    snap.forEach(d => {
      const data = { id: d.id, ...d.data() };
      usersMap[d.id] = data;
      list.push(data);
    });

    list.sort((a, b) => (a.nome || a.nomeCompleto || "").localeCompare(b.nome || b.nomeCompleto || "", "it"));

    selectEl.innerHTML = list.map(u => {
      const label = u.nome || u.nomeCompleto || u.email || "Studente";
      const curXp = Number(u.xp ?? u.punti ?? 0);
      const isMe = u.id === currentUser.uid ? " (Tu)" : "";
      return `<option value="${u.id}">${escapeHtml(label)}${isMe} — ${curXp} XP</option>`;
    }).join("");

    if (usersMap[prevSelected]) {
      selectEl.value = prevSelected;
    }
    refreshSelectedBadge();
  });

  async function applyXpChange(mode) {
    const uid = selectEl.value;
    const u = usersMap[uid];
    const qty = Math.abs(Math.floor(Number(amountEl.value) || 0));
    if (!uid || !u || qty <= 0) return;

    const currentXp = Number(u.xp ?? u.punti ?? 0);
    let newXp = currentXp;

    if (mode === "add") newXp = currentXp + qty;
    if (mode === "sub") newXp = Math.max(0, currentXp - qty);
    if (mode === "set") newXp = qty;

    await updateDoc(doc(db, "utenti_registrati", uid), {
      xp: newXp,
      punti: newXp
    });

    const targetName = u.nome || u.nomeCompleto || "Studente";
    feedbackEl.style.display = "block";
    feedbackEl.textContent = `✅ Aggiornato ${targetName}: ora ha ${newXp} XP!`;
    setTimeout(() => { feedbackEl.style.display = "none"; }, 3200);
  }

  document.getElementById("repAddXpBtn").addEventListener("click", () => applyXpChange("add"));
  document.getElementById("repSubXpBtn").addEventListener("click", () => applyXpChange("sub"));
  document.getElementById("repSetXpBtn").addEventListener("click", () => applyXpChange("set"));
}

function escapeHtml(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}