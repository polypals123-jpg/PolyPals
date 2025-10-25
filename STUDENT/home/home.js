/*********************
 * SAFE STUBS to prevent null crashes
 *********************/
const likes = Array.isArray(window.likes) ? window.likes : [];
const comments = Array.isArray(window.comments) ? window.comments : [];
const follows = Array.isArray(window.follows) ? window.follows : [];
function populateList(id, arr){ const el=document.getElementById(id); if(!el) return; el.innerHTML = ""; }
// Tracks which comment's replies are expanded
const replyExpandedState = new Map(); // key: commentId, value: boolean

firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    // check if polyId missing
    let polyId = localStorage.getItem("polyId");
    let role = localStorage.getItem("role");

    if (!polyId || !role) {
      try {
        // fetch user's document to determine poly
        const polysSnap = await db.collection("polys").get();
        for (const polyDoc of polysSnap.docs) {
          const studentRef = polyDoc.ref.collection("students").doc(user.uid);
          const staffRef = polyDoc.ref.collection("staff").doc(user.uid);
          const studentSnap = await studentRef.get();
          const staffSnap = await staffRef.get();

          if (studentSnap.exists) {
            polyId = polyDoc.id;
            role = "student";
            break;
          } else if (staffSnap.exists) {
            polyId = polyDoc.id;
            role = "staff";
            break;
          }
        }

        if (polyId && role) {
          localStorage.setItem("polyId", polyId);
          localStorage.setItem("role", role);
          console.log(`✅ Stored polyId=${polyId}, role=${role}`);
        } else {
          console.warn("⚠️ Could not detect user poly or role");
        }
      } catch (err) {
        console.error("Error auto-detecting polyId:", err);
      }
    }
  }
});

/*********************
 * FLOATING ACTION MENU
 *********************/
fetch("../floating_icon.html")
  .then(res => res.text())
  .then(html => {
    document.body.insertAdjacentHTML("beforeend", html);
    setTimeout(() => {
      const fab = document.querySelector(".fixed-action-btn");
      const mainFab = document.getElementById("mainFab");
      if (!fab || !mainFab) return;
      mainFab.addEventListener("click", () => fab.classList.toggle("active"));
      document.addEventListener("click", e => {
        if (!fab.contains(e.target)) fab.classList.remove("active");
      });
    }, 300);
  });

/*********************
 * 3-DOT HEADER MENU
 *********************/
document.addEventListener("click", e => {
  const group = e.target.closest(".menu-group");
  document.querySelectorAll(".menu-group").forEach(m => m !== group && m.classList.remove("active"));
  if (group) {
    e.stopPropagation();
    group.classList.toggle("active");
  }
});

/*********************
 * PUBLIC PROFILE POPUP
 *********************/
const profileOverlay = document.getElementById("profileOverlay");
const profileContent = document.getElementById("profileContent");
const closeProfilePopup = document.getElementById("closeProfilePopup");

document.addEventListener("click", async e => {
  const header = e.target.closest(".post-header");
  if (!header) return;
  if (e.target.closest(".menu-group")) return;
  profileOverlay?.classList.remove("hidden");
  try {
    const res = await fetch("public-profile.html");
    const html = await res.text();
    if (profileContent) profileContent.innerHTML = html;
  } catch {
    if (profileContent) profileContent.innerHTML = `<p style="padding:20px;">Failed to load profile 😢</p>`;
  }
});
closeProfilePopup?.addEventListener("click", () => profileOverlay.classList.add("hidden"));
profileOverlay?.addEventListener("click", e => { if (e.target === profileOverlay) profileOverlay.classList.add("hidden"); });

/*********************
 * FIREBASE INIT
 *********************/
const db = firebase.firestore();

/*********************
 * 💬 LOAD COMMENTS + SUBCOMMENTS (INSTAGRAM STYLE)
 *********************/
