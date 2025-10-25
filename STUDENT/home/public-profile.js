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
const storedPoly = localStorage.getItem("publicUserPolyId"); // ✅ match new key

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
    ref  = db.collection("polys").doc(polyId).collection("staff").doc(uid);
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
}

// Add or replace the Poly List at the top of your script if you have more than 2
const allPolys = ["psp", "pbu"]; // ⚠️ IMPORTANT: Update this array with ALL your Poly IDs

// -----------------------------
// Helper to find the user's document reference across all known Polys.
// This is used ONLY for the logged-in user whose PolyID is unknown.
// -----------------------------
async function findUserDocRef(uid) {
  for (const poly of allPolys) {
    const polyRef = db.collection("polys").doc(poly);

    // 1. Check students collection
    let studentsRef = polyRef.collection("students").doc(uid);
    let studentsSnap = await studentsRef.get();
    if (studentsSnap.exists) {
      return studentsRef; // Found in students, return reference
    }

    // 2. Check staff collection
    let staffRef = polyRef.collection("staff").doc(uid);
    let staffSnap = await staffRef.get();
    if (staffSnap.exists) {
      return staffRef; // Found in staff, return reference
    }
  }

  // Fallback: If not found, return a reference that will fail the update (e.g., in the loaded poly)
  return db.collection("polys").doc(polyId).collection("students").doc(uid); 
}

// -----------------------------
// Helper to get the correct user document reference (staff or student)
// This is only used for the TARGET user whose PolyID (global 'polyId') is known.
// -----------------------------
async function getTargetUserDocRef(targetPolyId, uid) {
  const polyRef = db.collection("polys").doc(targetPolyId);

  let studentsRef = polyRef.collection("students").doc(uid);
  if ((await studentsRef.get()).exists) return studentsRef; 

  let staffRef = polyRef.collection("staff").doc(uid);
  if ((await staffRef.get()).exists) return staffRef;

  return studentsRef; 
}

// -----------------------------
// Helper to get basic user data for storing in sub-collections
// -----------------------------
async function getUserData(ref) {
    const snap = await ref.get();
    const data = snap.data() || {};
    return {
        uid: ref.id,
        name: data.name || "Unknown User",
        photoURL: data.profilePic || data.photoURL || "https://placehold.co/60x60/6C63FF/FFF?text=U",
        // Extract PolyID from the path: polys/POLYID/students/UID
        polyId: ref.path.split('/')[1], 
        isStaff: ref.path.includes("staff")
    };
}

// -----------------------------
// ❤️ FOLLOW / UNFOLLOW (Fully synced cross-poly and real-time updated)
// -----------------------------
async function setupFollowButton(profileUid) {
  const btn = document.getElementById("followBtn");
  if (!btn) return;

  // 🧩 helper: change button instantly and based on state
  function updateButton(following) {
    if (following) {
      btn.textContent = "Following";
      btn.classList.add("following");
      btn.classList.remove("primary");
    } else {
      btn.textContent = "Follow";
      btn.classList.remove("following");
      btn.classList.add("primary");
    }
  }

  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      btn.textContent = "Follow";
      btn.onclick = () => alert("Please log in first!");
      return;
    }

    if (user.uid === profileUid) {
      btn.style.display = "none";
      return;
    }

    // --- Dynamically get the correct user references ---
    // 1. CRITICAL: Find current user's document by searching ALL Polys
    const currentUserRef = await findUserDocRef(user.uid);
    
    // 2. Find target user's document using the known profile PolyID
    const targetUserRef  = await getTargetUserDocRef(polyId, profileUid);

    // Get the required data objects
    const currentUserData = await getUserData(currentUserRef);
    const targetUserData = await getUserData(targetUserRef);

    // Check if the current user document was actually found
    const currentUserSnap = await currentUserRef.get();
    if (!currentUserSnap.exists) {
        console.error(`❌ Logged-in user (${user.uid}) document not found in any Poly!`);
        btn.textContent = "Error";
        btn.disabled = true;
        return; 
    }

    // Use the *correct* references for the sub-collections
    const followingRef = currentUserRef.collection("following").doc(profileUid);
    const followerRef  = targetUserRef.collection("followers").doc(user.uid);

    // --- 🎧 REAL-TIME LISTENER FOR BUTTON STATE ---
    followingRef.onSnapshot(docSnapshot => {
        const isFollowing = docSnapshot.exists;
        updateButton(isFollowing);
    }, error => {
        console.error("Error listening to follow state:", error);
        updateButton(false);
    });

    // --- HANDLE BUTTON CLICK ---
    btn.onclick = async () => {
      btn.disabled = true;

      const currentDocSnap = await followingRef.get();
      let isFollowing = currentDocSnap.exists;
      
      try {
        if (isFollowing) {
          // 🔻 UNFOLLOW
          await Promise.all([
            // Delete state
            followingRef.delete(),
            followerRef.delete(),
            
            // Decrement counts (Now using the correct cross-poly references)
            currentUserRef.update({
              followingCount: firebase.firestore.FieldValue.increment(-1)
            }),
            targetUserRef.update({
              followersCount: firebase.firestore.FieldValue.increment(-1)
            })
          ]);
          console.log("❎ Unfollowed successfully");

        } else {
          // 🔺 FOLLOW
          await Promise.all([
            // Add target's details to my following list
            followingRef.set({
              ...targetUserData,
              followedAt: firebase.firestore.FieldValue.serverTimestamp()
            }),
            
            // Add my details to target's follower list
            followerRef.set({
              ...currentUserData,
              followedAt: firebase.firestore.FieldValue.serverTimestamp()
            }),
            
            // Increment counts (Now using the correct cross-poly references)
            currentUserRef.update({
              followingCount: firebase.firestore.FieldValue.increment(1)
            }),
            targetUserRef.update({
              followersCount: firebase.firestore.FieldValue.increment(1)
            })
          ]);
          console.log("✅ Followed successfully");
        }
      } catch (e) {
        console.error("❌ Cross-Poly Follow/Unfollow error:", e);
      }

      btn.disabled = false;
    };
  });
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
// 🔁 Live Stats
// -----------------------------
function liveStats(uid) {
  db.collection("polys").doc(polyId).collection("students").doc(uid)
    .onSnapshot((snap) => {
      if (!snap.exists) return;
      const d = snap.data();
      document.getElementById("profileFollowers").textContent = d.followersCount || 0;
      document.getElementById("profileFollowing").textContent = d.followingCount|| 0;
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
  backBtn.addEventListener("click", () => {
    const overlay = document.getElementById("profileOverlay");
    if (overlay) overlay.classList.remove("active");

    // Wait for fade animation (optional)
    setTimeout(() => {
      const container = document.getElementById("profileOverlayContainer");
      if (container) container.innerHTML = "";
      document.body.style.overflow = ""; // unlock scroll
    }, 300);
  });
}

// 🧹 When leaving public profile or returning home, keep session clean
window.addEventListener("beforeunload", () => {
  localStorage.removeItem("publicUserId");
  localStorage.removeItem("publicUserPolyId");
});

