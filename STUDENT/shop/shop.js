// --- cart bubble from localStorage ---
let cart = JSON.parse(localStorage.getItem("cart")) || [];
function updateCartCount() {
  const count = cart.reduce((n, i) => n + (i.quantity || 0), 0);
  const el = document.querySelector(".cart-count");
  if (count > 0) { el.textContent = count; el.style.display = "inline-block"; }
  else { el.style.display = "none"; }
}
updateCartCount();

// --- category filter ---
const catBtns = document.querySelectorAll(".cat");
catBtns.forEach(btn => {
  btn.addEventListener("click", () => {
    catBtns.forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const val = btn.dataset.filter;
    document.querySelectorAll(".store-card").forEach(card => {
      const cat = card.dataset.category;
      card.style.display = (val === "all" || val === cat) ? "flex" : "none";
    });
  });
});

// --- search by store name ---
const input = document.getElementById("searchInput");
document.getElementById("searchBtn").addEventListener("click", runSearch);
input.addEventListener("keydown", (e)=>{ if(e.key==="Enter") runSearch(); });

function runSearch(){
  const q = input.value.trim().toLowerCase();
  document.querySelectorAll(".store-card").forEach(card => {
    const name = (card.dataset.name || "").toLowerCase();
    card.style.display = name.includes(q) ? "flex" : "none";
  });
}

// Load floating menu HTML into every page
fetch("../floating_icon.html")
  .then(res => res.text())
  .then(html => {
    document.body.insertAdjacentHTML("beforeend", html);

    // Wait until added, then activate toggle logic
    setTimeout(() => {
      const fab = document.querySelector('.fixed-action-btn');
      const mainFab = document.getElementById('mainFab');

      mainFab.addEventListener('click', () => {
        fab.classList.toggle('active');
      });

      document.addEventListener('click', (e) => {
        if (!fab.contains(e.target)) fab.classList.remove('active');
      });
    }, 300);
  });
