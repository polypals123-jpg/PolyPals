/* ======================= FLIP / TOGGLES ======================= */
function flip() {
  document.querySelector('.flip-card-inner').style.transform = "rotateY(180deg)";
}
function flipAgain() {
  document.querySelector('.flip-card-inner').style.transform = "rotateY(0deg)";
}

// Show the student signup on the back face
function showStudentSignup() {
  const studentBox = document.getElementById("student-signup-box");
  const staffBox   = document.getElementById("staff-signup-box");
  if (studentBox && staffBox) {
    studentBox.style.display = "block";
    staffBox.style.display   = "none";
  }
  flip();
}

// Show the staff signup on the back face
function showStaffSignup() {
  const studentBox = document.getElementById("student-signup-box");
  const staffBox   = document.getElementById("staff-signup-box");
  if (studentBox && staffBox) {
    studentBox.style.display = "none";
    staffBox.style.display   = "block";
  }
  flip();
}

/* ======================= EYE ICONS (your code kept) ======================= */
let eye = document.getElementById("eye-login");
let password = document.getElementById("password-login");
if (eye && password) {
  eye.onclick = function () {
    const isPwd = password.type === "password";
    password.type = isPwd ? "text" : "password";
    eye.className = isPwd ? "fa fa-eye" : "fa fa-eye-slash";
    eye.style.color = isPwd ? "cyan" : "white";
  };
}
let eye2 = document.getElementById("eye-signup");
let password2 = document.getElementById("password-signup");
if (eye2 && password2) {
  eye2.onclick = function () {
    const isPwd = password2.type === "password";
    password2.type = isPwd ? "text" : "password";
    eye2.className = isPwd ? "fa fa-eye" : "fa fa-eye-slash";
    eye2.style.color = isPwd ? "cyan" : "white";
  };
}
let eye3 = document.getElementById("eye-confirm-signup");
let password3 = document.getElementById("password-confirm-signup");
if (eye3 && password3) {
  eye3.onclick = function () {
    const isPwd = password3.type === "password";
    password3.type = isPwd ? "text" : "password";
    eye3.className = isPwd ? "fa fa-eye" : "fa fa-eye-slash";
    eye3.style.color = isPwd ? "cyan" : "white";
  };
}
let eye4 = document.getElementById("eye-staff");
let password4 = document.getElementById("staffPassword");
if (eye4 && password4) {
  eye4.onclick = function () {
    const isPwd = password4.type === "password";
    password4.type = isPwd ? "text" : "password";
    eye4.className = isPwd ? "fa fa-eye" : "fa fa-eye-slash";
    eye4.style.color = isPwd ? "cyan" : "white";
  };
}
let eye5 = document.getElementById("eye-staff-confirm");
let password5 = document.getElementById("staffConfirmPassword");
if (eye5 && password5) {
  eye5.onclick = function () {
    const isPwd = password5.type === "password";
    password5.type = isPwd ? "text" : "password";
    eye5.className = isPwd ? "fa fa-eye" : "fa fa-eye-slash";
    eye5.style.color = isPwd ? "cyan" : "white";
  };
}
// 🔁 Clear all possible old session values before new login
["uid","polyId","role","userUID","userHomePolyId","userRole","publicUserId","publicUserPolyId"]
  .forEach(k => localStorage.removeItem(k));

/* ===================== LOGIN ===================== */
async function login() {
  const emailOrMatric = document.getElementById("login-identifier").value.trim();
  const password = document.getElementById("password-login").value;

  if (!emailOrMatric || !password) {
    alert("Please enter your credentials");
    return;
  }

  try {
    // 1. Firebase Auth login
    const userCredential = await auth.signInWithEmailAndPassword(emailOrMatric, password);
    const user = userCredential.user;
    const uid = user.uid;

    let userDoc = null;
    let role = null;
    let polyId = null;

    // 2. Search in students
    const polys = ["pbu", "psp"];
    for (const poly of polys) {
      const docRef = db.collection("polys").doc(poly).collection("students").doc(uid);
      const snap = await docRef.get();
      if (snap.exists) {
        userDoc = snap.data();
        role = "student";
        polyId = poly;
        break;
      }
    }

    // 3. If not found, check staff
    if (!userDoc) {
      for (const poly of polys) {
        const docRef = db.collection("polys").doc(poly).collection("staffs").doc(uid);
        const snap = await docRef.get();
        if (snap.exists) {
          userDoc = snap.data();
          role = "staff";
          polyId = poly;
          break;
        }
      }
    }

    if (!userDoc) {
      alert("Account not found in Polytechnic records.");
      return;
    }

    // 4. Save session using dedicated keys for the logged-in user
    localStorage.setItem("userUID", uid); // Use userUID for the logged-in user
    localStorage.setItem("userHomePolyId", polyId); // Use userHomePolyId
    localStorage.setItem("userRole", role); // Use userRole
    
    // Clear the old, generic keys to prevent accidental use on public pages
    localStorage.removeItem("uid");
    localStorage.removeItem("polyId");
    localStorage.removeItem("role");

    console.log("✅ Login success:", uid, polyId, role);

    // 5. Profile completeness check
    const requiredFields = ["name", "gender", "course", "bio", "profilePic"];
    for (let f of requiredFields) {
      if (!userDoc[f] || userDoc[f].trim() === "") {
        console.warn(`⚠️ Missing ${f}, redirecting to profile update`);
        window.location.href = `../${role}/community/profile_update.html`;
        return;
      }
    }

    // 6. Redirect based on role
    if (role === "student") {
      window.location.href = `../student/community/index.html`;
    } else if (role === "staff") {
      window.location.href = `../staff/community/community.html`;
    } else {
      alert("Role not recognized.");
    }

  } catch (error) {
    console.error("❌ Login error:", error);
    alert("Error: " + error.message);
  }
}