function loadComments(ownerPolyId, postId, container) {
  if (!ownerPolyId || !postId || !container) return;

  const target = container.querySelector(".comments-thread") || container;
  const commentsRef = db.collection("polys")
    .doc(ownerPolyId)
    .collection("posts")
    .doc(postId)
    .collection("comments")
    .orderBy("createdAt", "asc");

  commentsRef.onSnapshot(async (snap) => {
    const commentDocs = snap.docs.filter(doc => doc.id !== "_init");
    target.innerHTML = "";

    if (commentDocs.length === 0) {
      target.innerHTML = `<p style="text-align:center;color:#aaa;">No comments yet.</p>`;
      return;
    }

    for (const doc of commentDocs) {
      const c = doc.data();
      const commentId = doc.id;

      const userData = {
        profilePic: c.profilePic || "https://placehold.co/40x40",
        name: c.username || c.name || "User"
      };

      // ✅ Build the comment block
      const commentHTML = `
        <div class="comment">
          <div class="comment-header">
            <img class="avatar-small" src="${userData.profilePic}" alt="">
            <div class="comment-body">
              <strong>${userData.name}</strong>
              <p>${c.text || ""}</p>
              <small>${c.createdAt ? new Date(c.createdAt.toDate()).toLocaleString() : ""}</small>
              <button class="reply-btn" onclick="toggleReplyBox('${postId}', '${commentId}')">Reply</button>
            </div>
          </div>

          <!-- hidden reply input -->
          <div id="replyBox-${commentId}" class="reply-input hidden">
            <input type="text" id="replyInput-${commentId}" placeholder="Write a reply..." />
            <button class="send-reply" data-postid="${postId}" data-commentid="${commentId}">Send</button>
          </div>

          <!-- replies container -->
          <div id="replies-${commentId}" class="replies"></div>
        </div>
      `;

      // ✅ append cleanly to target container
      target.insertAdjacentHTML("beforeend", commentHTML);

      // load replies for each comment
      loadReplies(ownerPolyId, postId, commentId);
    }
  });
}



/*********************
 * 💬 LOAD SUBCOMMENTS (REPLIES)
 *********************/
function loadReplies(ownerPolyId, postId, commentId) {
  const repliesContainer = document.getElementById(`replies-${commentId}`);
  const toggle = document.getElementById(`toggle-${commentId}`);
  if (!repliesContainer || !toggle) return;

  const repliesRef = db.collection("polys")
    .doc(ownerPolyId)
    .collection("posts")
    .doc(postId)
    .collection("comments")
    .doc(commentId)
    .collection("replies")
    .orderBy("createdAt", "asc");

  repliesRef.onSnapshot(async (snap) => {
    const replies = snap.docs;
    repliesContainer.innerHTML = "";

    if (replies.length === 0) {
      toggle.innerHTML = "";
      return;
    }

    toggle.innerHTML = `View replies (${replies.length})`;
    toggle.classList.add("view-replies-btn");

    toggle.onclick = () => {
      const isHidden = repliesContainer.classList.contains("hidden");
      repliesContainer.classList.toggle("hidden");
      toggle.innerHTML = isHidden
        ? `Hide replies (${replies.length})`
        : `View replies (${replies.length})`;
    };

    for (const doc of replies) {
      const r = doc.data();

      // ✅ Directly use saved info from reply
      const userData = {
        profilePic: r.profilePic || 'https://placehold.co/35x35',
        name: r.name || 'User'
      };

      const replyHTML = `
        <div class="reply">
          <img src="${userData.profilePic}" class="avatar-small">
          <div class="reply-body">
            <strong>${userData.name}</strong>
            <p class="reply-text">${r.text}</p>
            <small>${r.createdAt?.toDate ? r.createdAt.toDate().toLocaleString() : ''}</small>
          </div>
        </div>`;
      repliesContainer.insertAdjacentHTML("beforeend", replyHTML);
    }
  });
}


/*********************
 * LOAD FOLLOWING USERS’ POSTS
 *********************/
