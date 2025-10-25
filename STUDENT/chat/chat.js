// ==========================================
// 🔥 Firebase v8 Setup
// ==========================================
// Assumes firebase, firestore, and storage scripts are loaded.
const db = firebase.firestore();
// const storage = firebase.storage(); // Add this if you need to access storage directly outside a function

(async () => {
// ==========================================
// 🧠 Session & Chat IDs — Compatible with all roles
// ==========================================
// Works for students, staffs, hep, and polycc roles
const currentUid = localStorage.getItem("userUID");
const currentPoly =
  localStorage.getItem("userHomePolyId") || // ✅ main session key used across all roles
  localStorage.getItem("polyId") ||          // legacy fallback (old version)
  localStorage.getItem("polyID");            // additional safeguard just in case
const currentRole = (localStorage.getItem("userRole") || "").toLowerCase();
const otherUid = localStorage.getItem("otherUID");
const otherPolyId = localStorage.getItem("otherPolyId");

// Build chatId (used for chats_refs)
const chatId =
  currentUid && otherUid
    ? currentUid < otherUid
      ? `${currentUid}_${otherUid}`
      : `${otherUid}_${currentUid}`
    : "unknown_chat";

// ==========================================
// 🎯 DOM Elements
// ==========================================
const chatBody = document.getElementById("chatBody");
const msgInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatUserPic = document.getElementById("chatUserPic");
const chatUserName = document.getElementById("chatUserName");
const chatUserPoly = document.getElementById("chatUserPoly");

// Sidebar DOM elements
const userInfo = document.querySelector(".user-sidebar");
const infoBtn = document.getElementById("infoBtn");
const closeSidebar = document.getElementById("closeSidebar");
const userSidebar = document.getElementById("userSidebar");
const mediaGrid = document.getElementById("mediaGrid");

// Sidebar info display
const sideUserName = document.getElementById("sideUserName");
const sideUserPic = document.getElementById("sideUserPic");
const sideUserPoly = document.getElementById("sideUserPoly");

// ==========================================
// ✅ Ensure polytechnic ID exists (for all roles)
// ==========================================
if (!currentPoly || currentPoly.trim() === "") {
  alert("⚠️ Missing polytechnic ID. Please log in again.");
  localStorage.clear(); // clear any incomplete session
  window.location.href = "../community/index.html"; // redirect to login
  throw new Error("Missing userHomePolyId for Firestore path.");
}

// ✅ Debugging Log
console.log(
  "DEBUG → UID:", currentUid,
  "Poly:", currentPoly,
  "Role:", currentRole,
  "OtherUID:", otherUid,
  "OtherPolyID:", otherPolyId
);


// ==========================================
// 🧭 Sidebar Toggle (Simplified from original)
// Removed the old simple toggle and will use the more complex load/open logic below
// The original:
// infoBtn?.addEventListener("click", () => userInfo.classList.add("active"));
// closeSidebar?.addEventListener("click", () => userInfo.classList.remove("active"));
// is now replaced by the combined logic in the INFO SIDEBAR section.

// ==========================================
// 🖼️ LOAD SHARED MEDIA
// This function needs access to currentUid and otherUid, so it must be inside or accept them.
// We'll define it inside to access them directly.
// ==========================================
async function loadSharedMedia() {
  if (!mediaGrid) return;
  mediaGrid.innerHTML = `<div style="text-align:center;color:#999;">Loading...</div>`;

  try {
    const messagesRef = db.collection("users").doc(currentUid)
      .collection("chats").doc(otherUid).collection("messages");

    // ✅ Removed the invalid .where() clause
    const snap = await messagesRef.orderBy("createdAt", "desc").limit(50).get();

    let mediaHTML = "";
    snap.forEach((doc) => {
      const msg = doc.data();
      if (msg.fileUrl) {  // ✅ simple client-side check
        const type = msg.fileType?.toLowerCase() || "";
        if (["jpg", "jpeg", "png", "gif", "webp"].includes(type)) {
          mediaHTML += `<img src="${msg.fileUrl}" onclick="window.open('${msg.fileUrl}','_blank')" alt="Media">`;
        } else {
          mediaHTML += `
            <a href="${msg.fileUrl}" target="_blank" class="file-link">
              <i class="fa fa-file"></i> ${msg.fileName}
            </a>`;
        }
      }
    });

    mediaGrid.innerHTML = mediaHTML || `<div style="text-align:center;color:#aaa;">No shared media yet.</div>`;
  } catch (err) {
    console.error("Error loading shared media:", err);
    mediaGrid.innerHTML = `<div style="color:red;text-align:center;">Error loading media.</div>`;
  }
}



// ==========================================
// ℹ️ INFO SIDEBAR: OPEN, CLOSE & LOAD DATA (Fixed to match header logic)
// ==========================================
if (infoBtn) {
  infoBtn.addEventListener("click", async () => {
    if (userSidebar) userSidebar.style.right = "0";
    if (userInfo) userInfo.classList.add("active");

    try {
      let data = null;

      // 🔹 1️⃣ Try poly/students
      if (otherPolyId) {
        const studSnap = await db.collection("polys").doc(otherPolyId)
          .collection("students").doc(otherUid).get();
        if (studSnap.exists) data = studSnap.data();
      }

      // 🔹 2️⃣ Try poly/staff
      if (!data && otherPolyId) {
        const staffSnap = await db.collection("polys").doc(otherPolyId)
          .collection("staffs").doc(otherUid).get();
        if (staffSnap.exists) data = staffSnap.data();
      }

      // 🔹 3️⃣ Search all polys as fallback (same as chat header)
      if (!data) {
        const polys = await db.collection("polys").get();
        for (const poly of polys.docs) {
          const sid = await poly.ref.collection("students").doc(otherUid).get();
          if (sid.exists) { data = sid.data(); break; }
          const tid = await poly.ref.collection("staffs").doc(otherUid).get();
          if (tid.exists) { data = tid.data(); break; }
        }
      }

      // 🔹 4️⃣ Fallback to default
      if (!data) {
        console.warn("⚠️ No user data found for sidebar.");
        data = { name: "Unknown User", polyName: "Unknown Polytechnic" };
      }

      const name = data.name || data.fullName || "Unknown User";
      const photo = data.photoUrl || data.profilePic || `https://i.pravatar.cc/100?u=${otherUid}`;
      const polyName = data.polyName || data.polyId || "Unknown Polytechnic";

      if (sideUserName) sideUserName.textContent = name;
      if (sideUserPic) sideUserPic.src = photo;
      if (sideUserPoly) sideUserPoly.textContent = polyName;

      await loadSharedMedia();
    } catch (err) {
      console.error("Sidebar load error:", err);
    }
  });
}

if (closeSidebar) {
  closeSidebar.addEventListener("click", () => {
    if (userSidebar) userSidebar.style.right = "-350px";
    if (userInfo) userInfo.classList.remove("active");
  });
}


// ==========================================
// 👤 Real-time Receiver Profile Listener
// This listener updates the *main chat header* with receiver info.
// ==========================================
async function listenToReceiver() {
    if (!otherUid) return console.error("otherUid is missing for listenToReceiver");
    
    db.collection("users").doc(otherUid).onSnapshot(async (doc) => {
        let data = doc.exists ? doc.data() : null;

        if (!data && otherPolyId) {
            const stud = await db.collection("polys").doc(otherPolyId)
                .collection("students").doc(otherUid).get();
            if (stud.exists) data = stud.data();

            const staff = await db.collection("polys").doc(otherPolyId)
                .collection("staffs").doc(otherUid).get();
            if (staff.exists) data = staff.data();
        }

        if (!data) {
            // Fallback search across all polys if direct poly search fails
            const polys = await db.collection("polys").get();
            for (const poly of polys.docs) {
                const sid = await poly.ref.collection("students").doc(otherUid).get();
                if (sid.exists) { data = sid.data(); break; }
                const tid = await poly.ref.collection("staffs").doc(otherUid).get();
                if (tid.exists) { data = tid.data(); break; }
            }
        }

        const name = data?.name || data?.fullName || "Unknown User";
        const photo = data?.photoUrl || data?.profilePic || `https://i.pravatar.cc/100?u=${otherUid}`;
        const polyName = data?.polyName || data?.polyId || otherPolyId || "Unknown Polytechnic";

        // Update main chat header elements
        if (chatUserName) chatUserName.textContent = name;
        if (chatUserPic) chatUserPic.src = photo;
        if (chatUserPoly) chatUserPoly.textContent = polyName;

        // Note: The original code also updated side profile elements here,
        // which is redundant if the sidebar has its own logic (as implemented above).
        // I've removed the redundant sidebar updates here for cleaner code.
    });
}

// ==========================================
// 💬 Render Message Bubble (with left/right layout + media)
// (Function remains the same, just included for completeness)
// ==========================================
function renderMessage(data, isMe) {
  const div = document.createElement("div");
  div.className = `msg ${isMe ? "you" : "friend"}`;

  let contentHTML = "";

  // ✅ Text message (auto-link + invite detection)
  if (data.text && data.text.trim() !== "") {
    let text = data.text;

    // Detect PolyPals group-invite URLs
    const inviteRegex =
      /https?:\/\/[^\s]*group_invite\.html\?polyId=([^&]+)&groupId=([^&]+)/;
    const match = text.match(inviteRegex);

    if (match) {
      const polyId = match[1];
      const groupId = match[2];
      const userRole = (
        localStorage.getItem("userRole") || "student"
      ).toLowerCase();

      // ✅ build from site root so it never duplicates “/student/student/…”
      const base = window.location.origin;
      const inviteLink = `${base}/${userRole}/chat/group_invite.html?polyId=${polyId}&groupId=${groupId}`;

      // 🪄 Replace long link with Join-button style
      text = text.replace(
        inviteRegex,
        `<a href="${inviteLink}" class="join-link" target="_blank">🔗 Join Group</a>`
      );
    } else {
      // Convert other URLs to normal clickable links
      text = text.replace(
        /(https?:\/\/[^\s]+)/g,
        '<a href="$1" target="_blank" class="msg-link">$1</a>'
      );
    }

    contentHTML = `<div class="msg-text">${text}</div>`;
  }

  // ✅ File / Media handling
  else if (data.fileUrl) {
    const type = data.fileType?.toLowerCase() || "";
    const name = data.fileName || "File";

    if (["jpg", "jpeg", "png", "gif", "webp"].includes(type)) {
      contentHTML = `
        <div class="msg-media">
          <img src="${data.fileUrl}" alt="${name}" class="chat-image"
               onclick="window.open('${data.fileUrl}', '_blank')" />
        </div>`;
    } else if (type === "pdf") {
      contentHTML = `<div class="msg-file pdf"><i class="fa fa-file-pdf"></i>
          <a href="${data.fileUrl}" target="_blank">${name}</a></div>`;
    } else if (type === "docx") {
      contentHTML = `<div class="msg-file docx"><i class="fa fa-file-word"></i>
          <a href="${data.fileUrl}" target="_blank">${name}</a></div>`;
    } else if (type === "zip") {
      contentHTML = `<div class="msg-file zip"><i class="fa fa-file-archive"></i>
          <a href="${data.fileUrl}" target="_blank">${name}</a></div>`;
    } else {
      contentHTML = `<div class="msg-file"><i class="fa fa-file"></i>
          <a href="${data.fileUrl}" target="_blank">${name}</a></div>`;
    }
  }

  // 🕒 Timestamp
  const time = data.createdAt?.toDate
    ? new Date(data.createdAt.toDate()).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  div.innerHTML = `${contentHTML}<div class="timestamp">${time}</div>`;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}


// ==========================================
// 🚀 Real-Time Message Listener
// ==========================================
if (currentUid && otherUid) {
    const loadingDiv = document.createElement("div");
    loadingDiv.textContent = "Loading messages...";
    loadingDiv.style.cssText = "text-align:center;padding:15px;color:#888;font-size:14px;";
    if (chatBody) chatBody.appendChild(loadingDiv);

    db.collection("users").doc(currentUid)
        .collection("chats").doc(otherUid)
        .collection("messages")
        .orderBy("createdAt")
        .onSnapshot(
            (snap) => {
                if (chatBody) chatBody.innerHTML = "";
                if (snap.empty) {
                    if (chatBody) chatBody.innerHTML = `<div style="text-align:center;padding:15px;color:#999;">No messages yet.</div>`;
                    return;
                }
                snap.forEach((doc) => {
                    const msg = doc.data();
                    renderMessage(msg, msg.senderId === currentUid);
                });
            },
            (err) => {
                console.error("🔥 Error loading messages:", err);
                if (chatBody) chatBody.innerHTML = `<div style="text-align:center;color:red;padding:15px;">Error loading messages.</div>`;
            }
        );
} else {
    console.error("Missing currentUid or otherUid. Cannot start message listener.");
}

// ==========================================
// 📨 Send Message (Mirrors + chats_refs)
// ==========================================
if (sendBtn) sendBtn.addEventListener("click", sendMessage);
if (msgInput) msgInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") sendMessage();
});

