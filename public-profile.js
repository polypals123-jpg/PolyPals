// -----------------------------
// 🔥 Firebase Init
// -----------------------------
const db = firebase.firestore();
const auth = firebase.auth();

// -----------------------------
// 🧭 Get User + Poly from URL or localStorage
// -----------------------------
const params = new URLSearchParams(window.location.search);
const uidParam = params.get("uid");
const polyParam = params.get("poly");

const storedUid  = localStorage.getItem("publicUserId");
const storedPoly = localStorage.getItem("publicUserPolyId"); // ✅ correct key


const userId = uidParam || storedUid;
const polyId = polyParam || storedPoly;
const postsFeed = document.getElementById("postsFeed");

if (!userId || !polyId) {
  alert("⚠️ Missing user info. Please open this profile from the search page again.");
  throw new Error("Missing userId or polyId");
}

// -----------------------------
// 🔒 Lock Scroll for Popup
// -----------------------------
function lockScroll(lock) {
  document.body.style.overflow = lock ? "hidden" : "";
}

// -----------------------------
// 👤 Load Public Profile
// -----------------------------
async function loadProfile(uid) {
  let ref  = db.collection("polys").doc(polyId).collection("students").doc(uid);
  let snap = await ref.get();

  if (!snap.exists) {
    ref  = db.collection("polys").doc(polyId).collection("staffs").doc(uid);
    snap = await ref.get();
  }

  if (!snap.exists) {
    document.getElementById("profileName").textContent = "User Not Found";
    return;
  }

  const d = snap.data();

  document.getElementById("profileName").textContent      = d.name || "Unknown";
  document.getElementById("profileCourse").textContent     = d.course || d.department || "-";
  document.getElementById("profileMatric").textContent     = d.matric || d.matricNo || d.staffId || "-";
  document.getElementById("profileGender").textContent     = d.gender || "-";
  document.getElementById("profileInstitute").textContent  = polyId.toUpperCase();
  document.getElementById("profileBio").textContent        = d.bio || "No bio yet";
  document.getElementById("profilePic").src                = d.profilePic || d.photoURL || "https://placehold.co/150x150/6C63FF/FFF?text=User";

  setupFollowButton(uid);
  setupPopupEvents(uid);
  liveStats(uid);
  loadPosts(uid);
  setupMessageButton(uid);
  loadRecentChatPreview(uid);
}

// -----------------------------
// ❤️ FOLLOW / UNFOLLOW (students + staffs, full sync with count fields)
// -----------------------------
async function setupFollowButton(profileUid) {
  const btn = document.getElementById("followBtn");
  if (!btn) return;

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      btn.textContent = "Follow";
      btn.onclick = () => alert("Please log in first!");
      return;
    }

    // 🧍 hide if viewing own profile
    if (user.uid === profileUid) {
      btn.style.display = "none";
      return;
    }

    const profilePoly = localStorage.getItem("publicUserPolyId");
    const currentPoly = localStorage.getItem("userHomePolyId");

    // -------------------------
    // 🔍 Detect target (profile viewed)
    // -------------------------
    let targetCol = "students";
    let targetRef = db.collection("polys").doc(profilePoly).collection("students").doc(profileUid);
    let targetSnap = await targetRef.get();

    if (!targetSnap.exists) {
      targetCol = "staffs";
      targetRef = db.collection("polys").doc(profilePoly).collection("staffs").doc(profileUid);
      targetSnap = await targetRef.get();
    }
    if (!targetSnap.exists) {
      console.warn("❌ Target not found");
      return;
    }

    // -------------------------
    // 🔍 Detect logged-in user
    // -------------------------
    let userCol = "students";
    let userRef = db.collection("polys").doc(currentPoly).collection("students").doc(user.uid);
    let userSnap = await userRef.get();

    if (!userSnap.exists) {
      userCol = "staffs";
      userRef = db.collection("polys").doc(currentPoly).collection("staffs").doc(user.uid);
      userSnap = await userRef.get();
    }
    if (!userSnap.exists) {
      console.warn("❌ Logged-in user not found");
      return;
    }

    // -------------------------
    // 🧾 Check following state
    // -------------------------
    const followDoc = await userRef.collection("following").doc(profileUid).get();
    let isFollowing = followDoc.exists;

    // 🎨 Button style
    updateFollowButtonStyle(btn, isFollowing);

    // -------------------------
    // 🔁 Toggle logic
    // -------------------------
    btn.onclick = async () => {
      btn.disabled = true;

      const targetFollowerRef = targetRef.collection("followers").doc(user.uid);
      const userFollowingRef = userRef.collection("following").doc(profileUid);

      try {
        if (isFollowing) {
          // 🔻 UNFOLLOW
          await Promise.all([
            userFollowingRef.delete(),
            targetFollowerRef.delete(),
            targetRef.update({
              followersCount: firebase.firestore.FieldValue.increment(-1)
            }),
            userRef.update({
              followingCount: firebase.firestore.FieldValue.increment(-1)
            })
          ]);

          isFollowing = false;
          console.log("❎ Unfollowed successfully");
        } else {
          // 🔺 FOLLOW
          await Promise.all([
            userFollowingRef.set({
              uid: profileUid,
              poly: profilePoly,
              followedAt: firebase.firestore.FieldValue.serverTimestamp()
            }),
            targetFollowerRef.set({
              uid: user.uid,
              poly: currentPoly,
              followedAt: firebase.firestore.FieldValue.serverTimestamp()
            }),
            targetRef.update({
              followersCount: firebase.firestore.FieldValue.increment(1)
            }),
            userRef.update({
              followingCount: firebase.firestore.FieldValue.increment(1)
            })
          ]);

          isFollowing = true;
          console.log("✅ Followed successfully");
        }

        updateFollowButtonStyle(btn, isFollowing);
      } catch (err) {
        console.error("⚠️ Follow toggle error:", err);
      }

      btn.disabled = false;
    };
  });
}

