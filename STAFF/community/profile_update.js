// profile_update.js

// ✅ Reuse Firebase globals from firebase-config.js
const auth = window.auth;
const db = window.db;
const storage = window.storage;

const updateForm = document.getElementById("profileUpdateForm");
const profilePicInput = document.getElementById("profilePic");

// ✅ Session check first
const uid = localStorage.getItem("userUID");
const polyId = localStorage.getItem("userHomePolyId");
const role = localStorage.getItem("userRole");

if (!uid || !polyId || !role) {
  console.warn("⚠️ No session → redirecting to login");
  window.location.href = "../../login_&_sign_up1/login.html";
}

// ✅ Pre-fill if profile exists
(async () => {
  try {
    const docRef = db.collection("polys").doc(polyId).collection(role + "s").doc(uid);
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data();
      document.getElementById("name").value = data.name || "";
      document.getElementById("gender").value = data.gender || "";
      document.getElementById("course").value = data.course || "";
      document.getElementById("bio").value = data.bio || "";
    }
  } catch (err) {
    console.error("❌ Error loading profile:", err);
  }
})();

// ✅ Submit handler
if (updateForm) {
  updateForm.addEventListener("submit", async (e) => {   // <-- fix here
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const gender = document.getElementById("gender").value;
    const course = document.getElementById("course").value;
    const bio = document.getElementById("bio").value.trim();

    let profilePicUrl = "";
    const file = profilePicInput.files[0];

    try {
      if (file) {
        console.log("📤 Uploading new profile pic...");
        const storageRef = storage.ref().child(`profile_pics/${uid}_${Date.now()}`);
        await storageRef.put(file);
        profilePicUrl = await storageRef.getDownloadURL();
      } else {
        // ✅ Default image
        profilePicUrl = "../../img/default.png";
      }

      const docRef = db.collection("polys").doc(polyId).collection(role + "s").doc(uid);

      await docRef.set(
        {
          name,
          gender,
          course,
          bio,
          profilePic: profilePicUrl
        },
        { merge: true }
      );

      alert("✅ Profile updated successfully!");

      // ✅ Redirect
      if (role === "student") {
        window.location.href = "../community/index.html";
      } else if (role === "staff") {
        window.location.href = "../community/community.html";
      } else {
        window.location.href = "../../login_&_sign_up1/login.html";
      }
    } catch (err) {
      console.error("❌ Error updating profile:", err);
      alert("Error: " + err.message);
    }
  });
}