// ==========================================
// 📨 Send Message (Enhanced – saves UID poly & role info to chats_refs)
// ==========================================
async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  if (currentUid === otherUid) {
    alert("You can’t send messages to yourself 😅");
    return;
  }

  if (!currentUid || !otherUid) {
    alert("User session data missing. Please reopen the chat.");
    return;
  }

  const safeCurrentPoly = currentPoly || "unknown_poly";
  const safeOtherPoly = otherPolyId || "unknown_poly";

  const msgData = {
    senderId: currentUid,
    receiverId: otherUid,
    text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  try {
    // 🔹 Mirror messages for both users
    await db.collection("users").doc(currentUid)
      .collection("chats").doc(otherUid)
      .collection("messages").add(msgData);

    await db.collection("users").doc(otherUid)
      .collection("chats").doc(currentUid)
      .collection("messages").add(msgData);

    // 🔹 Fetch sender details (student/staff)
    let senderData = {};
    try {
      const studSnap = await db.collection("polys").doc(safeCurrentPoly)
        .collection("students").doc(currentUid).get();
      if (studSnap.exists) senderData = studSnap.data();

      const staffSnap = await db.collection("polys").doc(safeCurrentPoly)
        .collection("staffs").doc(currentUid).get();
      if (!senderData.name && staffSnap.exists) senderData = staffSnap.data();
    } catch (e) { console.warn("⚠️ Sender lookup failed:", e); }

    // 🔹 Fetch receiver details (student/staff)
    let receiverData = {};
    try {
      const studSnap = await db.collection("polys").doc(safeOtherPoly)
        .collection("students").doc(otherUid).get();
      if (studSnap.exists) receiverData = studSnap.data();

      const staffSnap = await db.collection("polys").doc(safeOtherPoly)
        .collection("staffs").doc(otherUid).get();
      if (!receiverData.name && staffSnap.exists) receiverData = staffSnap.data();
    } catch (e) { console.warn("⚠️ Receiver lookup failed:", e); }

    // ======================================
    // ✅ chats_refs master record (core fix)
    // ======================================
    await db.collection("chats_refs").doc(chatId).set({
      users: [currentUid, otherUid],
      lastMessage: text,
      lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
      unreadFor: otherUid,

      // 🔹 Sender info
      senderName: senderData.name || senderData.fullName || "Unknown",
      senderPhoto: senderData.profilePic || senderData.photoUrl || "",
      [`poly_${currentUid}`]: safeCurrentPoly,
      [`role_${currentUid}`]: currentRole || "student",

      // 🔹 Receiver info
      receiverName: receiverData.name || receiverData.fullName || "Unknown",
      receiverPhoto: receiverData.profilePic || receiverData.photoUrl || "",
      [`poly_${otherUid}`]: safeOtherPoly,
      [`role_${otherUid}`]: (receiverData.role || "student").toLowerCase(),
    }, { merge: true });

    // 🔹 Update sender-side metadata
    await db.collection("users").doc(currentUid)
      .collection("chats").doc(otherUid)
      .set({
        otherUid,
        lastMessage: text,
        lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });

    // 🔹 Update receiver-side metadata
    await db.collection("users").doc(otherUid)
      .collection("chats").doc(currentUid)
      .set({
        otherUid: currentUid,
        lastMessage: text,
        lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        unread: true,
      }, { merge: true });

    msgInput.value = "";
  } catch (err) {
    console.error("❌ sendMessage error:", err);
  }
}