// -----------------------------
// 🎨 Helper — Change Button Style
// -----------------------------
function updateFollowButtonStyle(btn, isFollowing) {
  if (isFollowing) {
    btn.textContent = "Following";
    btn.style.background = "rgba(108, 99, 255, 0.25)";
    btn.style.color = "#5211e9ff";
    btn.classList.add("following");
  } else {
    btn.textContent = "Follow";
    btn.style.background = "#6C63FF";
    btn.style.color = "#FFF";
    btn.classList.remove("following");
  }
}


// -----------------------------
// 👥 Followers / Following Popup
// -----------------------------
function setupPopupEvents(profileUid) {
  const followersEl = document.getElementById("profileFollowers");
  const followingEl = document.getElementById("profileFollowing");

  followersEl.addEventListener("click", () => openUserListPopup(profileUid, "followers"));
  followingEl.addEventListener("click", () => openUserListPopup(profileUid, "following"));
}

async function openUserListPopup(uid, type) {
  const overlay = document.getElementById("popupOverlay");
  const popup = document.getElementById("popupList");
  const title = document.getElementById("popupTitle");
  const content = document.getElementById("popupContent");

  overlay.classList.add("active");
  popup.classList.add("active");
  lockScroll(true);

  title.textContent = type === "followers" ? "Followers" : "Following";
  content.innerHTML = "<p style='opacity:0.7;'>Loading...</p>";

  const snap = await db.collection("polys").doc(polyId)
    .collection("students").doc(uid)
    .collection(type).get();

  if (snap.empty) {
    content.innerHTML = "<p style='opacity:0.7;'>No users found.</p>";
    return;
  }

  content.innerHTML = "";
  for (const doc of snap.docs) {
    const uId = doc.id;
    const userRef = db.collection("polys").doc(polyId).collection("students").doc(uId);
    const userSnap = await userRef.get();
    const u = userSnap.data() || {};
    const name = u.name || "Unknown";
    const pic = u.profilePic || "https://placehold.co/60x60/6C63FF/FFF?text=U";

    const div = document.createElement("div");
    div.classList.add("popup-user-item");
    div.innerHTML = `
      <img src="${pic}">
      <span>${name}</span>
    `;
    div.addEventListener("click", () => {
      localStorage.setItem("publicUserId", uId);
      localStorage.setItem("polyId", polyId);
      window.location.href = "public-profile.html";
    });
    content.appendChild(div);
  }

  overlay.onclick = () => {
    overlay.classList.remove("active");
    popup.classList.remove("active");
    lockScroll(false);
  };
}

