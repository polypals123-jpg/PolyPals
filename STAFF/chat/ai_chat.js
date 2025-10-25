// =========================================
// 🤖 PolyPals AI Chat (Callable Gemini)
// =========================================
const db = firebase.firestore();
const functions = firebase.functions();
const aiBody = document.getElementById("aiBody");
const aiInput = document.getElementById("aiInput");
const aiSend = document.getElementById("aiSend");

const currentUid = localStorage.getItem("userUID");
const currentPoly = localStorage.getItem("userHomePolyId");

// 🔧 Callable function reference
const aiChatFn = functions.httpsCallable("aiChat");

// =============================
// 💬 UI Helper Functions
// =============================
function addMessage(text, sender = "bot") {
  const msg = document.createElement("div");
  msg.className = "ai-msg " + sender;
  msg.textContent = text;
  aiBody.appendChild(msg);
  aiBody.scrollTop = aiBody.scrollHeight;
}

function showTyping() {
  const typing = document.createElement("div");
  typing.className = "ai-msg bot typing";
  typing.innerHTML = "<span></span><span></span><span></span>";
  aiBody.appendChild(typing);
  aiBody.scrollTop = aiBody.scrollHeight;
  return typing;
}

// =============================
// 🔁 Load and Save to Firestore
// =============================
async function loadChatHistory() {
  if (!currentPoly || !currentUid) return;
  const snap = await db.collection("polys").doc(currentPoly)
    .collection("ai").doc(currentUid)
    .collection("messages")
    .orderBy("createdAt", "asc")
    .get();

  aiBody.innerHTML = "";
  snap.forEach(doc => {
    const data = doc.data();
    addMessage(data.text, data.sender);
  });
}

async function saveMessage(text, sender = "user") {
  if (!currentPoly || !currentUid) return;
  await db.collection("polys").doc(currentPoly)
    .collection("ai").doc(currentUid)
    .collection("messages")
    .add({
      text,
      sender,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
}

// =============================
// 🚀 Send Message + Call Gemini
// =============================
aiSend.onclick = async () => {

  aiInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    aiSend.click();
  }
  });

  const text = aiInput.value.trim();
  if (!text) return;

  // 🧍 User message
  addMessage(text, "user");
  aiInput.value = "";
  await saveMessage(text, "user");

  // 🤖 Typing indicator
  const typing = showTyping();

  try {
    // ✅ Call your Cloud Function
    const result = await aiChatFn({ message: text });
    typing.remove();

    const reply = result.data.reply || "⚠️ No response received.";
    addMessage(reply, "bot");
    await saveMessage(reply, "bot");

  } catch (err) {
    console.error("❌ AI Chat Error:", err);
    typing.remove();
    addMessage("⚠️ AI Chat failed. Please try again later.", "bot");
  }
};

// =============================
// 🧠 Quick Tool Buttons (Optional)
// =============================
document.getElementById("summarizeBtn").onclick = async () => {
  addMessage("✨ Summarizing recent chat (coming soon)", "bot");
};
document.getElementById("translateBtn").onclick = async () => {
  addMessage("🌍 Translation feature (coming soon)", "bot");
};
document.getElementById("replyBtn").onclick = async () => {
  addMessage("💡 Smart reply (coming soon)", "bot");
};

// =============================
// 🔄 Init on Page Load
// =============================
window.addEventListener("DOMContentLoaded", loadChatHistory);
