// ========================================
// 📊 PolyPals Store Analytics (Fixed Poly Structure)
// ========================================

const db = firebase.firestore();
const storage = firebase.storage();
const auth = firebase.auth();

// Elements
const storeLogoEl = document.getElementById("storeLogo");
const storeNameEl = document.getElementById("storeName");
const storeTaglineEl = document.getElementById("storeTagline");
const storeAboutEl = document.getElementById("storeAbout");
const storePhoneEl = document.getElementById("storePhone");
const storeCategoryEl = document.getElementById("storeCategory");
const accHolderEl = document.getElementById("accHolder");
const bankNameEl = document.getElementById("bankName");
const bankAccEl = document.getElementById("bankAcc");

const metricSales = document.getElementById("metricSales");
const metricOrders = document.getElementById("metricOrders");
const metricPending = document.getElementById("metricPending");
const metricCompleted = document.getElementById("metricCompleted");

const ordersList = document.getElementById("ordersList");
const productsGrid = document.getElementById("productsGrid");

// Modals
const editModal = document.getElementById("editModal");
const productModal = document.getElementById("productModal");
const proofModal = document.getElementById("proofModal");
const closeEdit = editModal.querySelector(".close");
const closeProduct = productModal.querySelector(".close");
const closeProof = proofModal.querySelector(".close");

// Edit fields
const editName = document.getElementById("editName");
const editTagline = document.getElementById("editTagline");
const editAbout = document.getElementById("editAbout");
const editPhone = document.getElementById("editPhone");
const editAccHolder = document.getElementById("editAccHolder");
const editCategory = document.getElementById("editCategory");
const editBank = document.getElementById("editBank");
const editAcc = document.getElementById("editAcc");

// Product fields
const productModalTitle = document.getElementById("productModalTitle");
const pId = document.getElementById("pId");
const pName = document.getElementById("pName");
const pDesc = document.getElementById("pDesc");
const pPrice = document.getElementById("pPrice");
const pStock = document.getElementById("pStock");
const pCategory = document.getElementById("pCategory");
const pImage = document.getElementById("pImage");

// Proof modal elements
const proofImg = document.getElementById("proofImage");
const proofPdf = document.getElementById("proofPdf");

// Buttons
document.getElementById("editStore").addEventListener("click", openEditModal);
document.getElementById("addProductBtn").addEventListener("click", () => openProductModal());
closeEdit.addEventListener("click", () => editModal.style.display = "none");
closeProduct.addEventListener("click", () => productModal.style.display = "none");
closeProof.addEventListener("click", () => proofModal.style.display = "none");
window.addEventListener("click", (e)=> {
  if (e.target === editModal) editModal.style.display = "none";
  if (e.target === productModal) productModal.style.display = "none";
  if (e.target === proofModal) proofModal.style.display = "none";
});

document.getElementById("editStore").addEventListener("click", openEditModal);
function openEditModal(){
  editModal.style.display = "flex";
}


// ================================
// 🔐 Auth + Load All Seller Data
// ================================
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    alert("Please login first.");
    window.location.href = "profile.html";
    return;
  }

  const uid = user.uid;
  const polyId = localStorage.getItem("userHomePolyId");

  if (!polyId) {
    alert("⚠️ Polytechnic not found in session.");
    return;
  }

  await loadStore(polyId, uid);
  await loadMetrics(polyId, uid);
  await loadOrders(polyId, uid);
  await loadProducts(polyId, uid);
});

// ================================
// 🏪 Load Store Details
// ================================
async function loadStore(polyId, uid){
  const sRef = db.collection("polys").doc(polyId)
                .collection("sellers").doc(uid);
  const snap = await sRef.get();

  if (!snap.exists){
    storeNameEl.textContent = "No store found";
    return;
  }

  const s = snap.data();
  storeLogoEl.src = s.logo || "../../img/logo.jpeg";
  storeNameEl.textContent = s.storeName || "Untitled Store";
  storeTaglineEl.textContent = s.tagline || "";
  storeAboutEl.textContent = s.about || "";
  storePhoneEl.textContent = s.whatsapp || "-";
  storeCategoryEl.textContent = s.category || "-";
  accHolderEl.textContent = s.accHolder || "-";
  bankNameEl.textContent = s.bankName || "-";
  bankAccEl.textContent = s.bankAcc || "-";

  // preload edit modal
  editName.value = s.storeName || "";
  editTagline.value = s.tagline || "";
  editAbout.value = s.about || "";
  editPhone.value = s.whatsapp || "";
  editAccHolder.value = s.accHolder || "";
  editCategory.value = s.category || "Food";
  editBank.value = s.bankName || "";
  editAcc.value = s.bankAcc || "";
}

