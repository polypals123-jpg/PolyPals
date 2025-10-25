// ==============================
// 🔥 Firebase Setup
// ==============================
const db = firebase.firestore();

// ==============================
// 🚀 Async IIFE startup wrapper
// ==============================
(async () => {
  // ==============================
  // 🧠 Unified Session for All Roles
  // ==============================
  let currentUid = localStorage.getItem("userUID");
  let currentPoly =
    localStorage.getItem("userHomePolyId") ||
    localStorage.getItem("polyId") ||
    localStorage.getItem("polyID");
  let currentRole = (localStorage.getItem("userRole") || "").toLowerCase();

  // ==============================
  // 🔍 Ensure polytechnic ID exists
  // ==============================
  async function ensurePolyId() {
    if (currentPoly) return currentPoly;

    console.warn("⚠️ polyId missing — auto detecting...");
    const polysSnap = await db.collection("polys").get();
    const roleCollections = ["staffs", "students", "hep", "jabatan", "polycc"];

    for (const polyDoc of polysSnap.docs) {
      const polyId = polyDoc.id;
      for (const col of roleCollections) {
        const ref = db
          .collection("polys")
          .doc(polyId)
          .collection(col)
          .doc(currentUid);
        const snap = await ref.get();
        if (snap.exists) {
          currentPoly = polyId;
          localStorage.setItem("polyId", polyId);
          localStorage.setItem("userHomePolyId", polyId);
          console.log(`✅ polyId auto-detected: ${polyId} (${col})`);
          return currentPoly;
        }
      }
    }

    // fallback
    currentPoly = "pbu";
    localStorage.setItem("polyId", currentPoly);
    console.warn("⚠️ No matching poly found — using fallback 'pbu'");
    return currentPoly;
  }

  // ✅ Run startup steps
  await ensurePolyId();

  console.log("Session (chat_hub):", {
    uid: currentUid,
    poly: currentPoly,
    role: currentRole,
  });

  // ==============================
  // 🔒 Restrict Group Creation
  // ==============================
  const createGroupBtn = document.getElementById("createGroup");
  const chatListEl = document.getElementById("chatList");
  const searchIcon = document.getElementById("searchIcon");
  const chatSearch = document.getElementById("chatSearch");
  const searchInput = document.getElementById("searchInput");

 // <== ✅ closes the async wrapper

// Auto-detect the user's poly if missing (checks multiple role collections)
async function ensurePolyId() {
  if (currentPoly) return currentPoly;

  console.warn("⚠️ polyId missing — attempting to detect...");
  const polysSnap = await db.collection("polys").get();

  // Your Firestore uses 'staffs' and 'students'
  const roleCollections = ["staffs", "hep", "jabatan", "polycc", "students"];

  for (const polyDoc of polysSnap.docs) {
    const polyId = polyDoc.id;

    for (const roleCol of roleCollections) {
      const userSnap = await db.collection("polys")
        .doc(polyId).collection(roleCol).doc(currentUid).get();
      if (userSnap.exists) {
        currentPoly = polyId;                               // 👈 allowed now (let)
        localStorage.setItem("polyId", polyId);
        console.log(`✅ polyId auto-detected: ${polyId} (${roleCol})`);
        return polyId;
      }
    }
  }

  // Fallback if nothing is found
  currentPoly = "pbu";
  localStorage.setItem("polyId", currentPoly);
  console.warn("⚠️ No matching poly found — using fallback 'pbu'");
  return currentPoly;
}



// ==============================
// 💅 Shake Animation
// ==============================
const style = document.createElement("style");
style.innerHTML = `
.shake { animation: wiggle 0.3s ease-in-out 3; }
@keyframes wiggle {
  0% { transform: rotate(0deg); }
  25% { transform: rotate(10deg); }
  50% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
  100% { transform: rotate(0deg); }
}
.hidden { display:none!important; }
`;
document.head.appendChild(style);

createGroupBtn.onclick = () => {
  const userRole = currentRole || "student";
  if (userRole === "student") {
    alert("🚫 Students cannot create groups.");
    createGroupBtn.classList.add("shake");
    setTimeout(() => createGroupBtn.classList.remove("shake"), 500);
  } else if (["staff", "hep", "polycc"].includes(userRole.toLowerCase())) {
    openCreateGroupModal();
  } else {
    alert("⚠️ Only STAFF, HEP, JABATAN, or POLYCC can create groups.");
  }
};


// ==============================
// 🧩 Create Group Modal (Updated with admin + user/groups)
// ==============================
function openCreateGroupModal() {
  const overlay = document.createElement("div");
  overlay.className = "group-overlay";
  overlay.innerHTML = `
    <div class="group-modal">
      <h3>Create New Group</h3>

      <!-- Group Icon Upload -->
      <label class="upload-label" for="grpImage">Group Icon (optional)</label>
      <div class="upload-preview" id="grpPreview">
        <i class="fa fa-camera"></i>
        <span>Upload Image</span>
      </div>
      <input id="grpImage" type="file" accept="image/*" hidden />

      <label>Group Name</label>
      <input id="grpName" type="text" placeholder="Enter group name" />

      <label>Description</label>
      <textarea id="grpDesc" placeholder="Describe this group..."></textarea>

      <div class="grp-actions">
        <button id="cancelGrp">Cancel</button>
        <button id="createGrpConfirm" class="create-btn">Create</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // 💅 Modal Styles
  const css = document.createElement("style");
  css.innerHTML = `
    .group-overlay {
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.4);
      display: flex; justify-content: center; align-items: center;
      z-index: 9999;
    }
    .group-modal {
      background: #fff;
      border-radius: 16px;
      padding: 20px;
      width: 360px;
      box-shadow: 0 4px 25px rgba(0,0,0,0.2);
      font-family: 'Poppins', sans-serif;
      display: flex; flex-direction: column; gap: 10px;
      animation: slideUp 0.3s ease;
    }
    .group-modal h3 {
      text-align: center;
      color: #6C63FF;
      margin-bottom: 10px;
    }
    .upload-label { font-weight: 600; color: #444; }
    .upload-preview {
      border: 2px dashed #ccc;
      border-radius: 12px;
      text-align: center;
      padding: 15px;
      cursor: pointer;
      transition: 0.3s;
    }
    .upload-preview:hover {
      border-color: #6C63FF;
      background: rgba(108,99,255,0.05);
    }
    .upload-preview img {
      width: 100%; height: 120px; object-fit: cover; border-radius: 12px;
    }
    .grp-actions {
      display: flex; justify-content: space-between; margin-top: 10px;
    }
    .grp-actions button {
      border: none; border-radius: 8px;
      padding: 8px 14px; cursor: pointer;
      font-weight: 600;
    }
    .grp-actions #cancelGrp { background: #ddd; }
    .grp-actions .create-btn {
      background: linear-gradient(135deg,#6C63FF,#9D4EDD);
      color: white;
    }
    @keyframes slideUp {
      from { transform: translateY(50px); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }
  `;
  document.head.appendChild(css);


  // 📸 Image Upload Preview
  const fileInput = overlay.querySelector("#grpImage");
  const preview = overlay.querySelector("#grpPreview");
  let uploadedImageUrl = null;

  preview.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      preview.innerHTML = `<img src="${ev.target.result}" alt="Preview">`;
    };
    reader.readAsDataURL(file);

    try {
      const path = `group_icons/${currentUid}_${Date.now()}_${file.name}`;
      const ref = firebase.storage().ref().child(path);
      const upload = await ref.put(file);
      uploadedImageUrl = await upload.ref.getDownloadURL();
      console.log("✅ Group icon uploaded:", uploadedImageUrl);
    } catch (err) {
      console.error("⚠️ Upload error:", err);
    }
  });

  // 🧠 Button Handlers
  overlay.querySelector("#cancelGrp").onclick = () => overlay.remove();

overlay.querySelector("#createGrpConfirm").onclick = async () => {
  const name = overlay.querySelector("#grpName").value.trim();
  const desc = overlay.querySelector("#grpDesc").value.trim();
  const myRole = (localStorage.getItem("userRole") || "staff").toLowerCase();

  if (!name) {
    alert("Please enter a group name.");
    return;
  }

  try {
    // ✅ ensure we have a poly to write under
    const polyId = await ensurePolyId();

    // Store the member with cross-poly details
    const me = { uid: currentUid, polyId, role: myRole };

    const newGrp = {
      groupName : name,
      groupDesc : desc,
      groupIcon : uploadedImageUrl || null,
      createdBy : currentUid,
      createdAt : firebase.firestore.FieldValue.serverTimestamp(),
      members   : [me],
      admins    : [me],          // creator is admin
    };

    // 🔹 Create group in the right poly
    const grpRef = await db.collection("polys").doc(polyId)
      .collection("groups")
      .add(newGrp);

    // 🔹 Mirror under the creator for fast hub fetch
    await db.collection("users").doc(currentUid)
      .collection("groups").doc(grpRef.id)
      .set({
        groupId : grpRef.id,
        polyId,
        role    : myRole,
        isAdmin : true,
        joinedAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    alert("✅ Group created successfully!");
    overlay.remove();

    // Open the new group
    localStorage.setItem("groupID", grpRef.id);
    localStorage.setItem("groupPolyId", polyId);
    window.location.href = "grpchat.html";
  } catch (err) {
    console.error("❌ Error creating group:", err);
    alert("Failed to create group. Check console.");
  }
};
}

// ==============================
// 🔍 Search Toggle
// ==============================
let searchOpen = false;
searchIcon.addEventListener("click", () => {
  searchOpen = !searchOpen;
  chatSearch.style.display = searchOpen ? "block" : "none";
  searchIcon.classList.toggle("typingPulse", searchOpen);
  if (searchOpen) searchInput.focus();
});

// ==============================
// ✨ AI Chat + Toggle System
// ==============================
function renderAIChatAndToggle() {
  chatListEl.innerHTML = "";

  // AI Chat card
  const aiItem = document.createElement("a");
  aiItem.href = "../chat/ai_chat.html";
  aiItem.className = "chat-item pinned";
  aiItem.innerHTML = `
    <div class="chat-icon ai-glow"><i class="fa fa-robot"></i></div>
    <div class="chat-info"><div class="chat-name">PolyPals AI 🤖</div><div class="chat-last">✨ Ask me anything!</div></div>
    <span class="chat-badge">AI</span>`;
  chatListEl.appendChild(aiItem);

  // Toggle buttons
  const toggleContainer = document.createElement("div");
  toggleContainer.className = "chat-toggle";
  toggleContainer.innerHTML = `
    <button id="togglePersonal" class="active">💬 Personal</button>
    <button id="toggleGroup">👥 Groups</button>`;
  chatListEl.appendChild(toggleContainer);

  // Lists
  const personalList = document.createElement("div");
  personalList.id = "personalList";
  personalList.className = "chat-list";
  chatListEl.appendChild(personalList);

  const groupList = document.createElement("div");
  groupList.id = "groupList";
  groupList.className = "chat-list hidden";
  chatListEl.appendChild(groupList);

  // Toggle logic
  const togglePersonal = toggleContainer.querySelector("#togglePersonal");
  const toggleGroup = toggleContainer.querySelector("#toggleGroup");

  togglePersonal.onclick = () => {
    togglePersonal.classList.add("active");
    toggleGroup.classList.remove("active");
    personalList.classList.remove("hidden");
    groupList.classList.add("hidden");
  };
  toggleGroup.onclick = () => {
    toggleGroup.classList.add("active");
    togglePersonal.classList.remove("active");
    groupList.classList.remove("hidden");
    personalList.classList.add("hidden");
  };
}

// ==============================
// ⚡ Real-time personal chat listener (optimized for chats_refs poly + role)
// ==============================
function listenToChats() {
  renderAIChatAndToggle();
  const personalList = document.getElementById("personalList");

  db.collection("chats_refs")
    .orderBy("lastTimestamp", "desc")
    .onSnapshot(async (snap) => {
      personalList.innerHTML = "";
      if (snap.empty) {
        personalList.innerHTML =
          `<div style="text-align:center;padding:15px;color:#aaa;">No personal chats yet.</div>`;
        return;
      }

      for (const docSnap of snap.docs) {
        const data = docSnap.data();
        if (!data.users?.includes(currentUid)) continue;

        // find other user
        const otherUid = data.users.find((u) => u !== currentUid);
        const otherPolyId = data[`poly_${otherUid}`];
        const otherRole = (data[`role_${otherUid}`] || "students").toLowerCase();

        // =========================
        // 🎯 Display name & photo
        // =========================
        let name = "Unknown";
        let photo = `https://i.pravatar.cc/100?u=${otherUid}`;

        // 🔹 first try names/photos stored in chats_refs (fast)
        if (data.senderId === otherUid) {
          name = data.senderName || name;
          photo = data.senderPhoto || photo;
        } else if (data.receiverId === otherUid) {
          name = data.receiverName || name;
          photo = data.receiverPhoto || photo;
        }

        // 🔹 if missing, fallback to Firestore lookup
        if (name === "Unknown" || !photo.includes("http")) {
          try {
            const ref = db
              .collection("polys")
              .doc(otherPolyId || currentPoly)
              .collection(otherRole.includes("staff") ? "staffs" : "students")
              .doc(otherUid);
            const snap = await ref.get();
            if (snap.exists) {
              const d = snap.data();
              name = d.name || d.fullName || "Unknown";
              photo =
                d.profilePic ||
                d.photoUrl ||
                d.image ||
                `https://i.pravatar.cc/100?u=${otherUid}`;
            }
          } catch (err) {
            console.warn("⚠️ Fallback fetch failed:", err);
          }
        }

        // =========================
        // 🧱 Render UI
        // =========================
        const item = document.createElement("a");
        item.className = "chat-item";
        item.innerHTML = `
          <img src="${photo}" alt="pfp" onerror="this.src='https://i.pravatar.cc/100?u=${otherUid}'">
          <div class="chat-info">
            <div class="chat-name">${name}</div>
            <div class="chat-last">${data.lastMessage || ""}</div>
          </div>
          <span class="chat-time">${
            data.lastTimestamp?.toDate
              ? new Date(data.lastTimestamp.toDate()).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : ""
          }</span>`;

        // =========================
        // 🖱️ Handle click navigation
        // =========================
        item.onclick = () => {
          const chatId =
            currentUid < otherUid
              ? `${currentUid}_${otherUid}`
              : `${otherUid}_${currentUid}`;

          localStorage.setItem("otherUID", otherUid);
          localStorage.setItem("otherPolyId", otherPolyId || "pbu");
          localStorage.setItem("currentChatId", chatId);
          window.location.href = "chat.html";
        };

        personalList.appendChild(item);
      }
    });
}


// ==============================
// 👥 Load My Groups (Cross-Poly Fixed)
// ==============================
async function loadUserGroups() {
  const groupList = document.getElementById("groupList");
  groupList.innerHTML = `<h4 class="section-title">📢 My Groups</h4>`;

  try {
    // 🔹 Get groups stored under users/{uid}/groups
    const userGroupsSnap = await db.collection("users")
      .doc(currentUid)
      .collection("groups")
      .orderBy("joinedAt", "desc")
      .get();

    if (userGroupsSnap.empty) {
      groupList.innerHTML += `
        <div style="text-align:center;padding:15px;color:#aaa;">
          No groups joined yet.
        </div>`;
      return;
    }

    for (const docSnap of userGroupsSnap.docs) {
      const { polyId, groupId } = docSnap.data();
      if (!polyId || !groupId) continue;

      // 🔹 Get actual group details from the correct poly
      const groupDoc = await db.collection("polys")
        .doc(polyId)
        .collection("groups")
        .doc(groupId)
        .get();

      if (!groupDoc.exists) continue;
      const g = groupDoc.data();

      // ✅ Prepare UI details
      const groupIcon = g.groupIcon || null;
      const groupInitial = g.groupName
        ? g.groupName.charAt(0).toUpperCase()
        : "G";

      const card = document.createElement("a");
      card.className = "chat-item group-chat";
      card.innerHTML = `
        <div class="group-icon">
          ${
            groupIcon
              ? `<img src="${groupIcon}" alt="Group Icon">`
              : `<span>${groupInitial}</span>`
          }
        </div>
        <div class="chat-info">
          <div class="chat-name">${g.groupName}</div>
          <div class="chat-last">${g.groupDesc || "No description"}</div>
        </div>
        <span class="chat-time">${
          g.createdAt?.toDate
            ? new Date(g.createdAt.toDate()).toLocaleDateString()
            : ""
        }</span>
      `;

      // ✅ Open group on click
      card.addEventListener("click", () => {
        localStorage.setItem("groupID", groupId);
        localStorage.setItem("groupPolyId", polyId);
        window.location.href = "grpchat.html";
      });

      groupList.appendChild(card);
    }
  } catch (err) {
    console.error("❌ Error loading user groups:", err);
    groupList.innerHTML += `
      <div style="padding:10px;color:red;text-align:center;">
        Failed to load groups
      </div>`;
  }
}

// ==============================
// INIT
// ==============================
listenToChats();
setTimeout(loadUserGroups, 1000);


// ==============================
// 🔎 Cross-Poly Search (students / staff / groups)
// ==============================
const searchResults = document.createElement("div");
searchResults.className = "search-results";
chatSearch.appendChild(searchResults);

searchInput.addEventListener("input", async (e) => {
  const text = e.target.value.trim().toLowerCase();
  searchResults.innerHTML = "";

  if (!text) {
    searchResults.style.display = "none";
    return;
  }

  searchResults.style.display = "block";
  searchResults.innerHTML = `<div class="loading">Searching all polytechnics...</div>`;

  try {
    const results = [];
    const polySnap = await db.collection("polys").get();

    for (const polyDoc of polySnap.docs) {
      const polyId = polyDoc.id;
      const polyData = polyDoc.data();

      // ---- Students ----
      const studSnap = await db.collection("polys").doc(polyId).collection("students").get();
      studSnap.forEach((d) => {
        const data = d.data();
        const match = data.name?.toLowerCase().includes(text) || data.matric?.toLowerCase().includes(text);
        if (match) {
          results.push({
            type: "student",
            uid: d.id,
            name: data.name,
            matric: data.matric,
            photo: data.photoUrl || data.profilePic,
            polyId,
            polyName: polyData.name || polyId,
          });
        }
      });

      // ---- Staff ----
      const staffSnap = await db.collection("polys").doc(polyId).collection("staffs").get();
      staffSnap.forEach((d) => {
        const data = d.data();
        const match = data.name?.toLowerCase().includes(text) || data.staffId?.toLowerCase().includes(text);
        if (match) {
          results.push({
            type: "staff",
            uid: d.id,
            name: data.name,
            matric: data.staffId,
            photo: data.photoUrl || data.profilePic,
            polyId,
            polyName: polyData.name || polyId,
          });
        }
      });

      // ---- Groups ----
      const grpSnap = await db.collection("polys").doc(polyId).collection("groups").get();
      grpSnap.forEach((d) => {
        const data = d.data();
        const match = data.groupName?.toLowerCase().includes(text);
        if (match) {
          results.push({
            type: "group",
            uid: d.id,
            name: data.groupName,
            photo: data.groupIcon,
            polyId,
            polyName: polyData.name || polyId,
          });
        }
      });
    }

    renderSearchResults(results);
  } catch (err) {
    console.error("Search error:", err);
    searchResults.innerHTML = `<div style="padding:10px;color:red;">Error loading results.</div>`;
  }
});

function renderSearchResults(list) {
  searchResults.innerHTML = "";
  if (!list.length) {
    searchResults.innerHTML = `<div style="padding:10px;color:#777;">No results found.</div>`;
    return;
  }

  list.forEach((item) => {
    const div = document.createElement("div");
    div.className = "result-item";
    div.innerHTML = `
      <img src="${item.photo || "https://i.pravatar.cc/100?u=" + item.uid}" alt="pic">
      <div class="res-info">
        <b>${item.name}</b><br>
        <small>${item.matric || item.type}</small><br>
        <span class="poly-tag">${item.polyName}</span>
      </div>
    `;

    div.addEventListener("click", () => {
      localStorage.setItem("otherUID", item.uid);
      localStorage.setItem("otherPolyId", item.polyId);
      localStorage.setItem("polyId", localStorage.getItem("polyId") || "pbu");

      if (item.type === "group") {
        window.location.href = "grpchat.html";
      } else {
        const chatId =
          currentUid < item.uid ? `${currentUid}_${item.uid}` : `${item.uid}_${currentUid}`;
        localStorage.setItem("currentChatId", chatId);

        // 🧠 Create chats_refs storing both users' poly & role
        db.collection("chats_refs").doc(chatId).set({
          users: [currentUid, item.uid],
          lastMessage: "",
          lastTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
          [`poly_${currentUid}`]: localStorage.getItem("polyId"),
          [`poly_${item.uid}`]: item.polyId,
          [`role_${currentUid}`]: localStorage.getItem("userRole") || "students",
          [`role_${item.uid}`]: item.type === "staff" ? "staff" : "students",
        }, { merge: true });

        window.location.href = "chat.html";
      }
    });

    searchResults.appendChild(div);
  });
}
})();