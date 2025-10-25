const db = firebase.firestore();
const storage = firebase.storage();
const functions = firebase.app().functions("us-central1"); // ✅ set region
const suggestCaptionFn = functions.httpsCallable("suggestCaption");

// Elements
const fileInput = document.getElementById('mediaFile');
const dropArea = document.getElementById('uploadZone');
const previewMedia = document.getElementById('previewMedia');
const descInput = document.getElementById('description');
const previewDesc = document.getElementById('previewDesc');
const charCount = document.getElementById('charCount');
const aiBtn = document.getElementById('aiSuggest');

// User details preview
const previewPic = document.getElementById('previewPic');
const previewName = document.getElementById('previewName');
const previewCourse = document.getElementById('previewCourse');

// Session user
// ✅ Secure session for logged-in user
const uid = localStorage.getItem("userUID");
const polyId = localStorage.getItem("userHomePolyId");
const role = localStorage.getItem("userRole");

// 🚨 If session missing, redirect to login
if (!uid || !polyId || !role) {
  console.warn("⚠️ Session missing — redirecting to login...");
  window.location.href = "../../LOGIN_&_SIGN_UP1/login.html";
}

// 🧹 Clear any public profile remnants
localStorage.removeItem("publicUserId");
localStorage.removeItem("publicUserPolyId");

// Add this near the top of post.js
let currentUser = null;

// Fetch user details once
if (uid && polyId && role) {
  db.collection("polys").doc(polyId).collection(role + "s").doc(uid).get().then(doc => {
    if (doc.exists) {
      currentUser = doc.data();  // ✅ store globally

      // update preview
      previewPic.src = currentUser.profilePic || "../../img/default.png";
      previewName.textContent = currentUser.name || "Your Name";
      previewCourse.textContent = currentUser.course || "Your Course";
    }
  });
}

// ----- Media Upload -----
dropArea.addEventListener('click', () => fileInput.click());

fileInput.addEventListener('change', e => {
  const f = e.target.files?.[0];
  if (f) showMedia(f);
});

function showMedia(file) {
  const reader = new FileReader();
  reader.onload = e => {
    if (file.type.startsWith("image/")) {
      previewMedia.innerHTML = `<img src="${e.target.result}" alt="preview">`;
    } else if (file.type.startsWith("video/")) {
      previewMedia.innerHTML = `<video controls><source src="${e.target.result}" type="${file.type}"></video>`;
    }
  };
  reader.readAsDataURL(file);
}


// ----- Description -----
descInput.addEventListener('input', () => {
  previewDesc.textContent = descInput.value || "Your caption will appear here...";
  charCount.textContent = `${descInput.value.length}/500`;
});