async function loadFeed(uid, polyId, role) {
  const feedContainer = document.getElementById("feedContainer");
  feedContainer.innerHTML = `<p style="text-align:center;color:#999;">Loading feed...</p>`;

  try {
    // 1️⃣ get following list
    const followingRef = db
      .collection("polys")
      .doc(polyId)
      .collection(role + "s")
      .doc(uid)
      .collection("following");

    const followingSnap = await followingRef.get();

    if (followingSnap.empty) {
      feedContainer.innerHTML = `<p style="text-align:center;color:#999;">No posts yet. Follow someone to see their posts 💜</p>`;
      return;
    }

    const allPosts = [];

    // 2️⃣ loop through following users
    for (const followDoc of followingSnap.docs) {
      const f = followDoc.data();
      const theirPolyId = f.polyId;
      const theirUid = f.uid;
      const theirRole = f.isStaff ? "staff" : "student";

      if (!theirPolyId || !theirUid) continue;

      // 3️⃣ get that user’s post IDs
      const userPostsRef = db
        .collection("polys")
        .doc(theirPolyId)
        .collection(theirRole + "s")
        .doc(theirUid)
        .collection("posts");

      const userPostsSnap = await userPostsRef.get();

      if (userPostsSnap.empty) continue;

      for (const pid of userPostsSnap.docs) {
        const postId = pid.id;

        // 4️⃣ get actual post document
        const postRef = db
          .collection("polys")
          .doc(theirPolyId)
          .collection("posts")
          .doc(postId);

        const postDoc = await postRef.get();
        if (!postDoc.exists) continue;

        const postData = postDoc.data();

        // 5️⃣ get that user's info
        const userRef = db
          .collection("polys")
          .doc(theirPolyId)
          .collection(theirRole + "s")
          .doc(theirUid);

        const userDoc = await userRef.get();
        const userData = userDoc.data() || {};

        postData.ownerPolyId = theirPolyId;
        allPosts.push({ ...postData, postId, userData });
      }
    }

    // 6️⃣ sort newest first
    allPosts.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));

    // 7️⃣ render
    feedContainer.innerHTML = "";
    if (allPosts.length === 0) {
      feedContainer.innerHTML = `<p style="text-align:center;color:#999;">No posts found from following users.</p>`;
      return;
    }

    allPosts.forEach(p => renderPost(p, p.postId, p.userData));

  } catch (err) {
    console.error("Feed load error:", err);
    feedContainer.innerHTML = `<p style="text-align:center;color:#e74c3c;">Failed to load feed.</p>`;
  }
}



/*********************
 * RENDER EACH POST (Image / Video / Caption)
 *********************/
