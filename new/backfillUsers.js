// Run this with: node backfillUsers.js

const admin = require("firebase-admin");

// Load your service account key
const serviceAccount = require("./serviceAccountKey");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

async function backfill() {
  try {
    const list = await auth.listUsers(1000); // fetch up to 1000 users
    const polys = ["pbu", "psp"]; // ✅ expand as needed

    for (const user of list.users) {
      const uid = user.uid;
      const email = user.email;

      console.log("Checking:", uid, email);

      let found = false;

      // Check each poly’s students collection
      for (const polyId of polys) {
        const stuRef = db.collection(`polys/${polyId}/students`).doc(uid);
        const stuSnap = await stuRef.get();

        if (stuSnap.exists) {
          const data = stuSnap.data();
          console.log(`✅ Found student in ${polyId}:`, email);

          // Add custom claims
          await auth.setCustomUserClaims(uid, {
            role: data.role || "student",
            polyId: polyId,
          });

          found = true;
          break;
        }

        const staffRef = db.collection(`polys/${polyId}/staff`).doc(uid);
        const staffSnap = await staffRef.get();

        if (staffSnap.exists) {
          const data = staffSnap.data();
          console.log(`✅ Found staff in ${polyId}:`, email);

          await auth.setCustomUserClaims(uid, {
            role: data.role || "staff",
            polyId: polyId,
          });

          found = true;
          break;
        }
      }

      if (!found) {
        console.log(`⚠️ User ${email} (${uid}) not found in Firestore, skipping`);
      }
    }

    console.log("🎉 Backfill complete with custom claims!");
  } catch (err) {
    console.error("❌ Error in backfill:", err);
  }
}

backfill();
