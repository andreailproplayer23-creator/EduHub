// js/auth.js
import { auth, googleProvider, db } from "./firebase-config.js";
import { initNotificationCenter } from "./notifications.js";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithPopup,
  onAuthStateChanged,
  signOut,
  deleteUser
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// EMAIL DEI RAPPRESENTANTI DI CLASSE (Andrea & Ale)
export const RAPPRESENTANTI_EMAILS = [
  "andrea.marcorin@cvv.org",
  "andrea.ilproplayer23@gmail.com",
  "alessandromoreschi.712@gmail.com"
];

// Verifica il ruolo reale dell'account (ignora la simulazione studente)
export function isRealRappresentante(userOrEmail) {
  if (!userOrEmail) return false;
  const whitelist = RAPPRESENTANTI_EMAILS.map(e => e.trim().toLowerCase());

  if (typeof userOrEmail === "string") {
    return whitelist.includes(userOrEmail.trim().toLowerCase());
  }

  const emailsToCheck = [
    userOrEmail.email,
    ...(userOrEmail.providerData || []).map(p => p.email)
  ].filter(Boolean);

  return emailsToCheck.some(em => whitelist.includes(em.trim().toLowerCase()));
}

export function isStudentPreviewActive() {
  return sessionStorage.getItem("eduhub_student_preview") === "1";
}

// Restituisce false quando il Rappresentante attiva "Vista Studente"
export function isRappresentante(userOrEmail) {
  if (isStudentPreviewActive()) return false;
  return isRealRappresentante(userOrEmail);
}

function setupStudentViewToggle(user) {
  const realRep = isRealRappresentante(user);
  const previewActive = isStudentPreviewActive();

  window.eduhubRealRep = realRep;
  window.eduhubIsRep = realRep && !previewActive;

  if (!realRep) return;

  // 1. Aggiunge il pulsante nella topbar (solo per i Rappresentanti)
  const topbarRight = document.querySelector(".topbar-right");
  if (topbarRight && !document.getElementById("studentViewToggleBtn")) {
    const toggleBtn = document.createElement("button");
    toggleBtn.type = "button";
    toggleBtn.id = "studentViewToggleBtn";
    toggleBtn.style.cssText = previewActive
      ? "padding:6px 12px; border-radius:999px; border:1px solid #fbbf24; background:rgba(245,158,11,0.2); color:#fbbf24; font-weight:800; font-size:0.75rem; cursor:pointer; white-space:nowrap;"
      : "padding:6px 12px; border-radius:999px; border:1px solid rgba(56,189,248,0.45); background:rgba(56,189,248,0.14); color:#38bdf8; font-weight:800; font-size:0.75rem; cursor:pointer; white-space:nowrap;";

    toggleBtn.textContent = previewActive ? "👑 Torna Rappresentante" : "👁️ Vista Studente";
    toggleBtn.title = "Simula l'interfaccia e i permessi di uno studente normale";

    toggleBtn.addEventListener("click", () => {
      if (isStudentPreviewActive()) {
        sessionStorage.removeItem("eduhub_student_preview");
      } else {
        sessionStorage.setItem("eduhub_student_preview", "1");
      }
      window.location.reload();
    });

    topbarRight.insertBefore(toggleBtn, topbarRight.firstChild);
  }

  // 2. Aggiorna il badge ruolo nella topbar durante la simulazione
  const roleBadge = document.querySelector(".badge-role");
  if (roleBadge && previewActive) {
    roleBadge.textContent = "VISTA STUDENTE";
    roleBadge.style.background = "rgba(245, 158, 11, 0.2)";
    roleBadge.style.color = "#fbbf24";
  }

  // 3. Banner in cima alla pagina quando la Vista Studente è attiva
  if (previewActive && !document.getElementById("studentPreviewBanner")) {
    const banner = document.createElement("div");
    banner.id = "studentPreviewBanner";
    banner.style.cssText = `
      background: linear-gradient(90deg, rgba(245,158,11,0.22), rgba(234,88,12,0.22));
      border-bottom: 1px solid rgba(251,191,36,0.45);
      color: #fde68a;
      padding: 8px 16px;
      font-size: 0.78rem;
      font-weight: 800;
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      text-align: center;
    `;
    banner.innerHTML = `
      <span>👁️ MODALITÀ VISTA STUDENTE ATTIVA — Stai vedendo il sito esattamente come i tuoi compagni</span>
      <button type="button" id="exitStudentPreviewBannerBtn" style="padding:4px 11px; border-radius:999px; border:none; background:#fbbf24; color:#0f172a; font-weight:900; font-size:0.74rem; cursor:pointer;">
        Torna Rappresentante
      </button>
    `;
    document.body.insertBefore(banner, document.body.firstChild);

    document.getElementById("exitStudentPreviewBannerBtn").addEventListener("click", () => {
      sessionStorage.removeItem("eduhub_student_preview");
      window.location.reload();
    });
  }
}

const isLoginPage = window.location.pathname.endsWith("index.html") ||
                    window.location.pathname.endsWith("/EduHub/") ||
                    window.location.pathname === "/";
const isModulePage = window.location.pathname.includes("/modules/");

const authForm = document.getElementById("authForm");
const toggleModeBtn = document.getElementById("toggleMode") || document.getElementById("toggleModeBtn");
const googleBtn = document.getElementById("googleLoginBtn") || document.getElementById("googleBtn");
const googleBtnText = document.getElementById("googleBtnText");
const errorBox = document.getElementById("errorBox");

let isRegisterMode = false;
let checkingGoogleAuth = false;

function showError(msg) {
  if (!errorBox) return;
  errorBox.textContent = msg;
  errorBox.style.display = "block";
}