// ================================
// 📊 Load Summary Metrics
// ================================
async function loadMetrics(polyId, uid){
  const sRef = db.collection("polys").doc(polyId)
                .collection("sellers").doc(uid);
  const snap = await sRef.get();
  if (!snap.exists) return;
  const s = snap.data();

  metricSales.textContent = `RM${Number(s.totalSales || 0).toFixed(2)}`;
  metricOrders.textContent = s.totalOrders || 0;
  metricPending.textContent = s.pendingOrders || 0;
  metricCompleted.textContent = s.completedOrders || 0;
}

// ================================
// 📦 Load Orders
// ================================
async function loadOrders(polyId, uid){
  ordersList.innerHTML = "";
  const qSnap = await db.collection("polys").doc(polyId)
                        .collection("sellers").doc(uid)
                        .collection("orders").get();

  qSnap.forEach(docSnap => {
    const o = docSnap.data();
    const card = document.createElement("div");
    card.className = "order-card";

    const statusClass = o.status === "Received" ? "received"
                      : o.status === "To Receive" ? "to-receive"
                      : "waiting";

    card.innerHTML = `
      <div class="order-info">
        <h4>${o.productName || "Item"} x${o.quantity || 1}</h4>
        <p>Buyer: ${o.buyerName || "-"}</p>
        <p>Total: RM${Number(o.total || 0).toFixed(2)}</p>
        <p>Status: <span class="status-badge ${statusClass}">${o.status || "Waiting Seller Confirmation"}</span></p>
      </div>
      <div class="order-actions">
        <button class="btn purple proof-btn" data-proof="${o.proofUrl || ""}">
          <i class="fa fa-file"></i> View Proof
        </button>
        <button class="btn purple confirm-btn" data-id="${docSnap.id}">
          <i class="fa fa-check"></i> Confirm Payment
        </button>
        <button class="btn blue received-btn" data-id="${docSnap.id}">
          <i class="fa fa-box"></i> Mark Received
        </button>
        <button class="btn red delete-order-btn" data-id="${docSnap.id}">
          <i class="fa fa-trash"></i> Delete
        </button>
      </div>
    `;
    ordersList.appendChild(card);
  });

  // Wire buttons
  ordersList.querySelectorAll(".proof-btn").forEach(btn => {
    btn.addEventListener("click", () => openProof(btn.dataset.proof));
  });
  ordersList.querySelectorAll(".confirm-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await updateOrderStatus(polyId, uid, btn.dataset.id, "To Receive");
    });
  });
  ordersList.querySelectorAll(".received-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      await updateOrderStatus(polyId, uid, btn.dataset.id, "Received");
    });
  });
  ordersList.querySelectorAll(".delete-order-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      if (!confirm("Delete this order?")) return;
      await db.collection("polys").doc(polyId)
        .collection("sellers").doc(uid)
        .collection("orders").doc(btn.dataset.id).delete();
      await loadOrders(polyId, uid);
    });
  });
}

// ================================
// 🧾 Order Proof Modal
// ================================
function openProof(url){
  if (!url) { alert("No proof uploaded."); return; }
  if (url.toLowerCase().endsWith(".pdf")){
    proofImg.style.display = "none";
    proofPdf.style.display = "block";
    proofPdf.src = url;
  } else {
    proofImg.style.display = "block";
    proofPdf.style.display = "none";
    proofImg.src = url;
  }
  proofModal.style.display = "flex";
}

// ================================
// ✅ Update Order Status
// ================================
async function updateOrderStatus(polyId, uid, orderId, newStatus){
  const oRef = db.collection("polys").doc(polyId)
                .collection("sellers").doc(uid)
                .collection("orders").doc(orderId);
  await oRef.update({ status: newStatus });

  const sRef = db.collection("polys").doc(polyId)
                .collection("sellers").doc(uid);
  const sSnap = await sRef.get();
  if (!sSnap.exists) return;
  const s = sSnap.data();

  let pending = s.pendingOrders || 0;
  let completed = s.completedOrders || 0;
  if (newStatus === "Received"){
    pending = Math.max(0, pending - 1);
    completed = (completed || 0) + 1;
    await sRef.update({ pendingOrders: pending, completedOrders: completed });
  }

  await loadOrders(polyId, uid);
  await loadMetrics(polyId, uid);
}

