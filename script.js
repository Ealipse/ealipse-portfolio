const featuredContainer = document.querySelector(".featured");
const grid = document.querySelector(".grid");

const featuredMap = maps[0];
const otherMaps = maps.slice(1);

function createCard(map) {
  const videoBtn = (map.yt && map.yt.trim() !== "")
    ? `<a href="${map.yt}" target="_blank" class="btn">YouTube</a>`
    : "";

  return `
    <div class="card" data-id="${map.tm.split("/").pop()}" onclick="expandCard(this)">
      
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
          <p class="awards">Awards: ...</p>
        </div>

        <div class="footer-right">
          <a href="${map.tm}" target="_blank" class="btn">Play</a>
          ${videoBtn}
        </div>
      </div>

    </div>
  `;
}

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

if (featuredContainer && featuredMap) {
  featuredContainer.innerHTML = createCard(featuredMap);
}

otherMaps.forEach(map => {
  grid.innerHTML += createCard(map);
});


// Mobile Picture Swipe
document.querySelectorAll(".card-image").forEach(container => {
  let startX = 0;
  let endX = 0;

  container.addEventListener("touchstart", (e) => {
    startX = e.touches[0].clientX;
  });

  container.addEventListener("touchend", (e) => {
    endX = e.changedTouches[0].clientX;

    handleSwipe(container, startX, endX);
  });
});

function handleSwipe(container, startX, endX) {
  const threshold = 40;

  const card = container.closest(".card");
  const title = card.querySelector("h3").innerText;
  const map = maps.find(m => m.name === title);

  const img = container.querySelector("img");
  const dots = container.querySelectorAll(".dot");

  let currentIndex = [...dots].findIndex(d => d.classList.contains("active"));

  if (startX - endX > threshold) {
    // swipe left → next
    currentIndex = (currentIndex + 1) % map.images.length;
  } else if (endX - startX > threshold) {
    // swipe right → prev
    currentIndex = (currentIndex - 1 + map.images.length) % map.images.length;
  } else {
    return;
  }

  img.src = map.images[currentIndex];

  dots.forEach(d => d.classList.remove("active"));
  dots[currentIndex]?.classList.add("active");
}

const sidebar = document.querySelector(".sidebar");

const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      document.body.classList.add("sidebar-visible");
    } else {
      document.body.classList.remove("sidebar-visible");
    }
  });
}, {
  threshold: 0.2
});

if (sidebar) observer.observe(sidebar);