// -----------------------------
// 🖼️ Load Posts
// -----------------------------
async function loadPosts(uid) {
  const postsRef = db.collection("polys").doc(polyId).collection("posts");
  const snap = await postsRef.where("uid", "==", uid).get();

  postsFeed.innerHTML = "";
  document.getElementById("postCount").textContent = snap.size;

  snap.forEach(doc => {
    const d = doc.data();
    const div = document.createElement("div");
    div.classList.add("grid-item");
    div.innerHTML = d.mediaType === "video"
      ? `<video src="${d.mediaUrl}" muted autoplay loop></video>`
      : `<img src="${d.mediaUrl}" alt="Post">`;
    div.addEventListener("click", () => openExpandedPost(doc.id, d));
    postsFeed.appendChild(div);
  });
}

// -----------------------------
// 🔁 Live Stats (Supports Students + Staffs)
// -----------------------------
function liveStats(uid) {
  const studentRef = db.collection("polys").doc(polyId).collection("students").doc(uid);
  const staffRef   = db.collection("polys").doc(polyId).collection("staffs").doc(uid);

  // Try student first
  studentRef.onSnapshot((snap) => {
    if (snap.exists) {
      const d = snap.data();
      document.getElementById("profileFollowers").textContent = d.followersCount || 0;
      document.getElementById("profileFollowing").textContent = d.followingCount || 0;
    }
  });

  // Then also check staff
  staffRef.onSnapshot((snap) => {
    if (snap.exists) {
      const d = snap.data();
      document.getElementById("profileFollowers").textContent = d.followersCount || 0;
      document.getElementById("profileFollowing").textContent = d.followingCount || 0;
    }
  });
}


// -----------------------------
// 🖼️ Expanded Post Modal
// -----------------------------
function openExpandedPost(postId, data) {
  const expanded = document.getElementById("expandedPost");
  const overlay = document.getElementById("overlay");

  expanded.classList.add("active");
  overlay.classList.add("active");
  document.body.style.overflow = "hidden";

  expanded.querySelector(".avatar").src = data.userPic || "https://placehold.co/50";
  expanded.querySelector(".username").textContent = data.userName || "User";
  expanded.querySelector(".course").textContent = data.course || "-";
  expanded.querySelector(".post-desc").textContent = data.caption || "";
  expanded.querySelector(".post-time").textContent =
    data.createdAt?.toDate().toLocaleString() || "just now";

  const mediaContainer = expanded.querySelector(".media-container");
  mediaContainer.innerHTML = (data.mediaType === "video")
    ? `<video src="${data.mediaUrl}" controls autoplay loop></video>`
    : `<img src="${data.mediaUrl}" alt="Post">`;

  expanded.querySelector(".post-stats").innerHTML = `
    <span><i class="fa fa-heart"></i> ${data.likes || 0}</span>
    <span><i class="fa fa-comment"></i> ${data.comments || 0}</span>
    <span><i class="fa fa-share"></i> ${data.shares || 0}</span>
  `;

  overlay.onclick = () => {
    expanded.classList.remove("active");
    overlay.classList.remove("active");
    document.body.style.overflow = "";
  };
}

