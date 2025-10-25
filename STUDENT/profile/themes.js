// Scroll buttons
document.querySelectorAll(".scroll-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const row = document.getElementById(btn.dataset.target);
    row.scrollBy({ left: btn.classList.contains("left") ? -300 : 300, behavior: "smooth" });
  });
});

// Preview overlay
const overlay = document.getElementById("previewOverlay");
document.querySelectorAll(".preview-btn").forEach(btn => {
  btn.addEventListener("click", e => {
    overlay.classList.remove("hidden");
  });
});
document.getElementById("closePreview").addEventListener("click", () => {
  overlay.classList.add("hidden");
});
document.querySelector(".back-btn").addEventListener("click", ()=> window.history.back());
