// index.js

// ✅ Reuse Firebase globals from firebase-config.js
const auth = window.auth;
const db = window.db;

// Store session values in variables (for later use in feed)
let uid = null;
let polyId = null;
let role = null;

// -----------------------------
// 🔐 AUTH + SESSION HANDLING
// -----------------------------
auth.onAuthStateChanged((user) => {
  const popup = document.getElementById("loginPopup");

  // 🧩 Read new session keys (set during login)
  const storedUID = localStorage.getItem("userUID");
  const storedPolyId = localStorage.getItem("userHomePolyId");
  const storedRole = localStorage.getItem("userRole");

  // If user not logged in or session missing
  if (!user || !storedUID || !storedPolyId || !storedRole) {
    console.warn("⚠️ No active session found. Showing login popup...");
    popup.style.display = "flex";
    return;
  }

  // ✅ Valid session
  popup.style.display = "none";
  console.log("✅ Logged in:", user.email);

  // Set local variables for feed usage
  uid = storedUID;
  polyId = storedPolyId;
  role = storedRole;

  console.log("📌 Active session:", { uid, polyId, role });

  // 🧹 Clear any leftover public-view data (avoid cross-profile bug)
  localStorage.removeItem("publicUserId");
  localStorage.removeItem("publicUserPolyId");

  // ⚡ Example usage: Load your feed
  // const postsRef = db.collection("polys").doc(polyId).collection("posts");
  // postsRef.orderBy("createdAt", "desc").onSnapshot(...);
});

// Redirect from popup → Login
document.getElementById("goLogin").addEventListener("click", () => {
  window.location.href = "../../login_&_sign_up1/login.html";
});

// -----------------------------
// 🎨 THEME APPLICATION
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {
  const bgVideo = document.getElementById("bgVideo");

  const savedTheme = localStorage.getItem("profileTheme");
  const savedType = localStorage.getItem("profileThemeType");

  if (savedTheme && savedType) {
    if (savedType === "image") {
      document.body.style.backgroundImage = `url("${savedTheme}")`;
      document.body.classList.add("theme-bg");
    } else if (savedType === "video") {
      document.body.classList.add("video-theme");
      bgVideo.src = savedTheme;
      bgVideo.load();
      bgVideo.play().catch(() => {});
    }
  }
});

// -----------------------------
// ⚙️ LOAD FLOATING MENU
// -----------------------------
fetch("../floating_icon.html")
  .then(res => res.text())
  .then(html => {
    document.body.insertAdjacentHTML("beforeend", html);

    // Wait until added, then activate toggle logic
    setTimeout(() => {
      const fab = document.querySelector('.fixed-action-btn');
      const mainFab = document.getElementById('mainFab');

      if (!fab || !mainFab) return;

      mainFab.addEventListener('click', () => {
        fab.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!fab.contains(e.target)) fab.classList.remove('active');
      });
    }, 300);
  });

  // ==============================
// 🎯 DAILY CLAIM SYSTEM (4-HOUR COOLDOWN)
// ==============================

function initClaimSystem(uid, polyId, role) {
  const claimBtn = document.getElementById("claimPointsBtn");
  const claimBadge = document.getElementById("claimBadge");

  if (!claimBtn || !claimBadge) {
    console.error("⚠️ Claim button elements not found in DOM");
    return;
  }

  const userRef = db
    .collection("polys")
    .doc(polyId)
    .collection(role + "s")
    .doc(uid);

  const CLAIM_POINTS = 2;
  const CLAIM_COOLDOWN = 4 * 60 * 60 * 1000; // 4 hours in ms

  async function checkClaimStatus() {
    try {
      const doc = await userRef.get();
      if (!doc.exists) {
        console.warn("⚠️ User doc not found in Firestore");
        return;
      }

      const data = doc.data();
      const lastClaim = data.lastClaimTime?.toMillis?.() || 0;
      const now = Date.now();
      const diff = now - lastClaim;

      if (diff >= CLAIM_COOLDOWN) {
        // ✅ Can claim now
        claimBadge.textContent = "+2";
        claimBadge.style.background = "#FFD43B";
        claimBtn.classList.add("active");
      } else {
        // 🕒 Show countdown
        startClaimTimer(CLAIM_COOLDOWN - diff);
      }
    } catch (err) {
      console.error("Claim check error:", err);
    }
  }

  claimBtn.addEventListener("click", async () => {
    try {
      const doc = await userRef.get();
      const lastClaim = doc.data().lastClaimTime?.toMillis?.() || 0;
      const now = Date.now();

      if (now - lastClaim < CLAIM_COOLDOWN) {
        console.log("⏳ Still in cooldown.");
        return;
      }

      // ✅ Update Firestore
      await userRef.update({
        points: firebase.firestore.FieldValue.increment(CLAIM_POINTS),
        lastClaimTime: firebase.firestore.Timestamp.now(),
      });

      claimBadge.textContent = "✔";
      claimBadge.style.background = "#6C63FF";
      claimBtn.classList.remove("active");

      startClaimTimer(CLAIM_COOLDOWN);
    } catch (err) {
      console.error("Claim update error:", err);
    }
  });

  // Start timer display
  function startClaimTimer(ms) {
    let sec = Math.floor(ms / 1000);

    const timer = setInterval(() => {
      if (sec <= 0) {
        clearInterval(timer);
        claimBadge.textContent = "+2";
        claimBadge.style.background = "#FFD43B";
        claimBtn.classList.add("active");
        return;
      }

      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      claimBadge.textContent = `${h}:${m.toString().padStart(2, "0")}`;
      claimBadge.style.background = "#ccc";
      sec--;
    }, 1000);
  }

  checkClaimStatus();
}