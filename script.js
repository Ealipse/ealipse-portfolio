const featuredContainer = document.querySelector(".featured");
const grid = document.querySelector(".grid");
const isProjectsPage = document.body.classList.contains("projects-page");

const hasMapCards = grid && typeof maps !== "undefined" && Array.isArray(maps);
const featuredMap = hasMapCards && featuredContainer ? maps[0] : null;
const otherMaps = hasMapCards && featuredContainer ? maps.slice(1, 7) : [];

function getMapId(map) {
  return map.tm.split("/").filter(Boolean).pop();
}

function getCachedAwardCount(map) {
  return map.awardCount ?? map.awards ?? null;
}

function getInfoValue(map, label) {
  const line = map.info.find(item => item.startsWith(`${label}:`));
  return line ? line.slice(label.length + 1).trim() : "";
}

function getMapTags(map) {
  return getInfoValue(map, "Tag")
    .split(",")
    .map(tag => tag.trim())
    .filter(Boolean);
}

function getAuthorTimeMs(map) {
  const value = getInfoValue(map, "Author time");
  const match = value.match(/^(\d+):(\d{2})\.(\d{3})$/);
  if (!match) return null;

  return (Number(match[1]) * 60 * 1000) + (Number(match[2]) * 1000) + Number(match[3]);
}

