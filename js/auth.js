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
  "alessandromoreschi712@gmail.com"
];

export function isRappresentante(email) {
  if (!email) return false;
  return RAPPRESENTANTI_EMAILS.map(e => e.toLowerCase()).includes(email.toLowerCase());
}

const isLoginPage = window.location.pathname.endsWith("index.html") || window.location.pathname.endsWith("/");
const isModulePage = window.location.pathname.includes("/modules/");

let isRegisterMode = false;
let checkingGoogleAuth = false;

const authForm = document.getElementById("authForm");
const toggleModeBtn = document.getElementById("toggleMode");
const googleBtn = document.getElementById("googleLoginBtn");
const googleBtnText = document.getElementById("googleBtnText");
const errorBox = document.getElementById("errorBox");

function showError(msg) {
  if (!errorBox) return;
  errorBox.textContent = msg;
  errorBox.style.display = "block";
}

function setAuthMode(register) {
  isRegisterMode = register;
  if (!authForm) return;
  document.getElementById("nameGroup").style.display = isRegisterMode ? "block" : "none";
  document.getElementById("submitBtn").textContent = isRegisterMode ? "REGISTRATI" : "ACCEDI";
  if (googleBtnText) {
    googleBtnText.textContent = isRegisterMode ? "Registrati con Google" : "Accedi con Google";
  }
  toggleModeBtn.textContent = isRegisterMode ? "Hai già un account? Accedi" : "Nuovo compagno? Registrati";
}

onAuthStateChanged(auth, async (user) => {
  if (checkingGoogleAuth) return;

  if (user && isLoginPage) {
    window.location.href = "dashboard.html";
  } else if (!user && !isLoginPage) {
    window.location.href = isModulePage ? "../index.html" : "index.html";
  } else if (user && !isLoginPage) {
    const displayName = user.displayName || user.email.split("@")[0];
    const ruolo = isRappresentante(user.email) ? "rappresentante" : "studente";

    // Sincronizza il ruolo su Firestore automaticamente
    await setDoc(doc(db, "utenti_registrati", user.uid), {
      ruolo: ruolo
    }, { merge: true });

    const nameEl = document.getElementById("userDisplayName");
    const welcomeNameEl = document.getElementById("welcomeUserName");
    const avatarEl = document.getElementById("navAvatar");

    if (nameEl) nameEl.textContent = displayName.toUpperCase();
    if (welcomeNameEl) welcomeNameEl.textContent = displayName.split(" ")[0];

    if (avatarEl) {
      if (user.photoURL) {
        avatarEl.innerHTML = `<img src="${user.photoURL}" alt="Avatar" />`;
      } else {
        avatarEl.textContent = displayName.charAt(0).toUpperCase();
      }
    }

    // Inizializza la campanellina notifiche live nella topbar
    initNotificationCenter(user);
  }
});

if (toggleModeBtn) {
  toggleModeBtn.addEventListener("click", () => {
    setAuthMode(!isRegisterMode);
    if (errorBox) errorBox.style.display = "none";
  });
}

if (authForm) {
  authForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.style.display = "none";

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
          classe: "1BI",
          ruolo: isRappresentante(email) ? "rappresentante" : "studente",
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
    errorBox.style.display = "none";
    checkingGoogleAuth = true;

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const userDocRef = doc(db, "utenti_registrati", user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!isRegisterMode) {
        if (!userDoc.exists()) {
          await deleteUser(user);
          checkingGoogleAuth = false;
          setAuthMode(true);
          showError("Account Google non registrato su EduHub! Completa la registrazione qui sotto.");
          return;
        }
        checkingGoogleAuth = false;
        window.location.href = "dashboard.html";
      } else {
        if (!userDoc.exists()) {
          await setDoc(userDocRef, {
            nome: user.displayName || user.email.split("@")[0],
            email: user.email,
            classe: "1BI",
            ruolo: isRappresentante(user.email) ? "rappresentante" : "studente",
            descrizione: "Ciao! Sono nella 1BI Informatica.",
            metodo: "google",
            registratoIl: Date.now()
          });
        }
        checkingGoogleAuth = false;
        window.location.href = "dashboard.html";
      }
    } catch (err) {
      checkingGoogleAuth = false;
      showError("Operazione con Google annullata o non riuscita.");
    }
  });
}

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
  });
}