function setAuthMode(register) {
  isRegisterMode = register;
  if (!authForm) return;
  const nameGroup = document.getElementById("nameGroup");
  const submitBtn = document.getElementById("submitBtn");
  if (nameGroup) nameGroup.style.display = isRegisterMode ? "block" : "none";
  if (submitBtn) submitBtn.textContent = isRegisterMode ? "REGISTRATI" : "ACCEDI";
  if (googleBtnText) {
    googleBtnText.textContent = isRegisterMode ? "Registrati con Google" : "Accedi con Google";
  }
  if (toggleModeBtn) {
    toggleModeBtn.textContent = isRegisterMode ? "Hai già un account? Accedi" : "Nuovo compagno? Registrati";
  }
}

onAuthStateChanged(auth, async (user) => {
  if (checkingGoogleAuth) return;

  if (user && isLoginPage) {
    window.location.href = "dashboard.html";
  } else if (!user && !isLoginPage) {
    window.location.href = isModulePage ? "../index.html" : "index.html";
  } else if (user && !isLoginPage) {
    const displayName = user.displayName || (user.email ? user.email.split("@")[0] : "Studente");
    // Salva su Firestore sempre il ruolo reale dell'account
    const ruoloReale = isRealRappresentante(user) ? "rappresentante" : "studente";

    // Attiva pulsante "Vista Studente" nella topbar se sei Rappresentante
    setupStudentViewToggle(user);

    // Pesca l'immagine profilo sia da user.photoURL che dal provider Google
    const googlePhoto = user.photoURL || (user.providerData || []).find(p => p.photoURL)?.photoURL || "";

    try {
      const payload = {
        ruolo: ruoloReale,
        classe: "1BI"
      };
      if (user.displayName) payload.nome = user.displayName;
      if (user.email) payload.email = user.email;
      if (googlePhoto) payload.photoURL = googlePhoto;

      await setDoc(doc(db, "utenti_registrati", user.uid), payload, { merge: true });
    } catch (e) {}

    const nameEl = document.getElementById("userDisplayName");
    const welcomeNameEl = document.getElementById("welcomeUserName");
    const avatarEl = document.getElementById("navAvatar");

    if (nameEl) nameEl.textContent = displayName.toUpperCase();
    if (welcomeNameEl) welcomeNameEl.textContent = displayName.split(" ")[0];

    if (avatarEl) {
      if (googlePhoto) {
        avatarEl.innerHTML = `<img src="${googlePhoto}" alt="Avatar" referrerpolicy="no-referrer" />`;
      } else {
        avatarEl.textContent = displayName.charAt(0).toUpperCase();
      }
    }

    initNotificationCenter(user);
  }
});

if (toggleModeBtn) {
  toggleModeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    setAuthMode(!isRegisterMode);
    if (errorBox) errorBox.style.display = "none";
  });
}

if (authForm) {
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (errorBox) errorBox.style.display = "none";

    const email = document.getElementById("emailInput").value.trim();
    const password = document.getElementById("passwordInput").value;
    const fullName = document.getElementById("nameInput")?.value.trim();

    try {
      if (isRegisterMode) {
        if (!fullName) {
          showError("Inserisci il tuo Nome e Cognome per registrarti.");
          return;
        }
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(cred.user, { displayName: fullName });

        await setDoc(doc(db, "utenti_registrati", cred.user.uid), {
          nome: fullName,
          email: email,
          photoURL: "",
          classe: "1BI",
          ruolo: isRealRappresentante(email) ? "rappresentante" : "studente",
          descrizione: "Ciao! Sono nella 1BI Informatica.",
          metodo: "email",
          registratoIl: Date.now()
        });

        window.location.href = "dashboard.html";
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (err) {
      if (err.code === "auth/invalid-credential" || err.code === "auth/wrong-password" || err.code === "auth/user-not-found") {
        showError("Email o password errati. Riprova oppure registrati.");
      } else if (err.code === "auth/email-already-in-use") {
        showError("Questa email è già registrata! Passa ad Accedi.");
      } else if (err.code === "auth/weak-password") {
        showError("La password deve avere almeno 6 caratteri.");
      } else {
        showError("Errore: " + err.message);
      }
    }
  });
}

if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    if (errorBox) errorBox.style.display = "none";
    checkingGoogleAuth = true;

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDocRef = doc(db, "utenti_registrati", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!isRegisterMode && !userDoc.exists()) {
        await deleteUser(user);
        checkingGoogleAuth = false;
        setAuthMode(true);
        showError("Account Google non ancora registrato su EduHub! Clicca ora su 'Registrati con Google'.");
        return;
      }

      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          nome: user.displayName || user.email.split("@")[0],
          email: user.email,
          photoURL: user.photoURL || "",
          classe: "1BI",
          ruolo: isRealRappresentante(user) ? "rappresentante" : "studente",
          descrizione: "Ciao! Sono nella 1BI Informatica.",
          metodo: "google",
          registratoIl: Date.now()
        });
      } else if (user.photoURL) {
        await setDoc(userDocRef, {
          photoURL: user.photoURL,
          nome: user.displayName || userDoc.data().nome || user.email.split("@")[0]
        }, { merge: true });
      }

      checkingGoogleAuth = false;
      window.location.href = "dashboard.html";
    } catch (err) {
      checkingGoogleAuth = false;
      console.error("Errore Google Auth:", err.code, err.message);
      if (err.code === "auth/unauthorized-domain") {
        showError("Dominio GitHub Pages non autorizzato su Firebase Authentication!");
      } else if (err.code === "auth/popup-closed-by-user") {
        showError("Finestra di accesso Google chiusa prima di completare.");
      } else {
        showError("Errore Google (" + err.code + "): " + err.message);
      }
    }
  });
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    sessionStorage.removeItem("eduhub_student_preview");
    await signOut(auth);
  });
}