function getUploadedTime(map) {
  const parsed = Date.parse(getInfoValue(map, "Uploaded"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatCompactNumber(value) {
  if (!Number.isFinite(value)) return "";
  if (value < 1000) return String(value);
  return `${Math.floor(value / 1000)}k+`;
}

function updateSiteStats() {
  if (typeof siteStats === "undefined") return;

  const awards = document.querySelector('[data-stat="awardsReceived"]');
  if (awards) {
    awards.textContent = formatCompactNumber(siteStats.awardsReceivedCount);
  }
}

function createCard(map) {
  const mapId = getMapId(map);
  const awards = getCachedAwardCount(map) ?? "...";
  const videoBtn = (map.yt && map.yt.trim() !== "")
    ? `<a href="${map.yt}" target="_blank" class="btn">YouTube</a>`
    : "";

  return `
    <div class="card" data-id="${mapId}" onclick="openMapSheet(this)">
      
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
          <p class="awards">Awards: <span data-awards-for="${mapId}">${awards}</span></p>
        </div>

        <div class="footer-right">
          <a href="${map.tm}" target="_blank" class="btn">Play</a>
          ${videoBtn}
        </div>
      </div>

    </div>
  `;
}

function createMapSheet() {
  const sheet = document.createElement("aside");
  sheet.className = "map-sheet";
  sheet.setAttribute("aria-hidden", "true");
  sheet.innerHTML = `
    <button class="sheet-close" type="button" onclick="closeMapSheet()" aria-label="Close">&times;</button>
    <div class="sheet-inner"></div>
  `;
  document.body.appendChild(sheet);
  return sheet;
}

const mapSheet = hasMapCards ? createMapSheet() : null;

function getMapByCard(card) {
  return maps.find(map => getMapId(map) === card.dataset.id);
}

function renderSheetDots(map, activeIndex) {
  if (map.images.length <= 1) return "";

  return `
    <div class="dots sheet-dots">
      ${map.images.map((_, i) => `
        <span class="dot ${i === activeIndex ? "active" : ""}"
              onclick="changeSheetImage(event, ${i})"></span>
      `).join("")}
    </div>
  `;
}

function openMapSheet(card) {
  if (!mapSheet) return;

  const map = getMapByCard(card);
  if (!map) return;

  const activeDot = card.querySelector(".dot.active");
  const activeIndex = activeDot ? [...card.querySelectorAll(".dot")].indexOf(activeDot) : 0;
  const awards = getCachedAwardCount(map) ?? "...";
  const videoBtn = (map.yt && map.yt.trim() !== "")
    ? `<a href="${map.yt}" target="_blank" class="btn">YouTube</a>`
    : "";

  mapSheet.dataset.id = card.dataset.id;
  mapSheet.dataset.imageIndex = activeIndex;
  mapSheet.querySelector(".sheet-inner").innerHTML = `
    <div class="sheet-media">
      <img src="${map.images[activeIndex]}" alt="${map.name}">
      ${renderSheetDots(map, activeIndex)}
    </div>

    <div class="sheet-content">
      <p class="label">Map Details</p>
      <h2>${map.name}</h2>
      <div class="sheet-info">
        ${map.info.map(line => `<p>${line}</p>`).join("")}
        <p class="awards">Awards: <span data-awards-for="${card.dataset.id}">${awards}</span></p>
      </div>
      <div class="sheet-actions">
        <a href="${map.tm}" target="_blank" class="btn">Play</a>
        ${videoBtn}
      </div>
    </div>
  `;

  document.body.classList.add("sheet-active");
  mapSheet.classList.add("active");
  mapSheet.setAttribute("aria-hidden", "false");

  const cardAwards = document.querySelector(`.card [data-awards-for="${card.dataset.id}"]`);
  const sheetAwards = mapSheet.querySelector(`[data-awards-for="${card.dataset.id}"]`);
  if (cardAwards && sheetAwards) sheetAwards.textContent = cardAwards.textContent;
}

function closeMapSheet() {
  if (!mapSheet) return;

  document.body.classList.remove("sheet-active");
  mapSheet.classList.remove("active");
  mapSheet.setAttribute("aria-hidden", "true");
}

function changeSheetImage(e, index) {
  e.stopPropagation();
  if (!mapSheet) return;

  const map = maps.find(item => getMapId(item) === mapSheet.dataset.id);
  if (!map) return;

  mapSheet.dataset.imageIndex = index;
  mapSheet.querySelector(".sheet-media img").src = map.images[index];
  mapSheet.querySelectorAll(".sheet-dots .dot").forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });
}

async function loadAwardCounts() {
  if (maps.every(map => getCachedAwardCount(map) !== null)) return;

  const ids = maps.map(getMapId).filter(Boolean);
  if (ids.length === 0) return;

  try {
    const params = new URLSearchParams({
      fields: "MapId,AwardCount",
      id: ids.join(",")
    });
    const res = await fetch(`https://trackmania.exchange/api/maps?${params}`);
    if (!res.ok) throw new Error(`MX API returned ${res.status}`);

    const data = await res.json();
    const mapInfo = data.Results || [];
    const awardsById = new Map(
      mapInfo.map(map => [String(map.MapId), map.AwardCount])
    );

    document.querySelectorAll("[data-awards-for]").forEach(el => {
      const awards = awardsById.get(el.dataset.awardsFor);
      el.textContent = awards ?? "0";
    });
  } catch (error) {
    console.error("Could not load award counts", error);
  }
}

function changeImage(e, dot, index) {
  e.stopPropagation();

  const card = dot.closest(".card");
  const img = card.querySelector("img");
  const map = getMapByCard(card);
  if (!map) return;

  img.src = map.images[index];

  card.querySelectorAll(".dot").forEach(d => d.classList.remove("active"));
  dot.classList.add("active");
}

document.addEventListener("click", (e) => {
  if (document.body.classList.contains("sheet-active") &&
      !e.target.closest(".map-sheet") &&
      !e.target.closest(".card")) {
    closeMapSheet();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeMapSheet();
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

function setupCardImageSwipe() {
  document.querySelectorAll(".card-image").forEach(container => {
    if (container.dataset.swipeReady) return;
    container.dataset.swipeReady = "true";

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
}

function renderHomePage() {
  if (featuredMap) {
    featuredContainer.innerHTML = createCard(featuredMap);
  }

  otherMaps.forEach(map => {
    grid.innerHTML += createCard(map);
  });

  setupCardImageSwipe();
}

function populateTagFilter(tagFilter) {
  const tags = [...new Set(maps.flatMap(getMapTags))].sort((a, b) => a.localeCompare(b));

  tagFilter.innerHTML = `<option value="">All styles</option>`;
  tags.forEach(tag => {
    tagFilter.innerHTML += `<option value="${tag}">${tag}</option>`;
  });
}

function sortProjects(projects, sortValue) {
  const sorted = [...projects];

  sorted.sort((a, b) => {
    if (sortValue === "oldest") return getUploadedTime(a) - getUploadedTime(b);
    if (sortValue === "awards-desc") return (getCachedAwardCount(b) ?? 0) - (getCachedAwardCount(a) ?? 0);
    if (sortValue === "awards-asc") return (getCachedAwardCount(a) ?? 0) - (getCachedAwardCount(b) ?? 0);
    if (sortValue === "author-asc") return (getAuthorTimeMs(a) ?? Number.MAX_SAFE_INTEGER) - (getAuthorTimeMs(b) ?? Number.MAX_SAFE_INTEGER);
    if (sortValue === "author-desc") return (getAuthorTimeMs(b) ?? -1) - (getAuthorTimeMs(a) ?? -1);
    if (sortValue === "name") return a.name.localeCompare(b.name);

    return getUploadedTime(b) - getUploadedTime(a);
  });

  return sorted;
}

function setupProjectsPage() {
  const searchInput = document.querySelector("#projectSearch");
  const sortSelect = document.querySelector("#sortSelect");
  const tagFilter = document.querySelector("#tagFilter");
  const resetButton = document.querySelector("#resetFilters");
  const count = document.querySelector("#projectCount");

  if (!searchInput || !sortSelect || !tagFilter) return;

  populateTagFilter(tagFilter);

  function renderProjects() {
    const search = searchInput.value.trim().toLowerCase();
    const selectedTag = tagFilter.value;

    const filtered = maps.filter(map => {
      const tags = getMapTags(map);
      const haystack = [
        map.name,
        getInfoValue(map, "Author"),
        tags.join(" ")
      ].join(" ").toLowerCase();

      const matchesSearch = !search || haystack.includes(search);
      const matchesTag = !selectedTag || tags.includes(selectedTag);

      return matchesSearch && matchesTag;
    });

    const sorted = sortProjects(filtered, sortSelect.value);
    grid.innerHTML = sorted.map(createCard).join("");
    count.textContent = `${sorted.length} map${sorted.length === 1 ? "" : "s"}`;
    setupCardImageSwipe();
  }

  [searchInput, sortSelect, tagFilter].forEach(control => {
    control.addEventListener("input", renderProjects);
    control.addEventListener("change", renderProjects);
  });

  resetButton?.addEventListener("click", () => {
    searchInput.value = "";
    sortSelect.value = "newest";
    tagFilter.value = "";
    renderProjects();
  });

  renderProjects();
}

if (hasMapCards) {
  if (isProjectsPage) {
    setupProjectsPage();
  } else {
    renderHomePage();
  }

  loadAwardCounts();
}

updateSiteStats();

function handleSwipe(container, startX, endX) {
  const threshold = 40;

  const card = container.closest(".card");
  const map = getMapByCard(card);
  if (!map) return;

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

document.addEventListener("DOMContentLoaded", () => {
  const el = document.querySelector('[data-stat="awardsReceived"]');

  if (!el || !siteStats) return;

  const value = siteStats.awardsReceivedCount;

  // format: 4071 → 4000+
  const rounded = Math.floor(value / 1000) * 1000;

  el.innerText = value.toLocaleString();
});