document.addEventListener("DOMContentLoaded", () => {
  const gridBtn = document.getElementById("gridView");
  const listBtn = document.getElementById("listView");
  const postsFeed = document.getElementById("postsFeed");
  const pointsEl = document.getElementById("userPoints");
  const polyId = localStorage.getItem("polyId");
  const role = localStorage.getItem("role");
  const auth = firebase.auth();
  const db = firebase.firestore();


  // ================================
  // Grid/List Toggle
  // ================================
  gridBtn.addEventListener("click", () => {
    postsFeed.classList.add("grid-view");
    postsFeed.classList.remove("list-view");
    gridBtn.classList.add("active");
    listBtn.classList.remove("active");
  });
  listBtn.addEventListener("click", () => {
    postsFeed.classList.add("list-view");
    postsFeed.classList.remove("grid-view");
    listBtn.classList.add("active");
    gridBtn.classList.remove("active");
  });

  // ================================
  // Like Toggle
  // ================================
  postsFeed.addEventListener("click", e => {
    if (e.target.classList.contains("like-icon")) {
      e.target.classList.toggle("liked");
    }
  });

  // ================================
  // AI Quiz
  // ================================
  const aiBtn = document.getElementById("aiBtn");
  const aiPanel = document.getElementById("aiPanel");
  const submitAnswer = document.getElementById("submitAnswer");
  const aiQuestion = document.getElementById("aiQuestion");
  const aiAnswer = document.getElementById("aiAnswer");

  const quiz = { question: "What does HTML stand for?", answer: "hypertext markup language" };

  aiBtn.addEventListener("click", () => {
    aiPanel.style.display = aiPanel.style.display === "block" ? "none" : "block";
    aiQuestion.textContent = quiz.question;
  });

  submitAnswer.addEventListener("click", () => {
    let cur = parseInt(pointsEl.textContent) || 0;
    if (aiAnswer.value.trim().toLowerCase() === quiz.answer) {
      pointsEl.textContent = cur + 5;
      alert("✅ Correct! +5 points");
    } else {
      pointsEl.textContent = cur - 2;
      alert("❌ Wrong! -2 points");
    }
    aiAnswer.value = "";
    aiPanel.style.display = "none";
  });

  // ================================
  // Theme System
  // ================================
  const themeBtn = document.querySelector(".theme-btn");
  const themeModal = document.getElementById("themeModal");
  const closeTheme = document.getElementById("closeTheme");
  const resetTheme = document.getElementById("resetTheme");
  const themeOptions = document.querySelectorAll(".theme-option");
  const bgVideo = document.getElementById("bgVideo");

  const savedTheme = localStorage.getItem("profileTheme");
  const savedType = localStorage.getItem("profileThemeType");
  if (savedTheme && savedType) applyTheme(savedTheme, savedType, false);

  themeBtn.addEventListener("click", () => themeModal.style.display = "flex");
  closeTheme.addEventListener("click", () => themeModal.style.display = "none");
  resetTheme.addEventListener("click", () => { resetThemeFunc(); themeModal.style.display="none"; });

  themeOptions.forEach(opt => {
    opt.addEventListener("click", () => {
      let cur = parseInt(pointsEl.textContent) || 0;
      if (cur < 20) { alert("❌ Not enough points"); return; }
      const src = opt.dataset.bg, type = opt.dataset.type;
      applyTheme(src, type, true);
      pointsEl.textContent = cur - 20;
      alert("🎉 Theme applied! -20 points");
      themeModal.style.display="none";
    });
  });

  function applyTheme(src, type, save) {
    if (type === "image") {
      document.body.style.backgroundImage = `url("${src}")`;
      document.body.classList.add("theme-bg");
      document.body.classList.remove("video-theme");
      bgVideo.pause(); bgVideo.removeAttribute("src"); bgVideo.load();
    } else if (type === "video") {
      document.body.style.backgroundImage = "none";
      document.body.classList.remove("theme-bg");
      document.body.classList.add("video-theme");
      bgVideo.src = src; bgVideo.load(); bgVideo.play().catch(()=>{});
    }
    if (save) {
      localStorage.setItem("profileTheme", src);
      localStorage.setItem("profileThemeType", type);
    }
  }

  function resetThemeFunc() {
    document.body.style.backgroundImage="none";
    document.body.classList.remove("theme-bg","video-theme");
    bgVideo.pause(); bgVideo.removeAttribute("src"); bgVideo.load();
    localStorage.removeItem("profileTheme");
    localStorage.removeItem("profileThemeType");
  }

  // ================================
  // Settings Sidebar
  // ================================
  const settingsLink = document.querySelector(".settings-link");
  const sidebar = document.getElementById("settingsSidebar");
  const overlay = document.getElementById("overlay");

  settingsLink.addEventListener("click", () => {
    settingsLink.classList.add("spin");
    setTimeout(() => {
      settingsLink.classList.remove("spin");
      sidebar.classList.add("open");
      overlay.classList.add("active");
    }, 500);
  });

  overlay.addEventListener("click", () => {
    sidebar.classList.remove("open");
    overlay.classList.remove("active");
  });

  // ================================
  // Firebase Auth Session + Profile Load
  // ================================
  firebase.auth().onAuthStateChanged(async (user) => {
  if (!user) {
    window.location.href = "../../login.html";
    return;
  }

  const uid = user.uid;
  console.log("🔑 UID:", uid);
  console.log("📌 PolyId from localStorage:", polyId);
  console.log("📌 Role from localStorage:", role);

  try {
    const docRef = firebase.firestore()
      .collection("polys").doc(polyId)
      .collection(role + "s")  // students / staff
      .doc(uid);

    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data();
      console.log("✅ Firestore profile data:", data);

      document.getElementById("profileName").textContent = data.name || user.email.split("@")[0];
      document.getElementById("profileMatric").textContent = data.matricNo || "";
      document.getElementById("profileGender").textContent = data.gender || "-";
      document.getElementById("profileInstitute").textContent = polyId.toUpperCase();
      document.getElementById("profileCourse").textContent = data.course || "-";
      document.getElementById("profileBio").textContent = data.bio || "No bio yet";

      document.getElementById("profileFollowers").textContent = data.followersCount || 0;
      document.getElementById("profileFollowing").textContent = data.followingCount || 0;
      document.getElementById("userPoints").textContent = data.points || 0;

      if (data.profilePic) {
        document.getElementById("profilePic").src = data.profilePic;
      }
    } else {
      console.warn("⚠️ No Firestore doc found at path polys/" + polyId + "/" + role + "s/" + uid);
    }
  } catch (err) {
    console.error("❌ Error fetching profile:", err);
  }
});

  // ================================
  // Logout Button
  // ================================
  // 🔑 Problem 3: Logout button
const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      await auth.signOut();
      localStorage.clear();
      console.log("✅ Logged out");
      window.location.href = "../../login_&_sign_up1/login.html";
    } catch (err) {
      console.error("❌ Logout error:", err);
      alert("Logout failed, try again.");
    }
  });
}

// Example: Load profile info
auth.onAuthStateChanged(async (user) => {
  if (!user || !localStorage.getItem("uid")) {
    console.warn("⚠️ Not logged in, redirecting...");
    window.location.href = "../../login_&_sign_up1/login.html";
    return;
  }

  const uid = localStorage.getItem("uid");
  const polyId = localStorage.getItem("polyId");
  const role = localStorage.getItem("role");

  try {
    const doc = await db.collection("polys").doc(polyId).collection(role + "s").doc(uid).get();
    if (doc.exists) {
      const data = doc.data();
      document.getElementById("profileName").innerText = data.name || "Unknown";
      document.getElementById("profileBio").innerText = data.bio || "";
      if (data.profilePic) {
        document.getElementById("profilePic").src = data.profilePic;
      }
    }
  } catch (err) {
    console.error("❌ Error loading profile:", err);
  }
});
  });