function renderPost(post, postId, user) {
  let mediaHTML = "";

  // 🖼️ Media section
  if (post.mediaUrl && post.mediaType === "video") {
    mediaHTML = `
      <div class="post-media">
        <video class="feed-media" autoplay loop muted playsinline preload="metadata">
          <source src="${post.mediaUrl}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      </div>`;
  } else if (post.mediaUrl && post.mediaType === "image") {
    mediaHTML = `
      <div class="post-media">
        <img src="${post.mediaUrl}" class="feed-media" alt="Post Image">
      </div>`;
  } else {
    mediaHTML = `
      <div class="post-media">
        <p class="unknown-media">Unsupported media format</p>
      </div>`;
  }

  // 🧱 Build full HTML first (must come before insertion)
  const html = `
  <div class="post-wrapper" 
     data-postid="${postId}"
     data-polyid="${post.ownerPolyId}"
     data-owneruid="${post.uid || ''}">
    <div class="post-content">
      <div class="post-header">
        <div class="user-info">
          <img src="${user.profilePic || 'https://placehold.co/50x50'}" class="avatar">
          <div>
            <h4 class="username">${user.name || 'Unknown User'}</h4>
            <p class="course">${user.course || user.position || ''}</p>
          </div>
        </div>

        <div class="post-header-right">
          <!-- ⚙️ 3-Dot Menu -->
          <div class="menu-group">
            <i class="fa-solid fa-ellipsis-vertical menu-btn"></i>
            <div class="menu-popup">
              <button class="copy-link"><i class="fa fa-link"></i> Copy Link</button>
              <button class="share-btn"><i class="fa fa-share"></i> Share</button>
              <button class="report-btn"><i class="fa fa-flag"></i> Report</button>
            </div>
          </div>
        </div>
      </div>
      
      ${mediaHTML}
      ${post.caption ? `<p class="post-caption">${post.caption}</p>` : ""}
      <p class="post-time">${post.createdAt?.toDate ? post.createdAt.toDate().toLocaleString() : ''}</p>
      <div class="post-footer">
        <div class="action-group"><i class="fa-regular fa-heart like-btn"></i><span>${post.likes || 0} Likes</span></div>
        <div class="action-group"><i class="fa-regular fa-comment comment-btn"></i><span>${post.comments || 0} Comments</span></div>
        <div class="action-group"><i class="fa-solid fa-share-nodes share-btn"></i><span>${post.shares || 0} Shares</span></div>
        <div class="action-group"><i class="fa-regular fa-bookmark save-btn"></i><span>${post.saves || 0} Saved</span></div>
      </div>
    </div>

    <!-- 💬 Comment Section -->
    <div class="comment-side">
      <h4>Comments</h4>
      <div class="comments-scroll" id="comments-${postId}">
        <div class="comments-thread"></div>
      </div>
      <div class="comment-input fixed">
        <input type="text" placeholder="Add a comment...">
        <button><i class="fa fa-paper-plane"></i></button>
      </div>
    </div>

  </div>`;

  // ✅ Now insert HTML into the DOM
  document.getElementById("feedContainer").insertAdjacentHTML("beforeend", html);
  
  const commentsContainer = document.querySelector(`#comments-${postId}`);
  if (commentsContainer) {
    const ownerPolyId = post.ownerPolyId || localStorage.getItem("polyId");
    loadComments(ownerPolyId, postId, commentsContainer);
  }

  


  // ✅ Pre-highlight liked/saved state on load
  const currentUser = firebase.auth().currentUser;
  if (currentUser) {
    const wrapper = document.querySelector(`[data-postid="${postId}"]`);
    const likeBtn = wrapper.querySelector(".like-btn");
    const saveBtn = wrapper.querySelector(".save-btn");

    // ownerPolyId is stored on wrapper.dataset.polyid
    const ownerPolyId = wrapper.dataset.polyid || localStorage.getItem("polyId");
    const viewerPolyId = localStorage.getItem("polyId");
    const viewerRole = localStorage.getItem("role") || "student";

    // 🔹 Check LIKE
    db.collection("polys").doc(ownerPolyId)
      .collection("posts").doc(postId)
      .collection("likes").doc(currentUser.uid)
      .get()
      .then((likeSnap) => {
        if (likeSnap.exists) {
          likeBtn.classList.remove("fa-regular");
          likeBtn.classList.add("fa-solid");
          likeBtn.style.color = "#ff4d4d"; // red
        }
      });

    // 🔹 Check SAVE
    db.collection("polys").doc(viewerPolyId)
      .collection(viewerRole + "s").doc(currentUser.uid)
      .collection("saved").doc(postId)
      .get()
      .then((saveSnap) => {
        if (saveSnap.exists) {
          saveBtn.classList.remove("fa-regular");
          saveBtn.classList.add("fa-solid");
          saveBtn.style.color = "#FFD43B"; // yellow
        }
      });
  }
}



/*********************
 * COMMENT SLIDING PANEL (Mobile)
 *********************/
