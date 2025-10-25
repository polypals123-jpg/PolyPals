

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
  flip(); // <-- REQUIRED to reveal the back face
}

// Show the staff signup on the back face
function showStaffSignup() {
  const studentBox = document.getElementById("student-signup-box");
  const staffBox   = document.getElementById("staff-signup-box");
  if (studentBox && staffBox) {
    studentBox.style.display = "none";
    staffBox.style.display   = "block";
  }
  flip(); // <-- REQUIRED to reveal the back face
}

/* ======================= EYE ICONS (existing) ======================= */
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

// login_script.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";
import { firebaseConfig } from "../firebase-config.js";

// Init Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// UI elements
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const forgotPasswordBtn = document.getElementById("forgotPasswordBtn");
const polySelect = document.getElementById("polySelect"); // dropdown in HTML

// Helper to get polyId from dropdown
const polySel = () => document.getElementById("polySelect")?.value?.trim();

// LOGIN
window.login = async function () {
  const email = document.getElementById("login-identifier")?.value?.trim();
  const password = document.getElementById("password-login")?.value;
  const polyId = polySel();

  if (!polyId) return alert("Please choose your Polytechnic.");

  try {
    const { user } = await signInWithEmailAndPassword(auth, email, password);

    // check role in Firestore
    let snap = await getDoc(doc(db, `polys/${polyId}/students/${user.uid}`));
    if (!snap.exists()) snap = await getDoc(doc(db, `polys/${polyId}/staff/${user.uid}`));
    if (!snap.exists()) return alert("Account not found under this Polytechnic.");

    const data = snap.data();
    if (data.role === "student")      location.href = "../student/community/index.html";
    else if (data.role === "lecturer") location.href = "../lecturer/community/index.html";
    else if (data.role === "hep")      location.href = "../hep/community/index.html";
    else if (data.role === "jabatan")  location.href = "../jabatan/community/index.html";
    else if (data.role === "polycc")   location.href = "../polycc/dashboard.html";
    else alert("Unknown role.");
  } catch (err) {
    alert(err.message);
  }
};


window.signUp = async function () {
  const polyId = polySel();
  const matric = document.getElementById("matric")?.value?.trim();
  const ic     = document.getElementById("ic")?.value?.trim();
  const email  = document.getElementById("email-login")?.value?.trim();
  const pass   = document.getElementById("password-signup")?.value;
  const pass2  = document.getElementById("password-confirm-signup")?.value;

  if (!polyId) return alert("Please choose your Polytechnic.");
  if (pass !== pass2) return alert("Passwords do not match.");

  try {
    // Check intake first
    const q = query(
      collection(db, `polys/${polyId}/temp_student_intake`),
      where("matricNo", "==", matric),
      where("icNo", "==", ic)
    );
    const snap = await getDocs(q);
    if (snap.empty) return alert("Not in intake list.");

    const { user } = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, `polys/${polyId}/students/${user.uid}`), {
      email, matricNo: matric, icNo: ic, role: "student",
      followersCount: 0, followingCount: 0, points: 0,
      stats: { posts: 0, likes: 0, comments: 0, shares: 0 },
      createdAt: new Date(),
    });
    alert("Signup successful! You can login now.");
    flipAgain(); // go back to login face
  } catch (err) {
    alert(err.message);
  }
};

window.staffSignUp = async function () {
  const polyId   = polySel();
  const staffId  = document.getElementById("staffId")?.value?.trim();
  const staffIc  = document.getElementById("staffIc")?.value?.trim();
  const email    = document.getElementById("staffEmail")?.value?.trim();
  const pass     = document.getElementById("staffPassword")?.value;
  const pass2    = document.getElementById("staffConfirmPassword")?.value;

  if (!polyId) return alert("Please choose your Polytechnic.");
  if (pass !== pass2) return alert("Passwords do not match.");

  try {
    const q = query(
      collection(db, `polys/${polyId}/temp_staff_new`),
      where("staffNo", "==", staffId),
      where("icNo", "==", staffIc)
    );
    const snap = await getDocs(q);
    if (snap.empty) return alert("Not in staff intake.");

    const { user } = await createUserWithEmailAndPassword(auth, email, pass);
    await setDoc(doc(db, `polys/${polyId}/staff/${user.uid}`), {
      email, staffNo: staffId, icNo: staffIc, role: "lecturer",
      followersCount: 0, followingCount: 0, points: 0,
      createdAt: new Date(),
    });
    alert("Staff signup successful! You can login now.");
    flipAgain();
  } catch (err) {
    alert(err.message);
  }
};

// Make flip helpers callable from HTML
window.flip = flip;
window.flipAgain = flipAgain;
window.showStudentSignup = showStudentSignup;
window.showStaffSignup = showStaffSignup;
window.login = login;
window.signUp = signUp;
window.staffSignUp = staffSignUp;
window.forgotPassword = forgotPassword;


/*Remember me*/
import { setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-auth.js";

// Handle "Remember Me"
const rememberMeCheckbox = document.getElementById("rememberMe");
if (rememberMeCheckbox) {
  rememberMeCheckbox.addEventListener("change", () => {
    const persistence = rememberMeCheckbox.checked 
      ? browserLocalPersistence 
      : browserSessionPersistence;

    setPersistence(auth, persistence)
      .then(() => console.log("Auth persistence set:", rememberMeCheckbox.checked ? "local" : "session"))
      .catch((err) => console.error("❌ Persistence error:", err));
  });
}


window.forgotPassword = async function () {
  const email = prompt("Enter your email to reset password:");
  if (!email) return;
  try {
    await sendPasswordResetEmail(auth, email);
    alert("Reset link sent!");
  } catch (err) {
    alert(err.message);
  }
};


