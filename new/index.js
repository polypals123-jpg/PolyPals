// PolyPals Cloud Functions
// 1. Auto-create database structure
// 2. Handle theme purchases
// 3. Suggest captions with Gemini
// 4. Generate quiz with Gemini

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { defineSecret } = require("firebase-functions/params");

// define the Gemini API Key secret
const GEMINI_API_KEY = defineSecret("GEMINI_API_KEY");

// ✅ Gemini SDK import
const { GoogleGenerativeAI } = require("@google/generative-ai");

// init firebase admin
initializeApp();
const db = getFirestore();

// ✅ Initialize Gemini with Firebase config secret
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ========================================
// 1️⃣ Auto-create database when poly added
// ========================================
exports.createPolyCollections = onDocumentCreated("poly_registry/{polyId}", async (event) => {
  const polyId = event.params.polyId;
  const polyData = event.data.data();

  console.log(`🚀 New Polytechnic Registered: ${polyId}`, polyData);

  const baseCollections = [
    "temp_student_intake",
    "temp_staff_new",
    "students",
    "staff",
    "followers",
    "posts",
    "communityPosts",
    "points",
    "shop",
    "chats",
    "group_chats",
    "ai",
    "ai_quiz",
    "hep_reports",
    "settings"
  ];

  try {
    await db.collection("polys").doc(polyId).set(
      {
        createdAt: FieldValue.serverTimestamp(),
        status: "active",
      },
      { merge: true }
    );

    const batch = db.batch();
    baseCollections.forEach((col) => {
      const ref = db.collection("polys").doc(polyId).collection(col).doc("_init");
      batch.set(ref, {
        createdAt: FieldValue.serverTimestamp(),
        system: true,
      });
    });

    // Ensure global themes collection
    const themesRef = db.collection("themes").doc("_init");
    batch.set(themesRef, {
      note: "Global themes uploaded by PolyCC",
      createdAt: FieldValue.serverTimestamp(),
      system: true,
    }, { merge: true });

    await batch.commit();
    console.log(`✅ Collections initialized for poly: ${polyId}`);
  } catch (err) {
    console.error(`❌ Error creating collections for ${polyId}:`, err);
  }
});

// ========================================
// 2️⃣ Theme purchase
// ========================================
exports.purchaseTheme = onCall(async (request) => {
  const { polyId, userId, role, themeId } = request.data;
  if (!polyId || !userId || !themeId || !role) {
    throw new Error("Missing required fields");
  }

  const themeRef = db.collection("themes").doc(themeId);
  const themeSnap = await themeRef.get();
  if (!themeSnap.exists) throw new Error("Theme not found");

  const themeData = themeSnap.data();
  const price = themeData.price;

  let userRef;
  if (role === "student") {
    userRef = db.collection("polys").doc(polyId).collection("students").doc(userId);
  } else if (["staff", "hep", "lecturer", "jabatan"].includes(role)) {
    userRef = db.collection("polys").doc(polyId).collection("staff").doc(userId);
  } else if (role === "polycc") {
    userRef = db.collection("polycc").doc(userId);
  } else {
    throw new Error("Invalid role");
  }

  const pointsRef = db.collection("polys").doc(polyId).collection("points").doc(userId);
  const pointsSnap = await pointsRef.get();
  let currentPoints = pointsSnap.exists ? (pointsSnap.data().total || 0) : 0;

  if (currentPoints < price) throw new Error("Not enough points to purchase this theme");

  const batch = db.batch();
  batch.set(pointsRef, { total: currentPoints - price }, { merge: true });

  const historyRef = pointsRef.collection("history").doc();
  batch.set(historyRef, {
    type: "theme_purchase",
    themeId,
    value: -price,
    createdAt: FieldValue.serverTimestamp(),
  });

  const ownedRef = userRef.collection("themes").doc(themeId);
  batch.set(ownedRef, {
    owned: true,
    purchasedAt: FieldValue.serverTimestamp(),
    applied: false,
  });

  await batch.commit();
  return { success: true, message: `Theme ${themeId} purchased successfully!` };
});

// ========================================
// 3️⃣ Suggest Caption with Gemini
exports.suggestCaption = onCall(
  { secrets: [GEMINI_API_KEY] },   // attach secret properly
  async (data, context) => {
    try {
      const text = data.text || "PolyPals student life";

      // use the secret value at runtime
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());

      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-latest",  // ✅ stable model
        apiVersion: "v1"                   // ✅ force correct API version
      });

      const prompt = `Give 3 short catchy social media captions for this post: "${text}". 
      Return only JSON array like: ["caption 1","caption 2","caption 3"]`;

      const result = await model.generateContent(prompt);
      const rawText = result.response.text();

      let suggestions = [];
      try {
        suggestions = JSON.parse(rawText);
      } catch {
        suggestions = [rawText]; // fallback if parsing fails
      }

      return { suggestions };
    } catch (error) {
      console.error("❌ Suggest Caption Error:", error);
      throw new Error("Caption suggestion failed");
    }
  }
);



// 4️⃣ Generate Quiz with Gemini
exports.generateQuiz = onCall(
  { secrets: [GEMINI_API_KEY] },   // attach secret handle (not string)
  async (request, context) => {
    try {
      const course = request.data.course || "General knowledge";

      // use secret properly
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY.value());

      // force correct model + API version
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-flash-latest",   // 👈 stable model
        apiVersion: "v1"                   // 👈 avoid v1beta 404 issue
      });

      const prompt = `
      Generate 1 quiz question related to ${course}.
      Answer strictly in JSON:
      {
        "question": "What does HTML stand for?",
        "answer": "HyperText Markup Language",
        "points": 5
      }`;

      const result = await model.generateContent(prompt);
      const rawText = result.response.text();

      let quiz;
      try {
        quiz = JSON.parse(rawText);
      } catch {
        quiz = {
          question: "What does HTML stand for?",
          answer: "HyperText Markup Language",
          points: 5
        };
      }

      return quiz;
    } catch (error) {
      console.error("❌ Quiz Error:", error);
      throw new Error("Quiz generation failed");
    }
  }
);


