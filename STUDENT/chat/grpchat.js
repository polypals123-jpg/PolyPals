// ==========================================
// 🔥 Firebase v8 Setup
// ==========================================
const db = firebase.firestore();
const storage = firebase.storage();

// ==========================================
// 🧠 Session
// ==========================================
const currentUid = localStorage.getItem("userUID");
const currentPoly = localStorage.getItem("userHomePolyId"); // ✅ correct key
const groupId = localStorage.getItem("groupID");
const groupPolyId = localStorage.getItem("groupPolyId");

if (!currentUid || !groupId || !groupPolyId) {
  alert("⚠️ Missing session data. Please open this group from the hub.");
  window.location.href = "../chat_hub/chat_hub.html";
  throw new Error("Missing group identifiers.");
}

// ==========================================
// 🎯 Elements
// ==========================================
const chatBody = document.getElementById("chatBody");
const sendBtn = document.getElementById("sendBtn");
const msgInput = document.getElementById("msgInput");
const attachBtn = document.getElementById("attachBtn");
const fileInput = document.getElementById("fileInput");

const groupNameEl = document.getElementById("groupName");
const groupIconEl = document.getElementById("groupIcon");
const groupInfo = document.getElementById("groupInfo");
const closeInfo = document.getElementById("closeInfo");
const memberList = document.getElementById("memberList");

const tabImages = document.getElementById("tabImages");
const tabDocs = document.getElementById("tabDocs");
const imageGrid = document.getElementById("imageGrid");
const docGrid = document.getElementById("docGrid");

// ============================
// 🎯 Sidebar Toggle (Group Info)
// ============================
const infoBtn = document.getElementById("groupInfoBtn");

infoBtn?.addEventListener("click", async () => {
  groupInfo.classList.add("active");
  await loadGroupInfo();
  await loadSharedMedia();
});
closeInfo?.addEventListener("click", () => groupInfo.classList.remove("active"));

// ==========================================
// 📄 Load Group Info
// ==========================================
async function loadGroupInfo() {
  try {
    const doc = await db.collection("polys").doc(groupPolyId)
      .collection("groups").doc(groupId).get();

    if (!doc.exists) {
      console.warn("❌ Group not found:", groupPolyId, groupId);
      return;
    }

    const data = doc.data();

    // ✅ Header info
    groupNameEl.textContent = data.groupName || "Unnamed Group";
    if (data.groupIcon) {
      groupIconEl.innerHTML = `<img src="${data.groupIcon}" 
        style="width:45px;height:45px;border-radius:50%;object-fit:cover;">`;
    } else {
      const letter = (data.groupName || "G").charAt(0).toUpperCase();
      groupIconEl.innerHTML = `<div class="group-icon-fallback">${letter}</div>`;
    }

    // ✅ Sidebar Info
    document.getElementById("infoGroupName").textContent = data.groupName || "Group";
    document.getElementById("infoGroupDesc").textContent = data.groupDesc || "No description available.";
    document.getElementById("infoGroupIcon").src = data.groupIcon || "https://placehold.co/100x100?text=G";

    // ✅ Members List (Fixed for member objects)
    memberList.innerHTML = "";
    if (Array.isArray(data.members) && data.members.length > 0) {
      for (const m of data.members) {
        const uid = m.uid;
        const role = m.role === "staff" ? "staffs" : "students"; // match Firestore collection names

        const uSnap = await db.collection("polys")
          .doc(groupPolyId)
          .collection(role)
          .doc(uid)
          .get();

        const uData = uSnap.exists ? uSnap.data() : null;
        memberList.innerHTML += `
          <li class="member-item">
            <img src="${uData?.profilePic || uData?.photoUrl || 'https://i.pravatar.cc/40?u=' + uid}" alt="">
            <span>${uData?.name || 'User'}</span>
            <small>${m.role || ''}</small>
          </li>`;
      }
    } else {
      memberList.innerHTML = `<li>No members yet.</li>`;
    }

  } catch (err) {
    console.error("⚠️ Error loading group info:", err);
  }
}


// ==========================================
// 🧠 Auto Init
// ==========================================
window.addEventListener("DOMContentLoaded", async () => {
  await loadGroupInfo();
  await loadSharedMedia();
});

// ==========================================
// 🧭 Media Tabs
// ==========================================
tabImages.onclick = () => {
  tabImages.classList.add("active");
  tabDocs.classList.remove("active");
  imageGrid.classList.remove("hidden");
  docGrid.classList.add("hidden");
};
tabDocs.onclick = () => {
  tabDocs.classList.add("active");
  tabImages.classList.remove("active");
  docGrid.classList.remove("hidden");
  imageGrid.classList.add("hidden");
};