function setupCommentOverlay() {
  const overlayBg = document.getElementById("overlayBg");
  if (!overlayBg) return;

  document.getElementById("feedContainer").addEventListener("click", e => {
    const btn = e.target.closest(".comment-btn");
    if (!btn) return;
    const wrapper = btn.closest(".post-wrapper");
    const panel = wrapper.querySelector(".comment-side");
    const isMobile = window.matchMedia("(max-width: 768px)").matches;

    if (isMobile) {
      overlayBg.classList.add("active");
      panel.classList.add("show-overlay");
      document.body.classList.add("no-scroll");
      enableSwipeToClose(panel, overlayBg);
    } else {
      panel.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });

  overlayBg.addEventListener("click", () => closeOverlay());

  function closeOverlay() {
    overlayBg.classList.remove("active");
    document.body.classList.remove("no-scroll");
    document.querySelectorAll(".comment-side.show-overlay").forEach(p => {
      p.classList.remove("show-overlay");
      p.style.transform = "";
      p.style.transition = "";
    });
  }

  function enableSwipeToClose(panel, overlay) {
    let startY = 0, diff = 0, threshold = 100;
    panel.onpointerdown = e => { startY = e.clientY; panel.style.transition = "none"; };
    panel.onpointermove = e => {
      if (!startY) return;
      diff = e.clientY - startY;
      if (diff > 0) panel.style.transform = `translateY(${diff}px)`;
    };
    panel.onpointerup = () => {
      panel.style.transition = "transform .25s ease";
      if (diff > threshold) {
        panel.style.transform = "translateY(100%)";
        setTimeout(() => { overlay.classList.remove("active"); closeOverlay(); }, 150);
      } else {
        panel.style.transform = "translateY(0)";
        setTimeout(() => { panel.style.transition = ""; }, 250);
      }
      startY = 0; diff = 0;
    };
  }
}

/**************************************************************
 * 💙 ACTIONS HANDLER (Likes, Saves, Comments, Replies)
 * This single block handles all user interactions on a post.
 **************************************************************/
document.addEventListener("click", async (e) => {
    const wrapper = e.target.closest(".post-wrapper");
    if (!wrapper) return; // Exit if the click is not inside a post

    // --- Define potential action targets ---
    const likeBtn = e.target.closest(".like-btn");
    const saveBtn = e.target.closest(".save-btn");
    const sendCommentBtn = e.target.closest(".comment-input button");
    const replyBtn = e.target.closest(".reply-btn");

    // Exit if no specific action button was clicked
    if (!likeBtn && !saveBtn && !sendCommentBtn && !replyBtn) return;

    const currentUser = firebase.auth().currentUser;
    if (!currentUser) {
        alert("Please sign in to interact with posts.");
        return;
    }

    // --- Get Post & User Info (Single Source of Truth) ---
    const postId = wrapper.dataset.postid;
    const ownerPolyId = wrapper.dataset.polyid;
    const ownerUid = wrapper.dataset.owneruid;

    // Viewer's info (for saving posts)
    const viewerPolyId = localStorage.getItem("polyId");
    const viewerRole = localStorage.getItem("role") || "student";

    // --- Validate crucial data ---
    if (!postId || !ownerPolyId || !ownerUid) {
        console.error("CRITICAL: Missing post data attributes on .post-wrapper. Action aborted.", { postId, ownerPolyId, ownerUid });
        return;
    }

    // --- Create a reference to the post document ---
    const postRef = db.collection("polys").doc(ownerPolyId).collection("posts").doc(postId);

    // 🚨 ADD THIS CRITICAL LOG
    console.log("DEBUG: ownerPolyId =", ownerPolyId, "postId =", postId);
    console.log("DEBUG: postRef path =", postRef.path);

    // ❤️ HANDLE LIKE TOGGLE
    if (likeBtn) {
        try {
            const likeRef = postRef.collection("likes").doc(currentUser.uid);
            const label = likeBtn.nextElementSibling;
            const snap = await likeRef.get();

            await db.runTransaction(async (transaction) => {
                const postDoc = await transaction.get(postRef);
                if (!postDoc.exists) throw "Post does not exist!";
                
                const currentLikes = postDoc.data().likes || 0;

                if (snap.exists) { // Unlike
                    transaction.delete(likeRef);
                    transaction.update(postRef, { likes: Math.max(0, currentLikes - 1) });
                    likeBtn.classList.replace("fa-solid", "fa-regular");
                    label.textContent = `${Math.max(0, currentLikes - 1)} Likes`;
                } else { // Like
                    transaction.set(likeRef, { uid: currentUser.uid, likedAt: firebase.firestore.FieldValue.serverTimestamp() });
                    transaction.update(postRef, { likes: currentLikes + 1 });
                    likeBtn.classList.replace("fa-regular", "fa-solid");
                    label.textContent = `${currentLikes + 1} Likes`;
                }
            });
        } catch (err) {
            console.error("Like toggle error:", err);
        }
    }


    // 💛 HANDLE SAVE TOGGLE (single 'saved' collection)
    if (saveBtn) {
      try {
        // viewer info (current session user)
        const viewerPolyId = localStorage.getItem("polyId");
        const viewerRole = localStorage.getItem("role") || "student";
        const currentUser = firebase.auth().currentUser;

        if (!viewerPolyId || !currentUser) {
          console.error("Cannot save: missing viewerPolyId or not logged in.");
          return;
        }

        // target post info (where like/save count is stored)
        const postIdEl = wrapper.querySelector(".comments-scroll");
        if (!postIdEl) return;
        const postId = postIdEl.id.replace("comments-", "");
        const ownerPolyId = wrapper.dataset.polyid || viewerPolyId;
        const postRef = db.collection("polys").doc(ownerPolyId)
                          .collection("posts").doc(postId);

        // saved collection (only this one)
        const saveRef = db.collection("polys").doc(viewerPolyId)
          .collection(viewerRole + "s").doc(currentUser.uid)
          .collection("saved").doc(postId);

        const label = saveBtn.nextElementSibling;
        const snap = await saveRef.get();
        const postSnap = await postRef.get();

        if (!postSnap.exists) {
          console.error("❌ Post does not exist!");
          return;
        }

        const currentSaves = postSnap.data().saves || 0;

        if (snap.exists) {
          // 🔹 Unsave
          await saveRef.delete();
          await postRef.update({ saves: Math.max(0, currentSaves - 1) });
          saveBtn.classList.remove("fa-solid");
          saveBtn.classList.add("fa-regular");
          saveBtn.style.color = "#888";
          label.textContent = `${Math.max(currentSaves - 1, 0)} Saved`;
          console.log(`🗑️ Un-saved post ${postId}`);
        } else {
          // 🔹 Save
          await saveRef.set({
            postId,
            ownerPolyId,
            savedAt: firebase.firestore.FieldValue.serverTimestamp(),
          });
          await postRef.update({ saves: currentSaves + 1 });
          saveBtn.classList.remove("fa-regular");
          saveBtn.classList.add("fa-solid");
          saveBtn.style.color = "#FFD43B";
          label.textContent = `${currentSaves + 1} Saved`;
          console.log(`⭐ Saved post ${postId}`);
        }
      } catch (err) {
        console.error("Save toggle error:", err);
      }
    }

/*********************
 * 💬 HANDLE REPLY CLICK (show input)
 *********************/
document.addEventListener("click", async (e) => {
  const replyBtn = e.target.closest(".reply-btn");
  if (replyBtn) {
    const postId = replyBtn.dataset.postid;
    const commentId = replyBtn.dataset.commentid;
    const ownerPolyId = localStorage.getItem("polyId");

    const parent = replyBtn.closest(".comment");

    // If input already exists, remove it
    const existingInput = parent.querySelector(".reply-input");
    if (existingInput) {
      existingInput.remove();
      return;
    }

    const inputHTML = `
      <div class="reply-input" style="margin-top:5px;">
        <input type="text" placeholder="Write a reply..." class="reply-text-input">
        <button class="send-reply" data-postid="${postId}" data-commentid="${commentId}">Send</button>
      </div>`;
    parent.insertAdjacentHTML("beforeend", inputHTML);
  }

  // 📨 Handle send reply
  const sendReplyBtn = e.target.closest(".send-reply");
  if (sendReplyBtn) {
    const currentUser = firebase.auth().currentUser;
    if (!currentUser) return;

    const postId = sendReplyBtn.dataset.postid;
    const commentId = sendReplyBtn.dataset.commentid;
    const ownerPolyId = localStorage.getItem("polyId");
    const input = sendReplyBtn.previousElementSibling;
    const text = input.value.trim();
    if (!text) return;

    try {
      const replyRef = db.collection("polys").doc(ownerPolyId)
        .collection("posts").doc(postId)
        .collection("comments").doc(commentId)
        .collection("replies").doc();

      await replyRef.set({
        uid: currentUser.uid,
        text,
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });

      // refresh replies instantly
      const repliesContainer = document.querySelector(`#replies-${commentId}`);
      loadComments(ownerPolyId, postId, repliesContainer.closest(".comments-scroll"));

      input.value = "";
    } catch (err) {
      console.error("Error adding reply:", err);
    }
  }
});

   // 💬 HANDLE SENDING A NEW COMMENT (with static user snapshot)
if (sendCommentBtn) {
  const input = wrapper.querySelector(".comment-input input");
  const text = input.value.trim();
  if (!text) return;

  const currentUser = firebase.auth().currentUser;
  if (!currentUser) return;

  const viewerPolyId = localStorage.getItem("polyId");
  const viewerRole = localStorage.getItem("role") || "student";
  const postRef = db.collection("polys").doc(ownerPolyId).collection("posts").doc(postId);

  try {
    // get user's current info once
    const userRef = db.collection("polys")
      .doc(viewerPolyId)
      .collection(viewerRole + "s")
      .doc(currentUser.uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};

    // save comment with static snapshot data
    const commentsRef = postRef.collection("comments");
    await commentsRef.add({
      uid: currentUser.uid,
      polyId: viewerPolyId,
      role: viewerRole,
      profilePic: userData.profilePic || "",
      name: userData.name || "User",
      text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });

    await postRef.update({ comments: firebase.firestore.FieldValue.increment(1) });
    input.value = "";

    // reload comments immediately
    const commentsContainer = wrapper.querySelector(".comments-scroll");
    loadComments(ownerPolyId, postId, commentsContainer);
  } catch (err) {
    console.error("Error posting comment:", err);
  }
}



   // 📨 HANDLE SEND REPLY (static snapshot)
if (sendReplyBtn) {
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) return;

  const postId = sendReplyBtn.dataset.postid;
  const commentId = sendReplyBtn.dataset.commentid;
  const text = sendReplyBtn.previousElementSibling.value.trim();
  if (!text) return;

  const viewerPolyId = localStorage.getItem("polyId");
  const viewerRole = localStorage.getItem("role") || "student";

  try {
    const userRef = db.collection("polys")
      .doc(viewerPolyId)
      .collection(viewerRole + "s")
      .doc(currentUser.uid);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};

    const replyRef = db.collection("polys").doc(ownerPolyId)
      .collection("posts").doc(postId)
      .collection("comments").doc(commentId)
      .collection("replies").doc();

    await replyRef.set({
      uid: currentUser.uid,
      polyId: viewerPolyId,
      role: viewerRole,
      profilePic: userData.profilePic || "",
      name: userData.name || "User",
      text,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    sendReplyBtn.previousElementSibling.value = "";
    loadReplies(ownerPolyId, postId, commentId);
  } catch (err) {
    console.error("Error adding reply:", err);
  }
}
});




/*********************
 * AUTH → LOAD FEED
 *********************/
firebase.auth().onAuthStateChanged(async user => {
  const feedContainer = document.getElementById("feedContainer");
  if (!user) {
    feedContainer.innerHTML = `<p style="text-align:center; padding:40px;">Please sign in to see your feed.</p>`;
    return;
  }

  const uid = user.uid;
  const polyId = localStorage.getItem("polyId") || "psp";
  const role = localStorage.getItem("role") || "student";

  try {
    await loadFeed(uid, polyId, role);
  } catch (err) {
    console.error(err);
    feedContainer.innerHTML = `<p style="text-align:center; padding:40px; color:#e74c3c;">Failed to load feed.</p>`;
  }
});

/***********************
 * 🩵 REALTIME ACTIVITY SIDEBAR
 ***********************/
async function initActivitySidebar() {
  const currentUser = firebase.auth().currentUser;
  if (!currentUser) return;

  const polyId = localStorage.getItem("polyId");
  const role = localStorage.getItem("role");

  if (!polyId || !role) return;

  // References to current user's subcollections
  const userRef = db.collection("polys").doc(polyId).collection(role + "s").doc(currentUser.uid);

  // --- Likes Activity (when someone likes user's posts)
  db.collectionGroup("likes")
    .where("targetUid", "==", currentUser.uid)
    .orderBy("likedAt", "desc")
    .limit(5)
    .onSnapshot(async snap => {
      const container = document.getElementById("likesList");
      container.innerHTML = snap.empty ? `<p style="color:#999;text-align:center;">No recent likes</p>` : "";
      for (const doc of snap.docs) {
        const data = doc.data();
        const likerRef = db.collection("polys").doc(data.polyId).collection(data.role + "s").doc(data.uid);
        const liker = (await likerRef.get()).data() || {};
        container.innerHTML += `
          <div class="activity-card">
            <img src="${liker.profilePic || 'https://placehold.co/40x40'}">
            <div class="activity-text">
              <p><b>${liker.name || 'User'}</b> liked your post</p>
              <span>${data.likedAt?.toDate?.().toLocaleString() || ''}</span>
            </div>
          </div>`;
      }
    });

  // --- Comments Activity
  db.collectionGroup("comments")
    .where("targetUid", "==", currentUser.uid)
    .orderBy("createdAt", "desc")
    .limit(5)
    .onSnapshot(async snap => {
      const container = document.getElementById("commentsList");
      container.innerHTML = snap.empty ? `<p style="color:#999;text-align:center;">No comments yet</p>` : "";
      for (const doc of snap.docs) {
        const data = doc.data();
        const commenterRef = db.collection("polys").doc(data.polyId).collection(data.role + "s").doc(data.uid);
        const commenter = (await commenterRef.get()).data() || {};
        container.innerHTML += `
          <div class="activity-card">
            <img src="${commenter.profilePic || 'https://placehold.co/40x40'}">
            <div class="activity-text">
              <p><b>${commenter.name || 'User'}</b> commented: ${data.text.slice(0, 20)}...</p>
              <span>${data.createdAt?.toDate?.().toLocaleString() || ''}</span>
            </div>
          </div>`;
      }
    });

  // --- Follow Activity
  userRef.collection("followers")
    .orderBy("followedAt", "desc")
    .limit(5)
    .onSnapshot(async snap => {
      const container = document.getElementById("followsList");
      container.innerHTML = snap.empty ? `<p style="color:#999;text-align:center;">No new followers</p>` : "";
      for (const doc of snap.docs) {
        const follower = doc.data();
        const followerRef = db.collection("polys").doc(follower.polyId).collection(follower.role + "s").doc(follower.uid);
        const fData = (await followerRef.get()).data() || {};
        container.innerHTML += `
          <div class="activity-card">
            <img src="${fData.profilePic || 'https://placehold.co/40x40'}">
            <div class="activity-text">
              <p><b>${fData.name || 'User'}</b> followed you</p>
              <span>${follower.followedAt?.toDate?.().toLocaleString() || ''}</span>
            </div>
          </div>`;
      }
    });
}

firebase.auth().onAuthStateChanged(user => {
  if (user) initActivitySidebar();
});

async function toggleLike(postId, ownerPolyId, postOwnerUid, role) {
  const currentUid = localStorage.getItem("uid");
  const currentPolyId = localStorage.getItem("polyId");
  const currentRole = localStorage.getItem("role");

  const likeRef = db
    .collection("polys")
    .doc(ownerPolyId)
    .collection("posts")
    .doc(postId)
    .collection("likes")
    .doc(currentUid);

  const snap = await likeRef.get();
  if (snap.exists) {
    await likeRef.delete();
    await db.collection("polys").doc(ownerPolyId).collection("posts").doc(postId)
      .update({ likes: firebase.firestore.FieldValue.increment(-1) });
  } else {
    await likeRef.set({
      uid: currentUid,
      polyId: currentPolyId,
      role: currentRole,
      targetUid: postOwnerUid,        // 👈 NEW: used to display in sidebar
      likedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    await db.collection("polys").doc(ownerPolyId).collection("posts").doc(postId)
      .update({ likes: firebase.firestore.FieldValue.increment(1) });
  }
}

async function postComment(ownerPolyId, postId, postOwnerUid, text) {
  const currentUid = localStorage.getItem("uid");
  const currentPolyId = localStorage.getItem("polyId");
  const currentRole = localStorage.getItem("role");

  const commentsRef = db
    .collection("polys")
    .doc(ownerPolyId)
    .collection("posts")
    .doc(postId)
    .collection("comments");

  await commentsRef.add({
    uid: currentUid,
    polyId: currentPolyId,
    role: currentRole,
    targetUid: postOwnerUid,          // 👈 NEW
    text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ==============================
// 🔐 SAFE INITIALIZATION HANDLER
// ==============================

const auth = firebase.auth();

// Wait until Firebase Auth is ready
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    console.warn("⚠️ No user signed in yet");
    return;
  }

  const uid = user.uid;
  const polyId = localStorage.getItem("polyId");
  const role = localStorage.getItem("role"); // e.g. "student" or "staff"

  // ✅ Safety check before Firestore usage
  if (!polyId || !role || !uid) {
    console.error("❌ Missing localStorage values (polyId, role, or uid)");
    return;
  }

  console.log(`✅ User ready: ${uid} | ${polyId} | ${role}`);

  // Initialize all user-based functions safely
  initClaimSystem(uid, polyId, role);
  // 👉 you can also call loadFeed(uid, polyId, role) or loadUserPosts(uid, polyId, role) here
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

// ==============================
// 🔄 Toggle Reply Input Box
// ==============================
function toggleReplyBox(postId, commentId) {
  const replyBox = document.getElementById(`replyBox-${commentId}`);
  if (!replyBox) return;

  // toggle visibility
  if (replyBox.classList.contains("hidden")) {
    replyBox.classList.remove("hidden");
    // optional: load existing replies immediately
    const polyId = localStorage.getItem("polyId");
    loadReplies(polyId, postId, commentId);
  } else {
    replyBox.classList.add("hidden");
  }
}