// ================================
// 📦 Load Products
// ================================
async function loadProducts(polyId, uid){
  productsGrid.innerHTML = "";
  const pSnap = await db.collection("polys").doc(polyId)
                        .collection("sellers").doc(uid)
                        .collection("products").get();

  pSnap.forEach(pdoc => {
    const p = pdoc.data();
    const card = document.createElement("div");
    card.className = "product-card";
    card.innerHTML = `
      <img src="${p.image || '../../img/logo.jpeg'}" alt="${p.name || ''}">
      <div class="info">
        <h4>${p.name || 'Unnamed'}</h4>
        <p>RM${Number(p.price || 0).toFixed(2)} &nbsp; | &nbsp; Stock: ${p.stock || 0}</p>
      </div>
      <div class="actions">
        <button class="btn purple edit-product" data-id="${pdoc.id}"><i class="fa fa-pen"></i></button>
        <button class="btn red delete-product" data-id="${pdoc.id}"><i class="fa fa-trash"></i></button>
      </div>
    `;
    productsGrid.appendChild(card);
  });
}

// ================================
// ✏️ Edit Store Modal
// ================================
function openEditModal(){
  editModal.style.display = "flex";
}

document.getElementById("editForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser; if (!user) return;
  const uid = user.uid;
  const polyId = localStorage.getItem("userHomePolyId");
  if (!polyId) return;

  await db.collection("polys").doc(polyId)
    .collection("sellers").doc(uid)
    .update({
      storeName: editName.value.trim(),
      tagline: editTagline.value.trim(),
      about: editAbout.value.trim(),
      whatsapp: editPhone.value.trim(),
      accHolder: editAccHolder.value.trim(),
      category: editCategory.value
    });

  alert("✅ Store updated.");
  editModal.style.display = "none";
  await loadStore(polyId, uid);
}
);

document.getElementById("editStore").addEventListener("click", openEditModal);
function openEditModal(){
  editModal.style.display = "flex";
}

// ================================
// ✏️ Edit & Delete Product Functionality
// ================================
productsGrid.addEventListener("click", async (e) => {
  const user = auth.currentUser;
  if (!user) return;
  const uid = user.uid;
  const polyId = localStorage.getItem("userHomePolyId");

  // 🧹 Edit button clicked
  if (e.target.closest(".edit-product")) {
    const id = e.target.closest(".edit-product").dataset.id;

    const pRef = db.collection("polys").doc(polyId)
      .collection("sellers").doc(uid)
      .collection("products").doc(id);

    const pSnap = await pRef.get();
    if (!pSnap.exists) return alert("Product not found!");

    const p = pSnap.data();

    // Prefill modal
    document.getElementById("pName").value = p.name || "";
    document.getElementById("pDesc").value = p.desc || "";
    document.getElementById("pPrice").value = p.price || 0;
    document.getElementById("pStock").value = p.stock || 0;
    document.getElementById("pCategory").value = p.category || "Other";
    document.getElementById("productModal").style.display = "flex";

    // Replace form submit temporarily for update
    const form = document.getElementById("productForm");
    form.onsubmit = async (ev) => {
      ev.preventDefault();
      try {
        const name = pName.value.trim();
        const desc = pDesc.value.trim();
        const price = parseFloat(pPrice.value);
        const stock = parseInt(pStock.value);
        const category = pCategory.value;
        const imageFile = pImage.files[0];
        let imageUrl = p.image || "";

        // Optional new image
        if (imageFile) {
          const ref = storage.ref(`polys/${polyId}/sellers/${uid}/products/${id}_${Date.now()}.png`);
          await ref.put(imageFile);
          imageUrl = await ref.getDownloadURL();
        }

        await pRef.update({
          name, desc, price, stock, category, image: imageUrl,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        alert("✅ Product updated successfully!");
        document.getElementById("productModal").style.display = "none";
        form.reset();
        await loadProducts(polyId, uid);
      } catch (err) {
        console.error("❌ Product update error:", err);
        alert("Failed to update product.");
      }
    };
  }

  // 🗑️ Delete button clicked
  if (e.target.closest(".delete-product")) {
    const id = e.target.closest(".delete-product").dataset.id;
    if (!confirm("Delete this product?")) return;

    await db.collection("polys").doc(polyId)
      .collection("sellers").doc(uid)
      .collection("products").doc(id).delete();

    alert("🗑️ Product deleted.");
    await loadProducts(polyId, uid);
  }
});