// ==========================================
// 🖼 Load Shared Media
// ==========================================
async function loadSharedMedia() {
  const messagesRef = db.collection("polys").doc(groupPolyId)
    .collection("groups").doc(groupId).collection("messages");

  const snap = await messagesRef.orderBy("createdAt", "desc").limit(50).get();
  let imgHTML = "", docHTML = "";

  snap.forEach(doc => {
    const msg = doc.data();
    if (!msg.fileUrl) return;
    const ext = msg.fileType?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      imgHTML += `<img src="${msg.fileUrl}" class="previewable" alt="media">`;
    } else if (["pdf", "docx", "zip"].includes(ext)) {
      docHTML += `<a href="${msg.fileUrl}" target="_blank" class="file-link">
                    <i class="fa fa-file"></i>${msg.fileName || "Document"}
                  </a>`;
    }
  });

  imageGrid.innerHTML = imgHTML || `<div class="empty">No images yet.</div>`;
  docGrid.innerHTML = docHTML || `<div class="empty">No documents yet.</div>`;

  // Click to open image fullscreen
  document.querySelectorAll(".previewable").forEach(img => {
    img.addEventListener("click", () => openImageViewer(img.src));
  });
}

// ============================
// 🖼 Fullscreen Viewer
// ============================
const viewer = document.getElementById("imageViewer");
const viewerImg = document.getElementById("viewerImg");
const closeViewer = document.getElementById("closeViewer");

function openImageViewer(src) {
  viewerImg.src = src;
  viewer.classList.remove("hidden");
}
closeViewer.addEventListener("click", () => viewer.classList.add("hidden"));

// ==========================================
// 💬 Render Message
// ==========================================
function renderMessage(data, isMe) {
  const div = document.createElement("div");
  div.className = `msg ${isMe ? "you" : "friend"}`;
  const sender = !isMe ? `<span class="sender">${data.senderName || "Unknown"}</span>` : "";

  let content = "";
  if (data.fileUrl) {
    const type = data.fileType?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(type)) {
      content = `<img src="${data.fileUrl}" class="chat-media" onclick="window.open('${data.fileUrl}','_blank')">`;
    } else {
      content = `<a href="${data.fileUrl}" target="_blank" class="file-msg">
                  <i class="fa fa-file"></i> ${data.fileName || "Attachment"}
                 </a>`;
    }
  } else {
    content = `<div class="msg-text">${data.text || ""}</div>`;
  }

  div.innerHTML = `
    ${sender}
    ${content}
    <div class="timestamp">${
      data.createdAt?.toDate
        ? new Date(data.createdAt.toDate()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : ""
    }</div>
  `;
  chatBody.appendChild(div);
  chatBody.scrollTop = chatBody.scrollHeight;
}

// ==========================================
// 🚀 Real-time Listener
// ==========================================
db.collection("polys").doc(groupPolyId)
  .collection("groups").doc(groupId)
  .collection("messages")
  .orderBy("createdAt")
  .onSnapshot((snap) => {
    chatBody.innerHTML = "";
    if (snap.empty) {
      chatBody.innerHTML = `<div style="text-align:center;color:#999;">No messages yet.</div>`;
      return;
    }
    snap.forEach((doc) => {
      const msg = doc.data();
      renderMessage(msg, msg.senderId === currentUid);
    });
  });

// ============================
// 📨 Send Message
// ============================
sendBtn.addEventListener("click", sendMessage);
msgInput.addEventListener("keypress", (e) => e.key === "Enter" && sendMessage());

async function sendMessage() {
  const text = msgInput.value.trim();
  if (!text) return;

  let senderName = "Unknown";
  const sSnap = await db.collection("polys").doc(currentPoly).collection("students").doc(currentUid).get();
  if (sSnap.exists) senderName = sSnap.data().name || senderName;
  else {
    const stfSnap = await db.collection("polys").doc(currentPoly).collection("staffs").doc(currentUid).get();
    if (stfSnap.exists) senderName = stfSnap.data().name || senderName;
  }

  const msgData = {
    senderId: currentUid,
    senderName,
    text,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
  };

  await db.collection("polys").doc(groupPolyId)
    .collection("groups").doc(groupId)
    .collection("messages").add(msgData);

  msgInput.value = "";
}

// ==========================================
// 📎 Upload Media (Image / PDF / DOCX / ZIP)
// ==========================================
attachBtn?.addEventListener("click", () => fileInput.click());

