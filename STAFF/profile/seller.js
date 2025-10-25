// =======================================
// 🛍️ PolyPals Become Seller (v8 version)
// =======================================

const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

const form = document.getElementById("sellerForm");
const btn = document.querySelector(".submit-btn");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  btn.disabled = true;
  btn.innerHTML = `<i class="fa fa-spinner fa-spin"></i> Creating...`;

  const user = auth.currentUser;
  if (!user) {
    alert("Please login first.");
    btn.disabled = false;
    btn.innerHTML = `<i class="fa fa-store"></i> Become Seller`;
    return;
  }

  const uid = user.uid;
  const polyId = localStorage.getItem("userHomePolyId");
  if (!polyId) {
    alert("⚠️ Missing Polytechnic ID.");
    return;
  }

  // Form fields
  const storeName = document.getElementById("storeName").value.trim();
  const tagline = document.getElementById("tagline").value.trim();
  const about = document.getElementById("about").value.trim();
  const whatsapp = document.getElementById("whatsapp").value.trim();
  const category = document.getElementById("category").value;
  const accHolder = document.getElementById("accHolder").value.trim();
  const qrFile = document.getElementById("qrImage").files[0];
  const logoFile = document.getElementById("logo").files[0];
  const bannerFile = document.getElementById("storeBanner").files[0];

  try {
    // ===========================
    // 📤 Upload images
    // ===========================
    const uploadFile = async (file, name) => {
      const path = `polys/${polyId}/sellers/${uid}/${name}_${Date.now()}.png`;
      const ref = storage.ref(path);
      await ref.put(file);
      return await ref.getDownloadURL();
    };

    const qrURL = await uploadFile(qrFile, "bankQR");
    const logoURL = logoFile ? await uploadFile(logoFile, "logo") : "";
    const bannerURL = bannerFile ? await uploadFile(bannerFile, "banner") : "";

    // ===========================
    // 🏪 Save seller details
    // ===========================
    await db.collection("polys").doc(polyId)
      .collection("sellers").doc(uid)
      .set({
        uid,
        storeName,
        tagline,
        about,
        whatsapp,
        category,
        accHolder,
        qrImage: qrURL,
        logo: logoURL,
        banner: bannerURL,
        totalSales: 0,
        totalOrders: 0,
        pendingOrders: 0,
        completedOrders: 0,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    // ===========================
    // 🔗 Add reference under roles
    // ===========================
    await db.collection("polys").doc(polyId)
      .collection("roles").doc(uid)
      .collection("seller").doc(uid)
      .set({
        sellerId: uid,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      });

    alert("🎉 Store registered successfully!");
    window.location.href = "store-analytics.html";

  } catch (err) {
    console.error("❌ Seller creation error:", err);
    alert("Failed to create store. Please try again.");
    btn.disabled = false;
    btn.innerHTML = `<i class="fa fa-store"></i> Become Seller`;
  }
});
