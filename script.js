const grid = document.querySelector(".grid");

maps.forEach(map => {

  const videoBtn = (map.yt && map.yt.trim() !== "")
    ? `<a href="${map.yt}" target="_blank" class="btn">YouTube</a>`
    : "";

  grid.innerHTML += `
    <div class="card" onclick="expandCard(this)">
      
      <div class="card-image">
        <img src="${map.images[0]}">

        ${map.images.length > 1 ? `
          <div class="dots">
            ${map.images.map((_, i) => `
              <span class="dot ${i === 0 ? "active" : ""}" 
                    onclick="changeImage(event, this, ${i})"></span>
            `).join("")}
          </div>
        ` : ""}
      </div>

      <div class="card-info">
        <h3>${map.name}</h3>
      </div>

      <div class="card-footer">

        <div class="footer-left">
          ${map.info.map(line => `<p>${line}</p>`).join("")}
        </div>

        <div class="footer-right">
          <a href="${map.tm}" target="_blank" class="btn">Play</a>
          ${videoBtn}
        </div>

      </div>

    </div>
  `;
});

function changeImage(e, dot, index) {
  e.stopPropagation();

  const card = dot.closest(".card");
  const img = card.querySelector("img");

  const title = card.querySelector("h3").innerText;
  const map = maps.find(m => m.name === title);

  img.src = map.images[index];

  card.querySelectorAll(".dot").forEach(d => d.classList.remove("active"));
  dot.classList.add("active");
}

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


// Discord copy name

function copyDiscord(el) {
  const text = el.childNodes[0].nodeValue.trim();

  navigator.clipboard.writeText(text);

  el.classList.add("copied");

  const original = text;
  el.childNodes[0].nodeValue = "Copied!";

  setTimeout(() => {
    el.childNodes[0].nodeValue = original;
    el.classList.remove("copied");
  }, 1200);
}

// TMX User page link
function copyLink(e, el) {
  // kopierer linken
  navigator.clipboard.writeText(el.href);

  // vis feedback
  const original = el.childNodes[0].nodeValue;
  el.childNodes[0].nodeValue = "Copied link!";

  el.classList.add("copied");

  setTimeout(() => {
    el.childNodes[0].nodeValue = original;
    el.classList.remove("copied");
  }, 1200);
}