// ----- AI Suggest -----
// ----- AI Suggest -----
aiBtn.addEventListener("click", async () => {
  const seed = descInput.value.trim() || "PolyPals student life";
  aiBtn.disabled = true;
  aiBtn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Generating...`;

  try {
    const res = await suggestCaptionFn({ text: seed });
    let captions = res.data.suggestions || [];

    // 🚫 Remove any system-style message lines like "Here are 3..."
    captions = captions.filter(c => !c.toLowerCase().includes("here are"));

    let box = document.getElementById('aiOptions');
    if (!box) {
      box = document.createElement('div');
      box.id = 'aiOptions';
      box.className = 'ai-options';
      descInput.parentElement.appendChild(box);
    }

    // Header text (not a button)
    box.innerHTML = `<p style="color:#fff; margin-bottom:8px;"><b>✨ Choose a caption:</b></p>`;

    // Captions as row buttons
    captions.forEach(cap => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ai-option';
      btn.textContent = cap;
      btn.style.display = "block";    // 👈 full row
      btn.style.width = "100%";       // 👈 full width
      btn.style.textAlign = "left";   // 👈 align left
      btn.onclick = () => {
        descInput.value = cap;
        previewDesc.textContent = cap;
        charCount.textContent = `${cap.length}/500`;
        box.innerHTML = "";
      };
      box.appendChild(btn);
    });
  } catch (err) {
    console.error("AI error:", err);
    alert("⚠️ Caption generation failed.");
  } finally {
    aiBtn.disabled = false;
    aiBtn.innerHTML = `<i class="fa fa-magic"></i> Suggest Caption`;
  }
});


// ----- Upload Post -----
document.getElementById('uploadPost').addEventListener('click', async () => {
  const file = fileInput.files[0];
  const caption = descInput.value.trim();
  if (!file && !caption) return alert("⚠️ Please add a caption or upload media!");

  const progressBox = document.querySelector('.progress-box');
  const progressBar = document.getElementById('progressBar');

  try {
    progressBox.style.display = "block";
    progressBar.style.width = "0%";

    // 1️⃣ Upload file if exists
    let mediaUrl = "";
    if (file) {
      const storageRef = storage.ref(`polys/${polyId}/posts/${uid}_${Date.now()}_${file.name}`);
      const uploadTask = storageRef.put(file);

      await new Promise((resolve, reject) => {
        uploadTask.on('state_changed',
          (snapshot) => {
            const percent = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            progressBar.style.width = percent + "%";
          },
          (error) => reject(error),
          async () => {
            mediaUrl = await uploadTask.snapshot.ref.getDownloadURL();
            resolve();
          }
        );
      });
    }

    // 2️⃣ Create post document in Firestore
    const postRef = await db.collection("polys").doc(polyId).collection("posts").add({
      uid,
      userName: currentUser?.name || "Unknown",
      userPic: currentUser?.profilePic || "../../img/default.png",
      course: currentUser?.course || "",
      caption,
      mediaUrl,
      mediaType: file ? (file.type.startsWith("image/") ? "image" : "video") : "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // 🔹 Save post reference under user for feed linking
  await db.collection("polys").doc(polyId)
  .collection(role + "s").doc(uid)
  .collection("posts").doc(postRef.id)
  .set({
    postId: postRef.id,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });


    // 3️⃣ Create empty subcollections (_init docs)
    await Promise.all([
      postRef.collection("likes").doc("_init").set({ init: true }),
      postRef.collection("comments").doc("_init").set({ init: true }),
      postRef.collection("shares").doc("_init").set({ init: true }),
      postRef.collection("views").doc("_init").set({ init: true })
    ]);

    // 4️⃣ Update user stats (if student)
    if (role === "student") {
      await db.collection("polys").doc(polyId).collection("students").doc(uid)
        .update({
          "stats.posts": firebase.firestore.FieldValue.increment(1)
        });
    }

    progressBar.style.width = "100%";
    alert("✅ Post uploaded!");
    window.location.href = "../home/home.html";
  } catch (err) {
    console.error("Upload error:", err);
    alert("❌ Upload failed.");
    progressBox.style.display = "none";
  }
});


// ----- 3-dot menu toggle in preview -----
document.querySelectorAll('.post-options .fa-ellipsis-h').forEach(icon => {
  icon.addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = icon.nextElementSibling;
    menu.classList.toggle("show");
  });
});

// close menus when clicking outside
document.addEventListener("click", function(e) {
  document.querySelectorAll(".options-menu").forEach(menu => {
    if (!menu.previousElementSibling.contains(e.target)) {
      menu.classList.remove("show");
    }
  });
});

// Load floating menu HTML into every page
fetch("../floating_icon.html")
  .then(res => res.text())
  .then(html => {
    document.body.insertAdjacentHTML("beforeend", html);

    // Wait until added, then activate toggle logic
    setTimeout(() => {
      const fab = document.querySelector('.fixed-action-btn');
      const mainFab = document.getElementById('mainFab');

      mainFab.addEventListener('click', () => {
        fab.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!fab.contains(e.target)) fab.classList.remove('active');
      });
    }, 300);
  });