fileInput?.addEventListener("change", async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const fileName = file.name;
  const ext = (fileName.split(".").pop() || "").toLowerCase();
  const allowed = ["jpg", "jpeg", "png", "gif", "webp", "pdf", "docx", "zip"];
  if (!allowed.includes(ext)) {
    alert("❌ Unsupported file type. Allowed: " + allowed.join(", "));
    return;
  }

  try {
    // ✅ Upload file
    const ref = storage.ref(`group_uploads/${groupId}/${Date.now()}_${fileName}`);
    const upload = await ref.put(file);
    const url = await upload.ref.getDownloadURL();

    // ✅ Get sender name properly (same logic as text)
    let senderName = "Unknown";
    const sSnap = await db.collection("polys").doc(currentPoly)
      .collection("students").doc(currentUid).get();
    if (sSnap.exists) senderName = sSnap.data().name || senderName;
    else {
      const stfSnap = await db.collection("polys").doc(currentPoly)
        .collection("staffs").doc(currentUid).get();
      if (stfSnap.exists) senderName = stfSnap.data().name || senderName;
    }

    // ✅ Save message
    const msgData = {
      senderId: currentUid,
      senderName,
      fileUrl: url,
      fileName,
      fileType: ext,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection("polys").doc(groupPolyId)
      .collection("groups").doc(groupId)
      .collection("messages").add(msgData);

    if (groupInfo.classList.contains("active")) await loadSharedMedia();
    fileInput.value = "";
  } catch (err) {
    console.error("❌ File upload error:", err);
  }
});

// ==========================================
// 🖼️ Load Shared Media (images only for now)
// ==========================================
async function loadSharedMedia() {
  const messagesRef = db.collection("polys").doc(groupPolyId)
    .collection("groups").doc(groupId).collection("messages");

  const snap = await messagesRef.orderBy("createdAt", "desc").limit(50).get();
  let imgHTML = "", docHTML = "";

  snap.forEach(d => {
    const msg = d.data();
    if (!msg.fileUrl) return;
    const ext = (msg.fileType || "").toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) {
      imgHTML += `<img src="${msg.fileUrl}" class="previewable" alt="media">`;
    } else if (["pdf", "docx", "zip"].includes(ext)) {
      docHTML += `<a href="${msg.fileUrl}" target="_blank" class="file-link">
                    <i class="fa fa-file"></i> ${msg.fileName || "Document"}
                  </a>`;
    }
  });

  document.getElementById("imageGrid").innerHTML = imgHTML || `<div class="empty">No images yet.</div>`;
  document.getElementById("docGrid").innerHTML = docHTML || `<div class="empty">No documents yet.</div>`;

  document.querySelectorAll(".previewable").forEach(img => {
    img.addEventListener("click", () => openImageViewer(img.src));
  });
}

// ==========================================
// 🧠 Init
// ==========================================
loadGroupInfo();

// ============================
// 🔗 Generate / Copy Invite Link (Final Fixed)
// ============================
const inviteBtn = document.getElementById("inviteBtn");

inviteBtn?.addEventListener("click", async () => {
  try {
    // ✅ Use correct polytechnic ID
    const currentPolyId = localStorage.getItem("userHomePolyId");
    const groupId = localStorage.getItem("groupID");
    const groupPolyId = localStorage.getItem("groupPolyId");
    const currentUid = localStorage.getItem("userUID");
    const userRole = (localStorage.getItem("userRole") || "student").toLowerCase();

    if (!currentPolyId || !groupId) {
      alert("⚠️ Missing polytechnic or group ID. Please reopen this group from the hub.");
      return;
    }

    // ✅ Construct absolute link (prevents /student/student/ duplication)
    const inviteLink = `${window.location.origin}/${userRole}/chat/group_invite.html?polyId=${currentPolyId}&groupId=${groupId}`;
    console.log("✅ Generated Invite Link:", inviteLink);

    // ✅ Copy to clipboard
    try {
      await navigator.clipboard.writeText(inviteLink);
      alert("✅ Invite link copied to clipboard!");
    } catch (err) {
      console.warn("Clipboard write failed:", err);
    }

  } catch (err) {
    console.error("❌ Failed to copy/send invite link:", err);
    alert("⚠️ Could not copy link. Check console for details.");
  }
});

// ============================
// 🛠 Edit Group Modal Logic
// ============================
const editModal = document.getElementById("editGroupModal");
const saveGroupChanges = document.getElementById("saveGroupChanges");
const cancelEdit = document.getElementById("cancelEdit");

function openGroupEditModal(data) {
  editModal.classList.remove("hidden");
  document.getElementById("editGroupName").value = data.groupName || "";
  document.getElementById("editGroupDesc").value = data.groupDesc || "";
}

cancelEdit.onclick = () => editModal.classList.add("hidden");

saveGroupChanges.onclick = async () => {
  const newName = document.getElementById("editGroupName").value.trim();
  const newDesc = document.getElementById("editGroupDesc").value.trim();
  const fileInput = document.getElementById("editGroupIcon");

  try {
    let newIconUrl = null;
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const ref = storage.ref(`groups/${groupId}/${file.name}`);
      await ref.put(file);
      newIconUrl = await ref.getDownloadURL();
    }

    await db.collection("polys").doc(groupPolyId)
      .collection("groups").doc(groupId).update({
        groupName: newName,
        groupDesc: newDesc,
        ...(newIconUrl && { groupIcon: newIconUrl })
      });

    alert("✅ Group updated successfully!");
    editModal.classList.add("hidden");
    loadGroupInfo();
  } catch (err) {
    console.error("❌ Group update failed:", err);
  }
};
