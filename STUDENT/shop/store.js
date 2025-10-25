// keep your pattern: cart in localStorage + QR modal + cart counter

// --- cart bubble ---
let cart = JSON.parse(localStorage.getItem("cart")) || [];
const cartCountEl = document.querySelector(".cart-count");
function updateCartCount(){
  const c = cart.reduce((n,i)=> n + (i.quantity||0), 0);
  if(c>0){ cartCountEl.textContent = c; cartCountEl.style.display = "inline-block"; }
  else { cartCountEl.style.display = "none"; }
}
updateCartCount();

// --- add to cart buttons ---
document.querySelectorAll(".add-to-cart").forEach(btn=>{
  btn.addEventListener("click", ()=>{
    const store = btn.dataset.store;
    const name  = btn.dataset.name;
    const price = parseFloat(btn.dataset.price||"0");
    const existing = cart.find(i => i.store===store && i.name===name);
    if(existing) existing.quantity += 1;
    else cart.push({ store, name, price, quantity: 1 });

    localStorage.setItem("cart", JSON.stringify(cart));
    updateCartCount();
    alert(`${name} added to cart from ${store}`);
  });
});

// --- QR modal ---
const modal = document.getElementById("qrModal");
const qrBtn = document.querySelector(".qr-btn");
const closeBtn = document.querySelector(".qr-content .close");
qrBtn.addEventListener("click", ()=> modal.style.display = "flex");
closeBtn.addEventListener("click", ()=> modal.style.display = "none");
window.addEventListener("click", e => { if(e.target===modal) modal.style.display="none"; });

// (optional) if you load seller profile from Firestore later, map to:
// document.getElementById("accHolder").textContent = seller.accHolder||"—";
// document.getElementById("bankName").textContent  = seller.bankName||"—";
// document.getElementById("bankAcc").textContent   = seller.bankAcc||"—";
// document.getElementById("qrImage").src           = seller.qrImage||"../../img/sample-qr.png";
