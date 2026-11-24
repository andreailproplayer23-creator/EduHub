// js/firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const firebaseConfig = {
  apiKey: "AIzaSyBMRPqklv9jO2ckE5Ua3CaXkObVapw0p4Q",
  authDomain: "eduhub-b2889.firebaseapp.com",
  projectId: "eduhub-b2889",
  storageBucket: "eduhub-b2889.firebasestorage.app",
  messagingSenderId: "997309378293",
  appId: "1:997309378293:web:7ffe5bfc97b37a0f63dfbc"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
export const storage = getStorage(app);