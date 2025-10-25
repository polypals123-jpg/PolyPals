// PolyPals Cloud Functions
// 1. Auto-create database structure
// 2. Handle theme purchases
// 3. Suggest captions with Gemini
// 4. Generate quiz with Gemini

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { onCall } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");

// ✅ Gemini SDK import
const { GoogleGenerativeAI } = require("@google/generative-ai");

// ⚠️ Hardcode your API key here (replace with your real one)
const GEMINI_API_KEY = "AIzaSyC8jB4BXHun7bPt3Zm7cfYQQcR9HhVJAFw";

// init firebase admin
initializeApp();
const db = getFirestore();

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
    "staffs",
    "posts",
    "communityPosts",
    "shop",
    "chats",
    "group_chats",
    "ai",
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
exports.suggestCaption = onCall(async (data, context) => {
  const text = data.text || "PolyPals student life";

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY, { apiVersion: "v1" });
  const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // ✅ updated

  const prompt = `Give 3 short catchy social media captions for this post: "${text}". 
  Return only JSON array like: ["caption 1","caption 2","caption 3"]`;

  const result = await model.generateContent(prompt);
  return { suggestions: JSON.parse(result.response.text()) };
});

// ========================================
// 4️⃣ Generate Quiz with Gemini
exports.generateQuiz = onCall(async (request, context) => {
  try {
    const course = request.data.course || "General knowledge";

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY, { apiVersion: "v1" });
    const model = genAI.getGenerativeModel({ model: "models/gemini-2.5-flash" });

    const prompt = `
    Create ONE quiz question for the subject: ${course}.
    - The question must be clear and short.
    - Provide the correct answer.
    - Assign difficulty-based points: Easy = 10, Medium = 20, Hard = 30.
    
    Return your response STRICTLY as raw JSON only, no extra text:
    {
      "question": "string",
      "answer": "string",
      "points": 10
    }`;

    const result = await model.generateContent(prompt);
    let rawText = result.response.text().trim();

    // ✅ Extract JSON block only
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      rawText = jsonMatch[0];
    }

    let quiz = {};
    try {
      quiz = JSON.parse(rawText);
    } catch (err) {
      console.error("❌ Failed to parse Gemini response:", rawText);
      quiz = {
        question: "",
        answer: "",
        points: 0
      };
    }

    return quiz;
  } catch (error) {
    console.error("❌ Quiz Error:", error);
    return {
      question: "",
      answer: "",
      points: 0
    };
  }
});



// ========================================
// 5️⃣ AI Chat with Gemini
exports.aiChat = onCall(async (request, context) => {
  try {
    const message = request.data.message || "Hello!";

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY, { apiVersion: "v1" });
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" }); // ✅ updated

    const prompt = `You are PolyPals AI Assistant. Answer concisely and helpfully. 
    User says: "${message}"`;

    const result = await model.generateContent(prompt);
    const reply = result.response.text();

    return { reply };
  } catch (error) {
    console.error("❌ AI Chat Error:", error);
    throw new Error("AI Chat failed");
  }
});


