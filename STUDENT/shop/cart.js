// ---------------- Cart rendering ----------------
let cart = JSON.parse(localStorage.getItem("cart")) || [];
const container = document.getElementById("cartContainer");

function groupByStore(items){
  return items.reduce((acc, item)=>{
    acc[item.store] = acc[item.store] || [];
    acc[item.store].push(item);
    return acc;
  }, {});
}

function renderCart(){
  container.innerHTML = "";
  if(cart.length === 0){
    container.innerHTML = `
      <div class="cart-seller">
        <h3>Your cart is empty</h3>
        <p>Browse <a href="shop.html">Poly Shop</a> to add some goodies.</p>
      </div>
    `;
    return;
  }

  const grouped = groupByStore(cart);
  Object.keys(grouped).forEach(storeName=>{
    const items = grouped[storeName];
    const total = items.reduce((sum,i)=> sum + (i.price*i.quantity), 0).toFixed(2);

    // unique ids for inputs
    const uid = "proof_" + Math.random().toString(36).slice(2,8);

    const block = document.createElement("div");
    block.className = "cart-seller";
    block.innerHTML = `
      <h3>${storeName}</h3>

      ${items.map(i=>`
        <div class="cart-item">
          <p class="item-name">${i.name}</p>
          <p class="item-qty">x${i.quantity}</p>
          <p class="item-price">RM${(i.price*i.quantity).toFixed(2)}</p>
        </div>
      `).join("")}

      <ul class="order-timeline" data-store="${storeName}">
        <li class="active">Payment Pending</li>
        <li>Waiting Seller Confirmation</li>
        <li>To Receive</li>
        <li>Received</li>
      </ul>

      <div class="qr-section">
        <button class="qr-btn" data-store="${storeName}"><i class="fa fa-qrcode"></i> View Bank QR</button>
      </div>

      <div class="payment-section">
        <label for="${uid}" class="proof-label"><i class="fa fa-upload"></i> Upload Proof</label>
        <input id="${uid}" class="proof-input" type="file" accept=".jpg,.jpeg,.png,.pdf" data-store="${storeName}">
        <button class="view-proof-btn" data-store="${storeName}" style="display:none;">
          <i class="fa fa-eye"></i> Preview Proof
        </button>
      </div>

      <div style="text-align:right; margin-top:8px; font-weight:700;">Total: RM${total}</div>
    `;
    container.appendChild(block);
  });

  wireEvents();
}
renderCart();

// ---------------- QR Modal (shared) ----------------
const qrModal = document.getElementById("qrModal");
const qrClose = qrModal.querySelector(".close");
const qrImage = document.getElementById("qrImage");
const accHolder = document.getElementById("accHolder");
const bankName  = document.getElementById("bankName");
const bankAcc   = document.getElementById("bankAcc");

// demo bank data per store (replace with Firestore later)
const sellerBank = {
  "Mak Cik’s Kitchen": { accHolder:"Mak Cik Aminah", bankName:"Maybank", bankAcc:"123456789012", qr:"../../img/sample-qr.png" },
  "Ali’s Burger Shack": { accHolder:"Ali Bin Abu", bankName:"CIMB", bankAcc:"9876543210", qr:"../../img/sample-qr.png" }
};

function openQR(store){
  const info = sellerBank[store] || { accHolder:"—", bankName:"—", bankAcc:"—", qr:"../../img/sample-qr.png" };
  accHolder.textContent = info.accHolder;
  bankName.textContent  = info.bankName;
  bankAcc.textContent   = info.bankAcc;
  qrImage.src           = info.qr;
  qrModal.style.display = "flex";
}
qrClose.addEventListener("click", ()=> qrModal.style.display = "none");
window.addEventListener("click", e=>{ if(e.target===qrModal) qrModal.style.display="none"; });

// ---------------- Proof Modal (shared) ----------------
const proofModal = document.getElementById("proofModal");
const proofClose = proofModal.querySelector(".close");
const proofImg = document.getElementById("proofImage");
const proofPdf = document.getElementById("proofPdf");
let proofObjectURLs = {}; // per store
proofClose.addEventListener("click", ()=> proofModal.style.display = "none");
window.addEventListener("click", e=>{ if(e.target===proofModal) proofModal.style.display="none"; });

function openProof(url){
  if(!url){ alert("No proof uploaded yet."); return; }
  if(url.toLowerCase().endsWith(".pdf")){
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

// ---------------- Events per block ----------------
function wireEvents(){
  // QR buttons (multi)
  document.querySelectorAll(".qr-btn").forEach(btn=>{
    btn.addEventListener("click", ()=> openQR(btn.dataset.store));
  });

  // Proof inputs (multi) -> set timeline step 2 "Waiting Seller Confirmation"
  document.querySelectorAll(".proof-input").forEach(input=>{
    input.addEventListener("change", ()=>{
      const store = input.dataset.store;
      const files = input.files || [];
      const timeline = input.closest(".cart-seller").querySelector(".order-timeline");
      const steps = timeline.querySelectorAll("li");
      // activate step 2
      steps.forEach(li=> li.classList.remove("active"));
      steps[1].classList.add("active");

      // create object URL for preview
      if(files.length>0){
        const f = files[0];
        if(proofObjectURLs[store]) URL.revokeObjectURL(proofObjectURLs[store]);
        const url = URL.createObjectURL(f);
        // store URL for preview
        proofObjectURLs[store] = url;
        // show preview button
        const btn = input.closest(".payment-section").querySelector(".view-proof-btn");
        btn.style.display = "inline-block";
      }
    });
  });

  // View proof (multi)
  document.querySelectorAll(".view-proof-btn").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const url = proofObjectURLs[btn.dataset.store];
      openProof(url);
    });
  });
}
