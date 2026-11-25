import { db } from "./firebase-config.js";
import { collection, onSnapshot, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const STORAGE_SEEN_KEY = "eduhub_notif_last_seen_ms_1bi";
const STORAGE_PUSH_PAUSED_KEY = "eduhub_notif_push_paused_1bi";

let isInitialized = false;
let allNotifications = [];
let seenTimestampMs = parseInt(localStorage.getItem(STORAGE_SEEN_KEY) || String(Date.now() - 86400000 * 3), 10);
let pushPaused = localStorage.getItem(STORAGE_PUSH_PAUSED_KEY) === "true";
const announcedIds = new Set();
let isInitialLoadDone = false;

function parseTimeMs(val) {
  if (!val) return 0;
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const t = Date.parse(val);
    return isNaN(t) ? 0 : t;
  }
  if (val.toMillis) return val.toMillis();
  return 0;
}

export function initNotificationCenter(currentUser) {
  if (isInitialized) return;
  const topbarRight = document.querySelector(".topbar-right");
  if (!topbarRight) return;
  isInitialized = true;

  const isInsideModules = window.location.pathname.includes("/modules/");
  const basePrefix = isInsideModules ? "../" : "";

  const wrapper = document.createElement("div");
  wrapper.className = "notif-wrapper";
  wrapper.id = "notifWrapper";
  wrapper.innerHTML = `
    <button type="button" id="notifBellBtn" class="notif-bell-btn" title="Notifiche Classe 1BI">
      <i data-lucide="bell" style="width: 18px; height: 18px;"></i>
      <span id="notifBadgeCount" class="notif-badge-count">0</span>
    </button>

    <div id="notifDropdown" class="notif-dropdown">
      <div class="notif-drop-header">
        <div style="display: flex; align-items: center; gap: 7px;">
          <i data-lucide="bell-ring" style="width: 16px; height: 16px; color: #38bdf8;"></i>
          <strong style="font-size: 0.9rem;">Notifiche 1BI</strong>
        </div>
        <button type="button" id="markAllNotifReadBtn" class="notif-mark-read-btn">Segna tutte lette</button>
      </div>

      <div class="notif-push-bar">
        <span>Notifiche Push & Avvisi</span>
        <button type="button" id="togglePushPauseBtn" class="notif-toggle-pill ${pushPaused ? "paused" : "active"}">
          ${pushPaused ? "⏸ Sospese" : "🔔 Attive"}
        </button>
      </div>

      <div id="notifListBody" class="notif-list-body">
        <div style="padding: 22px; text-align: center; font-size: 0.82rem; color: var(--text-muted);">
          Caricamento notifiche...
        </div>
      </div>
    </div>
  `;

  topbarRight.insertBefore(wrapper, topbarRight.firstChild);
  if (window.lucide) window.lucide.createIcons();

  const bellBtn = document.getElementById("notifBellBtn");
  const dropdown = document.getElementById("notifDropdown");
  const markReadBtn = document.getElementById("markAllNotifReadBtn");
  const togglePushBtn = document.getElementById("togglePushPauseBtn");

  bellBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isOpen = dropdown.classList.toggle("open");
    bellBtn.classList.toggle("active", isOpen);
    if (isOpen) renderNotifications(true);
  });

  dropdown.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  document.addEventListener("click", () => {
    if (dropdown.classList.contains("open")) {
      dropdown.classList.remove("open");
      bellBtn.classList.remove("active");
    }
  });

  markReadBtn.addEventListener("click", () => {
    seenTimestampMs = Date.now();
    localStorage.setItem(STORAGE_SEEN_KEY, String(seenTimestampMs));
    renderNotifications(false);
  });

  togglePushBtn.addEventListener("click", async () => {
    pushPaused = !pushPaused;
    localStorage.setItem(STORAGE_PUSH_PAUSED_KEY, String(pushPaused));

    if (!pushPaused && "Notification" in window && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch (e) {}
    }

    togglePushBtn.className = `notif-toggle-pill ${pushPaused ? "paused" : "active"}`;
    togglePushBtn.textContent = pushPaused ? "⏸ Sospese" : "🔔 Attive";
  });

  const categoryItems = new Map();

  function updateCategory(catKey, items) {
    categoryItems.set(catKey, items);
    const merged = [];
    categoryItems.forEach(list => merged.push(...list));
    merged.sort((a, b) => b.timeMs - a.timeMs);
    allNotifications = merged.slice(0, 40);

    if (isInitialLoadDone && !pushPaused) {
      allNotifications.forEach(item => {
        if (!announcedIds.has(item.id) && item.timeMs > seenTimestampMs && item.authorUid !== currentUser?.uid) {
          announcedIds.add(item.id);
          triggerBrowserPush(item);
        }
      });
    } else {
      allNotifications.forEach(item => announcedIds.add(item.id));
    }

    renderNotifications(dropdown.classList.contains("open"));
  }

  function triggerBrowserPush(item) {
    if (!("Notification" in window)) return;
    if (Notification.permission === "granted") {
      try {
        new Notification(`EduHub 1BI • ${item.category}`, {
          body: `${item.title} (${item.author})`
        });
      } catch (e) {}
    }
  }

  function renderNotifications(animateItems = false) {
    const listBody = document.getElementById("notifListBody");
    const badge = document.getElementById("notifBadgeCount");
    const bell = document.getElementById("notifBellBtn");
    if (!listBody || !badge || !bell) return;

    const unreadCount = allNotifications.filter(n => n.timeMs > seenTimestampMs && n.authorUid !== currentUser?.uid).length;

    if (unreadCount > 0) {
      badge.style.display = "inline-flex";
      badge.textContent = unreadCount > 9 ? "9+" : String(unreadCount);
      bell.classList.add("has-unread");
    } else {
      badge.style.display = "none";
      bell.classList.remove("has-unread");
    }

    if (allNotifications.length === 0) {
      listBody.innerHTML = `<div style="padding: 22px; text-align: center; font-size: 0.82rem; color: var(--text-muted);">Nessuna pubblicazione recente.</div>`;
      return;
    }

    listBody.innerHTML = "";
    allNotifications.forEach((n, index) => {
      const isUnread = n.timeMs > seenTimestampMs && n.authorUid !== currentUser?.uid;
      const dateLabel = n.timeMs > 0
        ? new Date(n.timeMs).toLocaleString("it-IT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
        : "";

      const a = document.createElement("a");
      a.className = `notif-item ${isUnread ? "unread" : ""}`;
      a.href = n.link;
      if (animateItems) {
        a.style.animationDelay = `${Math.min(index * 0.04, 0.35)}s`;
      } else {
        a.style.opacity = "1";
        a.style.animation = "none";
      }

      a.addEventListener("click", () => {
        seenTimestampMs = Date.now();
        localStorage.setItem(STORAGE_SEEN_KEY, String(seenTimestampMs));
      });

      a.innerHTML = `
        <div class="notif-item-icon" style="background: ${n.bg}; color: ${n.color};">${n.emoji}</div>
        <div style="flex: 1; min-width: 0;">
          <div style="display: flex; justify-content: space-between; gap: 6px; font-size: 0.7rem; font-weight: 800; color: ${n.color}; text-transform: uppercase;">
            <span>${n.category}</span>
            <span style="color: var(--text-muted); font-weight: 600;">${dateLabel}</span>
          </div>
          <div style="font-size: 0.82rem; font-weight: 800; margin-top: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${n.title}
          </div>
          <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 1px;">
            Da ${n.author}
          </div>
        </div>
      `;
      listBody.appendChild(a);
    });
  }

  // ASCOLTO SOLO NUOVE PUBBLICAZIONI (IGNORA LE MODIFICHE "modified")
  function listenAddedOnly(colName, mapper) {
    const q = query(collection(db, colName), orderBy("creatoIl", "desc"), limit(8));
    const currentItems = new Map();

    onSnapshot(q, (snap) => {
      snap.docChanges().forEach(change => {
        if (change.type === "added") {
          const mapped = mapper(change.doc.id, change.doc.data());
          if (mapped) currentItems.set(change.doc.id, mapped);
        } else if (change.type === "removed") {
          currentItems.delete(change.doc.id);
        }
      });
      updateCategory(colName, Array.from(currentItems.values()));
    }, (err) => {
      console.warn("Notifiche listener skip:", colName, err);
    });
  }

  // 1. Bacheca 1BI
  listenAddedOnly("bacheca_1bi", (id, d) => ({
    id: "bach_" + id,
    category: "Bacheca 1BI",
    title: d.titolo || d.testo || "Nuovo avviso in bacheca",
    author: d.autore || "Rappresentanti 1BI",
    authorUid: d.autoreUid || "",
    timeMs: parseTimeMs(d.creatoIl),
    link: `${basePrefix}modules/bacheca.html`,
    emoji: "📢",
    color: "#f87171",
    bg: "rgba(239,68,68,0.16)"
  }));

  // 2. Verifiche & Interrogazioni
  listenAddedOnly("verifiche_1bi", (id, d) => ({
    id: "ver_" + id,
    category: "Nuova Verifica",
    title: `${d.materia || "Verifica"}: ${d.argomento || ""}`,
    author: d.autore || "Classe 1BI",
    authorUid: d.autoreUid || "",
    timeMs: parseTimeMs(d.creatoIl),
    link: `${basePrefix}modules/verifiche.html`,
    emoji: "📅",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.16)"
  }));

  // 3. Appunti & Schemi
  listenAddedOnly("appunti_1bi", (id, d) => ({
    id: "app_" + id,
    category: "Nuovo Appunto",
    title: `${d.materia || "Appunto"} - ${d.titolo || ""}`,
    author: d.autore || "Studente 1BI",
    authorUid: d.autoreUid || "",
    timeMs: parseTimeMs(d.creatoIl),
    link: `${basePrefix}modules/appunti.html`,
    emoji: "📚",
    color: "#10b981",
    bg: "rgba(16,185,129,0.16)"
  }));

  // 4. Progetti & Cartelle
  listenAddedOnly("progetti_items_1bi", (id, d) => ({
    id: "proj_" + id,
    category: d.type === "folder" ? "Nuova Cartella" : "File Progetto",
    title: d.name || "Nuovo elemento condiviso",
    author: d.autore || "Studente 1BI",
    authorUid: d.autoreUid || "",
    timeMs: parseTimeMs(d.creatoIl),
    link: `${basePrefix}modules/appunti.html`,
    emoji: d.type === "folder" ? "📁" : "📄",
    color: "#38bdf8",
    bg: "rgba(56,189,248,0.16)"
  }));

  // 5. Forum Q&A 1BI
  listenAddedOnly("forum_qa_1bi", (id, d) => ({
    id: "qa_" + id,
    category: "Domanda Q&A",
    title: d.titolo || "Nuova domanda in Q&A",
    author: d.autore || "Studente 1BI",
    authorUid: d.autoreUid || "",
    timeMs: parseTimeMs(d.creatoIl),
    link: `${basePrefix}modules/chat.html`,
    emoji: "💡",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.16)"
  }));

  // 6. Chat Live 1BI
  listenAddedOnly("chat_1bi", (id, d) => ({
    id: "chat_" + id,
    category: "Chat Live 1BI",
    title: d.testo || "Nuovo messaggio in chat",
    author: d.autore || "Compagno 1BI",
    authorUid: d.autoreUid || "",
    timeMs: parseTimeMs(d.creatoIl),
    link: `${basePrefix}modules/chat.html`,
    emoji: "💬",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.16)"
  }));

  // 7. Countdown & Ponti 1BI
  listenAddedOnly("countdown_1bi", (id, d) => ({
    id: "cd_" + id,
    category: "Countdown & Ponti",
    title: `${d.titolo || "Nuova data"} (${d.data ? new Date(d.data).toLocaleDateString("it-IT") : ""})`,
    author: d.creatoDa || "Rappresentanti 1BI",
    authorUid: d.autoreUid || "",
    timeMs: parseTimeMs(d.creatoIl),
    link: `${basePrefix}modules/countdown.html`,
    emoji: "🎉",
    color: "#fbbf24",
    bg: "rgba(245,158,11,0.16)"
  }));

  setTimeout(() => {
    isInitialLoadDone = true;
  }, 2000);
}