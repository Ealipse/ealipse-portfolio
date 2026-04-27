const grid = document.querySelector(".grid");


maps.forEach(map => {

  const videoBtn = (map.yt && map.yt.trim() !== "")
    ? `<a href="${map.yt}" target="_blank" class="btn">Video</a>`
    : "";

  grid.innerHTML += `
    <div class="card" onclick="expandCard(this)">
      <img src="${map.image}">
      <div class="card-info">
        <h3>${map.name}</h3>
      </div>

      <div class="card-footer">
        <a href="${map.tm}" target="_blank" class="btn">Play</a>
        ${videoBtn}
      </div>
    </div>
  `;
});

function expandCard(card) {
  const isActive = card.classList.contains("active");

  document.querySelectorAll(".card").forEach(c => c.classList.remove("active"));
  document.body.classList.remove("modal-active");

  if (!isActive) {
    card.classList.add("active");
    document.body.classList.add("modal-active");
  }
}

document.addEventListener("click", (e) => {
  if (!e.target.closest(".card")) {
    document.querySelectorAll(".card").forEach(c => c.classList.remove("active"));
    document.body.classList.remove("modal-active");
  }
});