// -----------------------------
// 💬 MESSAGE BUTTON — new system (user-based mirror chats)
// -----------------------------
async function setupMessageButton(profileUid) {
  const msgBtn = document.getElementById("msgBtn"); // ✅ was messageBtn
  if (!msgBtn) return;

  const currentUid  = localStorage.getItem("userUID");
  const currentPoly = localStorage.getItem("userHomePolyId");
  const currentRole = (localStorage.getItem("userRole") || "student").toLowerCase();
  const targetPoly  = localStorage.getItem("publicUserPolyId");

  if (!currentUid || !currentPoly) {
    msgBtn.onclick = () => alert("⚠️ Please log in first!");
    return;
  }

  // 🔍 Detect target (student or staff)
  let targetCol = "students";
  let targetRef = db.collection("polys").doc(targetPoly).collection("students").doc(profileUid);
  let targetSnap = await targetRef.get();

  if (!targetSnap.exists) {
    targetCol = "staffs";
    targetRef = db.collection("polys").doc(targetPoly).collection("staffs").doc(profileUid);
    targetSnap = await targetRef.get();
  }

  if (!targetSnap.exists) {
    msgBtn.style.display = "none";
    return;
  }

  const targetData = targetSnap.data();
  const targetName = targetData.name || targetData.fullName || "Unknown User";
  const targetPic  = targetData.profilePic || targetData.photoUrl || "https://placehold.co/100x100/6C63FF/FFF?text=User";

  // 🧠 ChatId = sorted UIDs (universal)
  const chatId = [currentUid, profileUid].sort().join("_");

  msgBtn.onclick = async () => {
    try {
      // 🔹 Ensure chat_refs exists (acts as index)
      await db.collection("chats_refs").doc(chatId).set({
        users: [currentUid, profileUid],
        [`poly_${currentUid}`]: currentPoly,
        [`poly_${profileUid}`]: targetPoly,
        [`role_${currentUid}`]: currentRole,
        [`role_${profileUid}`]: targetCol,
        lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        lastMessage: "",
      }, { merge: true });

      // 🔹 Ensure user-side chat metadata exists
      const now = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection("users").doc(currentUid)
        .collection("chats").doc(profileUid)
        .set({
          otherUid: profileUid,
          lastMessage: "",
          lastTimestamp: now,
        }, { merge: true });

      await db.collection("users").doc(profileUid)
        .collection("chats").doc(currentUid)
        .set({
          otherUid: currentUid,
          lastMessage: "",
          lastTimestamp: now,
        }, { merge: true });

      // ✅ Save chat session for chat.html
      localStorage.setItem("otherUID", profileUid);
      localStorage.setItem("otherPolyId", targetPoly);
      localStorage.setItem("chatId", chatId);
      localStorage.setItem("chatTargetName", targetName);
      localStorage.setItem("chatTargetPic", targetPic);

      // ✅ Redirect to correct chat page (path changed)
      const role = localStorage.getItem("userRole")?.toLowerCase() || "student";
      let redirectPath = "";
      if (role === "staff") redirectPath = "chat/chat.html";
      else if (role === "hep") redirectPath = "chat/chat.html";
      else if (role === "polycc") redirectPath = "chat/chat.html";
      else redirectPath = "chat/chat.html"; // default student

      window.location.href = redirectPath;
    } catch (err) {
      console.error("💬 Chat creation error:", err);
      alert("Failed to open chat. Please try again.");
    }
  };
}

// -----------------------------
// 🕓 RECENT CHAT PREVIEW
// -----------------------------
async function loadRecentChatPreview(profileUid) {
  const previewBox = document.getElementById("recentChatPreview");
  const msgText = document.getElementById("recentMsgText");
  const msgTime = document.getElementById("recentMsgTime");
  if (!previewBox || !msgText || !msgTime) return;

  const currentUid = localStorage.getItem("userUID");
  if (!currentUid) return;

  const chatId = [currentUid, profileUid].sort().join("_");
  const ref = db.collection("chats_refs").doc(chatId);
  const snap = await ref.get();

  if (!snap.exists) return; // no chat between users

  const d = snap.data();
  const lastMessage = d.lastMessage || "(No messages yet)";
  const lastTimestamp = d.lastTimestamp?.toDate ? d.lastTimestamp.toDate() : null;

  // Format time (short)
  const timeStr = lastTimestamp
    ? lastTimestamp.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
      " " +
      lastTimestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : "";

  msgText.textContent = lastMessage.length > 40 ? lastMessage.slice(0, 40) + "..." : lastMessage;
  msgTime.textContent = timeStr;

  // Show section
  previewBox.style.display = "block";

  // Click → open same chat again
  previewBox.onclick = () => {
    document.getElementById("msgBtn")?.click();
  };
}


// -----------------------------
// 🚀 Load on Start
// -----------------------------
window.onload = () => {
  loadProfile(userId);
};

// -----------------------------
// 🔙 BACK BUTTON FOR POPUP MODE (in Search page)
// -----------------------------
const backBtn = document.getElementById("backBtn");
if (backBtn) {
  backBtn.addEventListener("click", () => window.history.back());
}