/* ======================= STUDENT SIGNUP ======================= */
async function signUp() {
  const matric = document.getElementById("matric").value.trim().toUpperCase();
  const ic = document.getElementById("ic").value.trim();
  const email = document.getElementById("studentEmail").value.trim();
  const polyId = document.getElementById("polySelect").value;
  const password = document.getElementById("password-signup").value.trim();
  const confirmPassword = document.getElementById("password-confirm-signup").value.trim();

  if (password !== confirmPassword) {
    alert("⚠️ Passwords do not match");
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    await db.collection(`polys/${polyId}/students`).doc(uid).set({
      uid,
      email,
      matricNo: matric,
      icNo: ic,
      role: "student",
      polyId,
      name: "",
      gender: "",
      course: "",
      bio: "",
      profilePic: "",
      followersCount: 0,
      followingCount: 0,
      points: 0,
      stats: { posts: 0, likes: 0, comments: 0, shares: 0 },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    // Delete from temp
    const tempQuery = await db.collectionGroup("temp_student_intake").where("matricNo", "==", matric).get();
    if (!tempQuery.empty) {
      await tempQuery.docs[0].ref.delete();
    }

    // Save session
    // ✅ Save new session
    localStorage.setItem("userUID", uid);
    localStorage.setItem("userHomePolyId", polyId);
    localStorage.setItem("userRole", "student");

    // 🧹 Clear old keys
    localStorage.removeItem("uid");
    localStorage.removeItem("polyId");
    localStorage.removeItem("role");


    // Redirect to profile update
    window.location.href = `../STUDENT/community/profile_update.html`;

  } catch (err) {
    console.error("❌ Signup error:", err.message);
    alert(err.message);
  }
}

/* ======================= STAFF SIGNUP — FIXED ======================= */
async function staffSignUp() {
  const staffId = document.getElementById("staffId").value.trim().toUpperCase();
  const ic = document.getElementById("staffIc").value.trim();
  const email = document.getElementById("staffEmail").value.trim();
  const polyId = document.getElementById("staffPolySelect").value;
  const password = document.getElementById("staffPassword").value.trim();
  const confirmPassword = document.getElementById("staffConfirmPassword").value.trim();

  if (password !== confirmPassword) {
    alert("⚠️ Passwords do not match");
    return;
  }

  try {
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const uid = userCredential.user.uid;

    await db.collection(`polys/${polyId}/staffs`).doc(uid).set({
      uid,
      email,
      staffId: staffId || "",            // ✅ make sure always saved
      icNo: ic || "",
      role: "staff",
      polyId,
      name: "",
      gender: "",
      course: "",
      bio: "",
      profilePic: "",
      followersCount: 0,
      followingCount: 0,
      points: 0,
      stats: {
        posts: 0,
        likes: 0,
        comments: 0,
        shares: 0
      },
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }, { merge: true }); // ✅ ensures overwriting issues don’t drop fields

    // Delete from temp_staff_new under current poly only (no index needed)
    const tempQuery = await db
      .collection(`polys/${polyId}/temp_staff_new`)
      .where("staffId", "==", staffId)
      .get();
    if (!tempQuery.empty) {
      await tempQuery.docs[0].ref.delete();
    }


    // ✅ Session keys (same as student)
    localStorage.setItem("userUID", uid);
    localStorage.setItem("userHomePolyId", polyId);
    localStorage.setItem("userRole", "staff");
    localStorage.removeItem("uid");
    localStorage.removeItem("polyId");
    localStorage.removeItem("role");

    // ✅ Redirect
    window.location.href = `../staff/profile/profile_update.html`;

  } catch (err) {
    console.error("❌ Staff signup error:", err.message);
    alert(err.message);
  }
}


/* ======================= FORGOT PASSWORD ======================= */
async function forgotPassword() {
  const email = prompt("Enter your registered email:");
  if (!email) return;
  try {
    await firebase.auth().sendPasswordResetEmail(email);
    alert("📩 Password reset email sent!");
  } catch (err) {
    alert("❌ " + err.message);
  }
}

/* ======================= EXPORT TO HTML (onclick) ======================= */
window.flip = flip;
window.flipAgain = flipAgain;
window.showStudentSignup = showStudentSignup;
window.showStaffSignup = showStaffSignup;
window.login = login;
window.signUp = signUp;
window.staffSignUp = staffSignUp;
window.forgotPassword = forgotPassword;