// ==========================================
// 📎 File Attachment Handling
// ==========================================
const attachBtn = document.getElementById("attachBtn");
const fileInput = document.getElementById("fileInput");

if (attachBtn) attachBtn.addEventListener("click", () => fileInput.click());

if (fileInput) fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!currentUid || !otherUid) {
        alert("User session data missing. Cannot send file.");
        return;
    }

    const fileName = file.name;
    const fileType = file.type;
    const ext = fileName.split('.').pop().toLowerCase();

    // Supported file types
    const allowed = ["jpg", "jpeg", "png", "gif", "webp", "pdf", "docx", "zip"];
    if (!allowed.includes(ext)) {
        alert("❌ Unsupported file type. Allowed: " + allowed.join(", "));
        fileInput.value = "";
        return;
    }

    try {
        // 🚀 Upload to Firebase Storage
        const filePath = `chat_uploads/${currentUid}_${Date.now()}_${fileName}`;
        // Ensure firebase.storage() is available
        if (!firebase.storage) {
            console.error("Firebase Storage not initialized.");
            alert("Storage service is unavailable.");
            return;
        }
        const storageRef = firebase.storage().ref().child(filePath);
        const uploadTask = await storageRef.put(file);

        const downloadURL = await uploadTask.ref.getDownloadURL();

        // 🧩 Build message data
        const msgData = {
            senderId: currentUid,
            receiverId: otherUid,
            fileUrl: downloadURL,
            fileName: fileName,
            fileType: ext,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        };

        // 🔁 Save to both users
        const senderRef = db.collection("users").doc(currentUid)
            .collection("chats").doc(otherUid).collection("messages");
        await senderRef.add(msgData);

        const receiverRef = db.collection("users").doc(otherUid)
            .collection("chats").doc(currentUid).collection("messages");
        await receiverRef.add(msgData);

        // 💬 Update chats_refs (latest file info)
        await db.collection("chats_refs").doc(chatId).set({
            users: [currentUid, otherUid],
            lastMessage: `📎 ${fileName}`,
            lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            unreadFor: otherUid
        }, { merge: true });
        
        // Update user metadata (similar to sendMessage)
        await db.collection("users").doc(currentUid)
            .collection("chats").doc(otherUid).set({
                otherUid,
                lastMessage: `📎 ${fileName}`,
                lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            
        await db.collection("users").doc(otherUid)
            .collection("chats").doc(currentUid).set({
                otherUid: currentUid,
                lastMessage: `📎 ${fileName}`,
                lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                unread: true,
            }, { merge: true });


        console.log("✅ File sent:", fileName);
        fileInput.value = ""; // reset file input
    } catch (err) {
        console.error("❌ File upload error:", err);
        alert("Failed to upload file. Check console for details.");
    }
});


// ==========================================
// 🧠 Init
// ==========================================
// Only run the listener if we have the necessary UIDs
if (currentUid && otherUid) {
    listenToReceiver();
} else {
    console.error("Chat cannot initialize: User IDs are missing.");
}


})();