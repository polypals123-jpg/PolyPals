// firebase-config.js

// Initialize Firebase App
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyC30aRXpIJml1seBsKg5b1lz0uKomGPaGE",
  authDomain: "polypals-a3dff.firebaseapp.com",
  projectId: "polypals-a3dff",
  storageBucket: "polypals-a3dff.firebasestorage.app",
  messagingSenderId: "790460205163",
  appId: "1:790460205163:web:cc18b4d834580411c6892e",
  measurementId: "G-LHSGNHVP1H"
};

// Make sure Firebase is initialized only once
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

// ✅ Global references (use everywhere in project)
window.auth = firebase.auth();
window.db = firebase.firestore();
window.storage = firebase.storage();

console.log("🔥 Firebase initialized globally");
