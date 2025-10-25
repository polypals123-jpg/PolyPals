// profile.js (cleaned & merged version)
document.addEventListener("DOMContentLoaded", () => {
  // -----------------------------
  // DOM refs
  // -----------------------------
  const gridBtn = document.getElementById("gridView");
  const savedBtn = document.getElementById("savedView");
  const postsFeed = document.getElementById("postsFeed");
  const savedFeed = document.getElementById("savedFeed");
  const overlay = document.getElementById("overlay");
  const expandedPost = document.getElementById("expandedPost");
  const closeExpanded = document.getElementById("closeExpanded");

  const aiBtn = document.getElementById("aiBtn");
  const aiPanel = document.getElementById("aiPanel");
  const aiQuestion = document.getElementById("aiQuestion");
  const aiAnswer = document.getElementById("aiAnswer");
  const submitAnswer = document.getElementById("submitAnswer");
  const pointsEl = document.getElementById("userPoints");

  const settingsLink = document.querySelector(".settings-link");
  const sidebar = document.getElementById("settingsSidebar");

  // -----------------------------
  // Firebase (compat)
  // -----------------------------
  const auth = firebase.auth();
  const db = firebase.firestore();
  const functions = firebase.functions();

  // ✅ Secure session access
const uid = localStorage.getItem("userUID");
const polyId = localStorage.getItem("userHomePolyId");
const role = localStorage.getItem("userRole");

// 🧹 Clear any public profile remnants (if opened previously)
localStorage.removeItem("publicUserId");
localStorage.removeItem("publicUserPolyId");

  // -----------------------------
  // View toggle
  // -----------------------------
  gridBtn.addEventListener("click", () => {
    postsFeed.classList.remove("hidden");
    savedFeed.classList.add("hidden");
    gridBtn.classList.add("active");
    savedBtn.classList.remove("active");
  });

  savedBtn.addEventListener("click", async () => {
    savedFeed.classList.remove("hidden");
    postsFeed.classList.add("hidden");
    savedBtn.classList.add("active");
    gridBtn.classList.remove("active");

    const user = auth.currentUser;
    if (user) await loadSavedPosts(user.uid);
  });




  // -----------------------------
  // Close Expanded Post
  // -----------------------------

  overlay.addEventListener("click", () => {
    expandedPost.classList.remove("active");
    sidebar?.classList.remove("open");
    overlay.classList.remove("active");
  });

  // -----------------------------
  // 3-dots menu toggle
  // -----------------------------
  document.querySelectorAll(".post-options .fa-ellipsis-h").forEach(icon => {
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      const menu = icon.nextElementSibling;
      menu.classList.toggle("show");
    });
  });

  // -----------------------------
  // Settings sidebar
  // -----------------------------
  if (settingsLink) {
    settingsLink.addEventListener("click", () => {
      settingsLink.classList.add("spin");
      setTimeout(() => {
        settingsLink.classList.remove("spin");
        sidebar.classList.add("open");
        overlay.classList.add("active");
      }, 500);
    });
  }

  // -----------------------------
  // Auth + Load profile + posts
  // -----------------------------
  auth.onAuthStateChanged(async (user) => {
    if (!user) {
      window.location.href = "../../LOGIN_&_SIGN_UP1/login.html";
      return;
    }

    try {
      const uid = user.uid;
      const ref = db.collection("polys").doc(polyId).collection(role + "s").doc(uid);
      const snap = await ref.get();

      if (snap.exists) {
        const data = snap.data();

        // Fill profile UI
        document.getElementById("profileName").textContent = data.name || user.email?.split("@")[0] || "User";
                // ✅ Show matricNo for students, staffId for staff
        if (role === "student") {
          document.getElementById("profileMatric").textContent = data.matricNo || "-";
        } else if (role === "staff") {
          document.getElementById("profileMatric").textContent = data.staffId || "-";
        } else {
          document.getElementById("profileMatric").textContent = "-";
        }
        document.getElementById("profileGender").textContent = data.gender || "-";
        document.getElementById("profileInstitute").textContent = (polyId || "").toUpperCase();
        document.getElementById("profileCourse").textContent = data.course || "-";
        document.getElementById("profileBio").textContent = data.bio || "No bio yet";
        document.getElementById("profileFollowers").textContent = data.followersCount || 0;
        document.getElementById("profileFollowing").textContent = data.followingCount || 0;
        document.getElementById("userPoints").textContent = data.points || 0;

        if (data.profilePic) {
          document.getElementById("profilePic").src = data.profilePic;
        }

        // Load user posts
        loadUserPosts(uid);
      }
    } catch (err) {
      console.error("❌ Error fetching profile:", err);
    }
  });

  // -----------------------------
  // AI Quiz Section with 1 min cooldown
  // -----------------------------
  const callGenerateQuiz = functions.httpsCallable("generateQuiz");
  let quizCooldown = false;

  aiBtn.addEventListener("click", async () => {
    if (quizCooldown) {
      alert("⏳ Please wait 1 minute before the next question.");
      return;
    }
    aiPanel.style.display = "block";
    aiQuestion.textContent = "...loading quiz...";
    await loadQuiz();
  });

  async function loadQuiz() {
    try {
      const course = document.getElementById("profileCourse")?.textContent || "General knowledge";
      const res = await callGenerateQuiz({ course });
      const quiz = res.data;

      aiQuestion.textContent = "";
      aiAnswer.value = "";

      if (quiz.question) {
        aiQuestion.textContent = quiz.question;
        aiAnswer.dataset.correct = (quiz.answer || "").toLowerCase().trim();
        aiAnswer.dataset.points = quiz.points || 0;
      } else {
        aiQuestion.textContent = "⚠️ No quiz generated, try again.";
      }
    } catch (err) {
      console.error("AI Quiz error:", err);
      aiQuestion.textContent = "❌ Failed to load quiz.";
    }
  }

  submitAnswer.addEventListener("click", async () => {
    const given = aiAnswer.value.trim().toLowerCase();
    const correct = aiAnswer.dataset.correct;
    const pts = parseInt(aiAnswer.dataset.points, 10) || 0;

    if (!correct) {
      alert("⚠️ No quiz loaded yet.");
      return;
    }

    let awarded = 0;
    if (given === correct) {
      awarded = pts;
      alert(`✅ Correct! +${awarded} points`);
    } else {
      const correctWords = correct.split(/\s+/);
      let matches = 0;
      correctWords.forEach((word) => {
        if (given.includes(word)) matches++;
      });

      if (matches > 0) {
        awarded = 10;
        alert(`🟡 Partially correct! +${awarded} points\nCorrect answer: ${correct}`);
      } else {
        awarded = 0;
        alert(`❌ Wrong! Correct answer was: ${correct}`);
      }
    }

    // ✅ Update Firestore points
    if (awarded > 0) {
      const cur = parseInt(pointsEl.textContent, 10) || 0;
      pointsEl.textContent = cur + awarded;

      const uid = auth.currentUser?.uid;
      if (uid) {
        try {
          await db.collection("polys").doc(polyId).collection(role + "s").doc(uid)
            .update({ points: firebase.firestore.FieldValue.increment(awarded) });
        } catch (e) {
          console.error("❌ Failed to update Firestore points:", e);
        }
      }
    }

    // Close panel & cooldown
    aiPanel.style.display = "none";
    quizCooldown = true;
    setTimeout(() => { quizCooldown = false; }, 60000);
  });

  // -----------------------------
  // Load user’s posts into grid
  // -----------------------------
  async function loadUserPosts(uid) {
    try {
      const postsRef = db.collection("polys").doc(polyId).collection("posts");
      const snap = await postsRef.where("uid", "==", uid).get();

      postsFeed.innerHTML = "";

      if (snap.empty) {
        postsFeed.innerHTML = "<p class='no-posts'>No posts yet.</p>";
        return;
      }

      snap.forEach((doc) => {
        const data = doc.data();
        const item = document.createElement("div");
        item.classList.add("grid-item", "own-post");

        let mediaHTML = "";
        if (data.mediaType === "video") {
          mediaHTML = `<video src="${data.mediaUrl}" class="post-media" muted autoplay loop playsinline></video>`;
        } else if (data.mediaType === "image") {
          mediaHTML = `<img src="${data.mediaUrl || "https://placehold.co/400"}" class="post-media" alt="Post">`;
        }
        item.innerHTML = mediaHTML;

        item.addEventListener("click", () => openExpandedPost(doc.id, data));
        postsFeed.appendChild(item);
      });
    } catch (err) {
      console.error("❌ Error loading posts:", err);
    }
  }

  // -----------------------------
  // Expanded post viewer
  // -----------------------------
  
  function openExpandedPost(postId, data) {
    expandedPost.classList.add("active");
    overlay.classList.add("active");

    const mediaContainer = expandedPost.querySelector(".media-container");
    mediaContainer.innerHTML = (data.mediaType === "video")
      ? `<video src="${data.mediaUrl}" class="post-media" controls autoplay loop playsinline muted></video>`
      : `<img src="${data.mediaUrl || "https://placehold.co/400"}" class="post-media" alt="Post">`;

    // Header
expandedPost.querySelector(".avatar").src = data.userPic || "https://placehold.co/50";
expandedPost.querySelector(".username").textContent = data.userName || "User";
expandedPost.querySelector(".course").textContent = data.course || "Unknown Course";

// Caption
expandedPost.querySelector(".post-desc").textContent = data.caption || "";

// Time (below caption now)
expandedPost.querySelector(".post-time").textContent =
  data.createdAt?.toDate().toLocaleString() || "just now";


    // Stats
    expandedPost.querySelector(".post-stats").innerHTML = `
      <span><i class="fa fa-heart"></i> ${data.likes || 0} likes</span>
      <span><i class="fa fa-comment"></i> ${data.comments || 0} comments</span>
      <span><i class="fa fa-share"></i> ${data.shares || 0} shares</span>
    `;

    const uid = auth.currentUser?.uid;

    // Actions
    expandedPost.querySelector(".like-btn").onclick = () => toggleLike(postId, uid);

    expandedPost.querySelector(".fa-comment").onclick =
    expandedPost.querySelector(".send-comment").onclick = () => {
      const input = expandedPost.querySelector(".comment-box input");
      if (input && input.value.trim()) {
        addComment(postId, uid, input.value.trim());
        input.value = "";
        loadComments(postId);
      }
    };

    expandedPost.querySelector(".share-btn").onclick = () => {
      // ✅ always provide a valid link
      const link = data.mediaUrl || `${window.location.origin}/post.html?id=${postId}`;
      openSharePopup(link, postId, uid);
    };


    // Options menu actions
    const optionsMenu = expandedPost.querySelector(".options-menu");
    optionsMenu.querySelector("li:nth-child(2)").onclick = async () => {
      if (confirm("Are you sure you want to delete this post?")) {
        await db.collection("polys").doc(polyId).collection("posts").doc(postId).delete();
        expandedPost.classList.remove("active");
        overlay.classList.remove("active");
        loadUserPosts(uid);
      }
    };

    optionsMenu.querySelector("li:nth-child(1)").onclick = async () => {
      const newCaption = prompt("Edit your caption:", data.caption || "");
      if (newCaption !== null) {
        await db.collection("polys").doc(polyId).collection("posts").doc(postId)
          .update({ caption: newCaption });
        expandedPost.querySelector(".post-desc").textContent = newCaption;
      }
    };

    // Init UI states
    initActionStates(postId, uid);
    refreshPostStats(postId);
    loadComments(postId);
  }

  // -----------------------------
  // Like / Comment / Share / Save
  // -----------------------------
  async function toggleLike(postId, uid) {
    const postRef = db.collection("polys").doc(polyId).collection("posts").doc(postId);
    const likeRef = postRef.collection("likes").doc(uid);
    const snap = await likeRef.get();

    if (snap.exists) {
      await likeRef.delete();
      await postRef.update({ likes: firebase.firestore.FieldValue.increment(-1) });
    } else {
      await likeRef.set({ likedAt: firebase.firestore.FieldValue.serverTimestamp() });
      await postRef.update({ likes: firebase.firestore.FieldValue.increment(1) });
    }

    initActionStates(postId, uid);
    refreshPostStats(postId);
  }

  async function addComment(postId, uid, text) {
  const userRef = db.collection("polys").doc(polyId).collection(role + "s").doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() : {};

  const postRef = db.collection("polys").doc(polyId).collection("posts").doc(postId);

  await postRef.collection("comments").add({
    uid,
    userName: userData.name || "User",
    userPic: userData.profilePic || "https://placehold.co/40",
    text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  await postRef.update({
    comments: firebase.firestore.FieldValue.increment(1)
  });

  refreshPostStats(postId);
}

  async function loadComments(postId) {
    const postRef = db.collection("polys").doc(polyId).collection("posts").doc(postId);
    const commentsSnap = await postRef.collection("comments").orderBy("createdAt", "asc").get();
    const list = expandedPost.querySelector(".comments-list");
    list.innerHTML = "";

    for (let doc of commentsSnap.docs) {
      const c = doc.data();
      const div = document.createElement("div");
      div.classList.add("comment-item");

      div.innerHTML = `
        <div class="comment-header">
          <img src="${c.userPic || "https://placehold.co/40"}" alt="avatar">
          <b>${c.userName || c.uid}</b>
          <span style="font-size:12px;color:gray;margin-left:auto">
            ${c.createdAt?.toDate().toLocaleString() || ""}
          </span>
        </div>
        <div class="comment-body">${c.text}</div>
        <button class="reply-btn" data-id="${doc.id}">Reply</button>
        <div class="replies"></div>
      `;
      list.appendChild(div);

      // Load replies
      const repliesSnap = await postRef.collection("comments").doc(doc.id).collection("replies").orderBy("createdAt", "asc").get();
      const repliesDiv = div.querySelector(".replies");
      repliesSnap.forEach(r => {
        const reply = r.data();
        repliesDiv.innerHTML += `<div class="reply"><b>${reply.userName || reply.uid}</b>: ${reply.text}</div>`;
      });

      // Reply button
      div.querySelector(".reply-btn").onclick = async () => {
        const replyText = prompt("Write your reply:");
        if (replyText) {
          await postRef.collection("comments").doc(doc.id).collection("replies").add({
            uid: auth.currentUser.uid,
            userName: auth.currentUser.displayName || "User",
            userPic: auth.currentUser.photoURL || "https://placehold.co/40",
            text: replyText,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
          });
          loadComments(postId);
        }
      };
    }
  }

  // -----------------------------
  // Share Logic
  // -----------------------------
  let currentShare = { url: "", postId: null, uid: null };

  function openSharePopup(url, postId, uid) {
    currentShare = { url, postId, uid };
    document.getElementById("sharePopup").classList.remove("hidden");
  }
  function closeSharePopup() {
    document.getElementById("sharePopup").classList.add("hidden");
  }
  document.getElementById("sharePopup").addEventListener("click", (e) => {
    const content = document.querySelector("#sharePopup .share-content");
    if (!content.contains(e.target)) closeSharePopup();
  });

  async function recordShare() {
    if (!currentShare.postId) return;
    const postRef = db.collection("polys").doc(polyId).collection("posts").doc(currentShare.postId);
    await postRef.update({ shares: firebase.firestore.FieldValue.increment(1) });
    refreshPostStats(currentShare.postId);
  }

  function shareTo(platform) {
    if (!currentShare.url) return;
    const url = encodeURIComponent(currentShare.url);
    const text = encodeURIComponent("Check out this post on PolyPals!");

    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${text}%20${url}`, "_blank");
      recordShare();
    } else if (platform === "instagram") {
      alert("Instagram Story share needs the mobile app. Copy link instead!");
    } else if (platform === "telegram") {
      window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
      recordShare();
    }
    closeSharePopup();
  }

  function copyLink() {
    if (!currentShare.url) return;
    navigator.clipboard.writeText(currentShare.url).then(() => {
      alert("Post link copied!");
      recordShare();
    });
    closeSharePopup();
  }

  // -----------------------------
  // Helper: Like / Save State
  // -----------------------------
  async function initActionStates(postId, uid) {
    const postRef = db.collection("polys").doc(polyId).collection("posts").doc(postId);
    const likeRef = postRef.collection("likes").doc(uid);
    const snap = await likeRef.get();
    const heart = expandedPost.querySelector(".like-btn");

    if (snap.exists) {
      heart.classList.add("liked", "fa-solid");
      heart.classList.remove("fa-regular");
    } else {
      heart.classList.remove("liked", "fa-solid");
      heart.classList.add("fa-regular");
    }
  }

  // -----------------------------
  // Refresh Stats
  // -----------------------------
  async function refreshPostStats(postId) {
    const postRef = db.collection("polys").doc(polyId).collection("posts").doc(postId);
    const snap = await postRef.get();
    if (snap.exists) {
      const data = snap.data();
      expandedPost.querySelector(".post-stats").textContent =
        `${data.likes || 0} likes · ${data.comments || 0} comments · ${data.shares || 0} shares`;
    }
  }


  // Elements
const editProfileBtn = document.getElementById("editProfileBtn");
const editProfileModal = document.getElementById("editProfileModal");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const saveProfileBtn = document.getElementById("saveProfileBtn");

// Open modal
if (editProfileBtn) {
  editProfileBtn.addEventListener("click", () => {
    editProfileModal.classList.add("active");
    overlay.classList.add("active");
  });
}

// Cancel button closes modal
if (cancelEditBtn) {
  cancelEditBtn.addEventListener("click", () => {
    editProfileModal.classList.remove("active");
    overlay.classList.remove("active");
  });
}

// Clicking overlay also closes modal
overlay.addEventListener("click", () => {
  editProfileModal.classList.remove("active");
});

// Save profile (placeholder — connect to Firestore later)
if (saveProfileBtn) {
  saveProfileBtn.addEventListener("click", async () => {
    const name = document.getElementById("editName").value.trim();
    const course = document.getElementById("editCourse").value.trim();
    const bio = document.getElementById("editBio").value.trim();
    const pic = document.getElementById("editPic").files[0];

    console.log("Saving profile:", { name, course, bio, pic });
    // 🔥 TODO: upload pic + update Firestore user doc

    // Close modal after save
    editProfileModal.classList.remove("active");
    overlay.classList.remove("active");
  });
}

saveProfileBtn.addEventListener("click", async () => {
  const btn = saveProfileBtn;
  const btnIcon = btn.querySelector(".btn-icon i");
  const btnText = btn.querySelector(".btn-text");

  btn.classList.add("loading");
  btn.disabled = true;
  btnIcon.className = "fa fa-spinner fa-spin";
  btnText.textContent = "Saving...";

  try {
    const uid = auth.currentUser.uid;
    const name = document.getElementById("editName").value.trim();
    const course = document.getElementById("editCourse").value;
    const bio = document.getElementById("editBio").value.trim();
    const file = document.getElementById("editPic").files[0];

    let photoURL = null;

    if (file) {
      const userDoc = await db.collection("polys").doc(polyId).collection(role + "s").doc(uid).get();
      if (userDoc.exists && userDoc.data().profilePic) {
        const oldRef = storage.refFromURL(userDoc.data().profilePic);
        await oldRef.delete().catch(() => {});
      }
      const storageRef = storage.ref(`profilePics/${uid}/${file.name}`);
      await storageRef.put(file);
      photoURL = await storageRef.getDownloadURL();
    }

    // ✅ Update user document
    await db.collection("polys").doc(polyId).collection(role + "s").doc(uid).update({
      name,
      course,
      bio,
      ...(photoURL && { profilePic: photoURL })
    });

    // ✅ Update all past posts with new info
    const postsRef = db.collection("polys").doc(polyId).collection("posts");
    const snap = await postsRef.where("uid", "==", uid).get();
    const batch = db.batch();
    snap.forEach(doc => {
      batch.update(doc.ref, {
        userName: name,
        course: course,
        ...(photoURL && { userPic: photoURL })
      });
    });
    await batch.commit();

    // Success animation
    btn.classList.remove("loading");
    btn.classList.add("success");
    btnIcon.className = "fa fa-check";
    btnText.textContent = "Saved!";

    setTimeout(() => {
      editProfileModal.classList.remove("active");
      overlay.classList.remove("active");
      window.location.reload(); // 🔄 refresh to reflect updates
    }, 1500);

  } catch (err) {
    console.error("❌ Error updating profile:", err);

    btn.classList.remove("loading");
    btn.classList.add("error");
    btnIcon.className = "fa fa-times";
    btnText.textContent = "Error";

    setTimeout(() => {
      btn.classList.remove("error");
      btnIcon.className = "fa fa-save";
      btnText.textContent = "Save";
      btn.disabled = false;
    }, 2000);
  }
});


// -----------------------------
  // Logout Button
  // -----------------------------
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      try {
        await auth.signOut();
        [
          "userUID", "userHomePolyId", "userRole",
          "uid", "polyId", "role",
          "publicUserId", "publicUserPolyId"
        ].forEach(k => localStorage.removeItem(k));

        console.log("👋 Logged out successfully!");
        window.location.href = "../../LOGIN_&_SIGN_UP1/login.html";
      } catch (err) {
        console.error("❌ Logout failed:", err);
        alert("Failed to log out, please try again.");
      }
    });
  }

// =============================
// Load Saved Posts (based on ownerPolyId & postId fields)
// =============================
async function loadSavedPosts(uid) {
  try {
    const savedRef = db
      .collection("polys").doc(polyId)
      .collection(role + "s").doc(uid)
      .collection("saved");

    const snap = await savedRef.orderBy("savedAt", "desc").get();
    savedFeed.innerHTML = "";

    if (snap.empty) {
      savedFeed.innerHTML = "<p class='no-posts'>No saved posts yet.</p>";
      return;
    }

    // Loop through saved items
    for (const doc of snap.docs) {
      const { ownerPolyId, postId } = doc.data();
      if (!ownerPolyId || !postId) continue;

      const postRef = db
        .collection("polys").doc(ownerPolyId)
        .collection("posts").doc(postId);

      const postSnap = await postRef.get();
      if (!postSnap.exists) continue;

      const postData = postSnap.data();

      // 🧩 Create grid item same design as user posts
      const item = document.createElement("div");
      item.classList.add("grid-item", "saved-post");

      let mediaHTML = "";
      if (postData.mediaType === "video") {
        mediaHTML = `<video src="${postData.mediaUrl}" class="post-media" muted autoplay loop playsinline></video>`;
      } else {
        mediaHTML = `<img src="${postData.mediaUrl}" class="post-media" alt="Saved Post">`;
      }

      item.innerHTML = mediaHTML;
      item.addEventListener("click", () =>
      openExpandedPost(postId, { ...postData, ownerPolyId })
      );
            savedFeed.appendChild(item);
          }
  } catch (err) {
    console.error("❌ Error loading saved posts:", err);
  }
}

// -----------------------------
// Expanded post viewer
// -----------------------------
function openExpandedPost(postId, data) {
  expandedPost.classList.add("active");
  overlay.classList.add("active");

  const mediaContainer = expandedPost.querySelector(".media-container");
  mediaContainer.innerHTML =
    data.mediaType === "video"
      ? `<video src="${data.mediaUrl}" class="post-media" controls autoplay loop playsinline muted></video>`
      : `<img src="${data.mediaUrl || "https://placehold.co/400"}" class="post-media" alt="Post">`;

  // Header
  expandedPost.querySelector(".avatar").src = data.userPic || "https://placehold.co/50";
  expandedPost.querySelector(".username").textContent = data.userName || "User";
  expandedPost.querySelector(".course").textContent = data.course || "Unknown Course";

  // Caption + Time
  expandedPost.querySelector(".post-desc").textContent = data.caption || "";
  expandedPost.querySelector(".post-time").textContent =
    data.createdAt?.toDate().toLocaleString() || "just now";

  // Stats
  expandedPost.querySelector(".post-stats").innerHTML = `
    <span><i class="fa fa-heart"></i> ${data.likes || 0} likes</span>
    <span><i class="fa fa-comment"></i> ${data.comments || 0} comments</span>
    <span><i class="fa fa-share"></i> ${data.shares || 0} shares</span>
  `;

  const uid = auth.currentUser?.uid;
  const ownerPolyId = data.ownerPolyId || polyId;

  // ❤️ Like button
  expandedPost.querySelector(".like-btn").onclick = () =>
    toggleLike(postId, uid, ownerPolyId);

  // 💬 Comment button
  expandedPost.querySelector(".fa-comment").onclick =
    expandedPost.querySelector(".send-comment").onclick = () => {
      const input = expandedPost.querySelector(".comment-box input");
      if (input && input.value.trim()) {
        addComment(postId, uid, input.value.trim(), ownerPolyId);
        input.value = "";
        loadComments(postId, ownerPolyId);
      }
    };

  // 🔗 Share button
  expandedPost.querySelector(".share-btn").onclick = () => {
    const link = data.mediaUrl || `${window.location.origin}/post.html?id=${postId}`;
    openSharePopup(link, postId, uid);
  };

  // Options menu (Edit / Delete)
  const optionsMenu = expandedPost.querySelector(".options-menu");
  optionsMenu.querySelector("li:nth-child(2)").onclick = async () => {
    if (confirm("Are you sure you want to delete this post?")) {
      await db.collection("polys").doc(ownerPolyId).collection("posts").doc(postId).delete();
      expandedPost.classList.remove("active");
      overlay.classList.remove("active");
      loadUserPosts(uid);
    }
  };

  optionsMenu.querySelector("li:nth-child(1)").onclick = async () => {
    const newCaption = prompt("Edit your caption:", data.caption || "");
    if (newCaption !== null) {
      await db.collection("polys").doc(ownerPolyId).collection("posts").doc(postId)
        .update({ caption: newCaption });
      expandedPost.querySelector(".post-desc").textContent = newCaption;
    }
  };
}


// -----------------------------
// ❤️ Like Toggle
// -----------------------------
async function toggleLike(postId, uid, ownerPolyId) {
  const targetPolyId = ownerPolyId || polyId;
  const postRef = db.collection("polys").doc(targetPolyId).collection("posts").doc(postId);
  const likeRef = postRef.collection("likes").doc(uid);
  const snap = await likeRef.get();

  if (snap.exists) {
    await likeRef.delete();
    await postRef.update({ likes: firebase.firestore.FieldValue.increment(-1) });
  } else {
    await likeRef.set({ likedAt: firebase.firestore.FieldValue.serverTimestamp() });
    await postRef.update({ likes: firebase.firestore.FieldValue.increment(1) });
  }

  initActionStates(postId, uid, targetPolyId);
  refreshPostStats(postId, targetPolyId);
}


// -----------------------------
// 💬 Add Comment
// -----------------------------
async function addComment(postId, uid, text, ownerPolyId) {
  const targetPolyId = ownerPolyId || polyId;
  const userRef = db.collection("polys").doc(polyId).collection(role + "s").doc(uid);
  const userSnap = await userRef.get();
  const userData = userSnap.exists ? userSnap.data() : {};

  const postRef = db.collection("polys").doc(targetPolyId).collection("posts").doc(postId);

  await postRef.collection("comments").add({
    uid,
    userName: userData.name || "User",
    userPic: userData.profilePic || "https://placehold.co/40",
    text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  await postRef.update({
    comments: firebase.firestore.FieldValue.increment(1)
  });

  refreshPostStats(postId, targetPolyId);
}


// -----------------------------
// 💬 Load Comments (with replies)
// -----------------------------
async function loadComments(postId, ownerPolyId) {
  const targetPolyId = ownerPolyId || polyId;
  const postRef = db.collection("polys").doc(targetPolyId).collection("posts").doc(postId);
  const commentsSnap = await postRef.collection("comments").orderBy("createdAt", "asc").get();
  const list = expandedPost.querySelector(".comments-list");
  list.innerHTML = "";

  for (let doc of commentsSnap.docs) {
    const c = doc.data();
    const div = document.createElement("div");
    div.classList.add("comment-item");

    div.innerHTML = `
      <div class="comment-header">
        <img src="${c.userPic || "https://placehold.co/40"}" alt="avatar">
        <b>${c.userName || c.uid}</b>
        <span style="font-size:12px;color:gray;margin-left:auto">
          ${c.createdAt?.toDate().toLocaleString() || ""}
        </span>
      </div>
      <div class="comment-body">${c.text}</div>
      <button class="reply-btn" data-id="${doc.id}">Reply</button>
      <div class="replies"></div>
    `;
    list.appendChild(div);

    // Replies
    const repliesSnap = await postRef.collection("comments").doc(doc.id)
      .collection("replies").orderBy("createdAt", "asc").get();
    const repliesDiv = div.querySelector(".replies");
    repliesSnap.forEach(r => {
      const reply = r.data();
      repliesDiv.innerHTML += `<div class="reply"><b>${reply.userName || reply.uid}</b>: ${reply.text}</div>`;
    });

    // Reply button
    div.querySelector(".reply-btn").onclick = async () => {
      const replyText = prompt("Write your reply:");
      if (replyText) {
        await postRef.collection("comments").doc(doc.id).collection("replies").add({
          uid: auth.currentUser.uid,
          userName: auth.currentUser.displayName || "User",
          userPic: auth.currentUser.photoURL || "https://placehold.co/40",
          text: replyText,
          createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        loadComments(postId, targetPolyId);
      }
    };
  }
}


// -----------------------------
// ♻️ Refresh Stats
// -----------------------------
async function refreshPostStats(postId, ownerPolyId) {
  const targetPolyId = ownerPolyId || polyId;
  const postRef = db.collection("polys").doc(targetPolyId).collection("posts").doc(postId);
  const snap = await postRef.get();
  if (snap.exists) {
    const data = snap.data();
    expandedPost.querySelector(".post-stats").textContent =
      `${data.likes || 0} likes · ${data.comments || 0} comments · ${data.shares || 0} shares`;
  }
}


// -----------------------------
// ❤️ Initial State (like status)
// -----------------------------
async function initActionStates(postId, uid, ownerPolyId) {
  const targetPolyId = ownerPolyId || polyId;
  const postRef = db.collection("polys").doc(targetPolyId).collection("posts").doc(postId);
  const likeRef = postRef.collection("likes").doc(uid);
  const snap = await likeRef.get();
  const heart = expandedPost.querySelector(".like-btn");

  if (snap.exists) {
    heart.classList.add("liked", "fa-solid");
    heart.classList.remove("fa-regular");
  } else {
    heart.classList.remove("liked", "fa-solid");
    heart.classList.add("fa-regular");
  }
}

// =======================================
// 🛍️ Seller Role Detection & Button Toggle
// =======================================
const becomeSellerBtn = document.getElementById("becomeSellerBtn");
const sellerAnalyticsBtn = document.getElementById("sellerAnalyticsBtn");

auth.onAuthStateChanged(async (user) => {
  if (!user) return;
  const uid = user.uid;
  const polyId = localStorage.getItem("userHomePolyId");

  try {
    const sellerRef = db.collection("polys").doc(polyId)
      .collection("roles").doc(uid)
      .collection("seller");

    const sellerSnap = await sellerRef.get();

    if (!sellerSnap.empty) {
      // ✅ Seller exists
      becomeSellerBtn.style.display = "none";
      sellerAnalyticsBtn.style.display = "inline-block";
    } else {
      // 🚫 Not seller yet
      becomeSellerBtn.style.display = "inline-block";
      sellerAnalyticsBtn.style.display = "none";
    }
  } catch (err) {
    console.error("❌ Seller check error:", err);
  }
});

// Redirect handlers
becomeSellerBtn?.addEventListener("click", () => {
  window.location.href = "seller.html";
});
sellerAnalyticsBtn?.addEventListener("click", () => {
  window.location.href = "store-analytics.html";
});


});



