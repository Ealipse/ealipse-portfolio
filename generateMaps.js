const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const TMX_AUTHOR = "Ealipse";
const TMX_USER_ID = 41068;
const TMX_API_URL = "https://trackmania.exchange/api/maps";
const TMX_USERS_API_URL = "https://trackmania.exchange/api/users";
const MAPS_FILE = path.join(__dirname, "maps.js");
const SITE_STATS_FILE = path.join(__dirname, "siteStats.js");

const FIELDS = [
  "MapId",
  "Name",
  "UploadedAt",
  "AwardCount",
  "Authors[]",
  "Tags[]",
  "Medals.Author",
  "Images[]",
  "VideoCount"
];

const EXCLUDED_MAP_IDS = new Set([
  // Add TMX map ids here to prevent auto-importing them.
]);

const CURATED_MAP_IDS = new Set([
  70070,
  66249,
  65710,
  58282,
  50404
]);

const MAP_OVERRIDES = {
  // Example:
  // 312345: {
  //   name: "Custom display name",
  //   yt: "https://youtu.be/example",
  //   order: 1
  // }
};

function readSeedMaps() {
  const source = fs.readFileSync(MAPS_FILE, "utf8");
  const sandbox = {};
  vm.runInNewContext(`${source}\nthis.maps = maps;`, sandbox, {
    filename: MAPS_FILE
  });
  return sandbox.maps;
}

function getMapId(map) {
  const match = map.tm.match(/mapshow\/(\d+)/);
  return match ? Number(match[1]) : null;
}

function getInfoValue(map, label) {
  const line = map.info.find(item => item.startsWith(`${label}:`));
  return line ? line.slice(label.length + 1).trim() : "";
}

function parsePortfolioDate(value) {
  const match = value.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);
  if (!match) return 0;

  const months = {
    jan: 0,
    january: 0,
    feb: 1,
    february: 1,
    mar: 2,
    march: 2,
    apr: 3,
    april: 3,
    may: 4,
    jun: 5,
    june: 5,
    jul: 6,
    july: 6,
    aug: 7,
    august: 7,
    sep: 8,
    sept: 8,
    september: 8,
    oct: 9,
    october: 9,
    nov: 10,
    november: 10,
    dec: 11,
    december: 11
  };

  const day = Number(match[1]);
  const month = months[match[2].toLowerCase()];
  const year = Number(match[3]);

  if (month === undefined) return 0;
  return Date.UTC(year, month, day);
}

function getPortfolioTimestamp(map) {
  return parsePortfolioDate(getInfoValue(map, "Uploaded"));
}

function formatDate(value) {
  const date = new Date(value);
  const formatter = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
  return formatter.format(date);
}

function formatAuthorTime(milliseconds) {
  if (!Number.isFinite(milliseconds)) return "";

  const totalSeconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const millis = milliseconds % 1000;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(millis).padStart(3, "0")}`;
}

function formatName(name) {
  if (!name) return "";
  if (name !== name.toUpperCase()) return name;
  return name.toLowerCase().replace(/\b[\w']/g, char => char.toUpperCase());
}

function imageUrls(map) {
  if (!Array.isArray(map.Images) || map.Images.length === 0) {
    return [`https://trackmania.exchange/mapimage/${map.MapId}/1`];
  }

  return map.Images
    .sort((a, b) => a.Position - b.Position)
    .map(image => `https://trackmania.exchange/mapimage/${map.MapId}/${image.Position}`);
}

function fromTmxMap(map) {
  const override = MAP_OVERRIDES[map.MapId] || {};
  const tags = Array.isArray(map.Tags)
    ? map.Tags.map(tag => tag.Name).filter(Boolean).join(", ")
    : "";
  const authors = Array.isArray(map.Authors)
    ? map.Authors.map(author => author.User?.Name).filter(Boolean).join(", ")
    : "";

  return {
    name: override.name || formatName(map.Name),
    images: override.images || imageUrls(map),
    tm: `https://trackmania.exchange/mapshow/${map.MapId}`,
    awardCount: map.AwardCount || 0,
    yt: override.yt || "",
    info: [
      `Tag: ${tags}`,
      `Author: ${authors}`,
      `Author time: ${formatAuthorTime(map.Medals?.Author)}`,
      `Uploaded: ${formatDate(map.UploadedAt)}`
    ]
  };
}

function mergeExistingMap(seedMap, tmxMap) {
  const nextMap = {
    ...seedMap,
    awardCount: tmxMap?.AwardCount ?? seedMap.awardCount ?? 0
  };
  const override = MAP_OVERRIDES[getMapId(seedMap)] || {};

  return {
    ...nextMap,
    ...override,
    info: override.info || nextMap.info,
    images: override.images || nextMap.images
  };
}

async function fetchTmxMaps() {
  const maps = [];
  let after = null;
  let pageCount = 0;

  while (true) {
    const params = new URLSearchParams({
      author: TMX_AUTHOR,
      fields: FIELDS.join(",")
    });
    if (after !== null) params.set("after", String(after));

    const response = await fetch(`${TMX_API_URL}?${params}`);
    if (!response.ok) {
      throw new Error(`TMX API returned ${response.status} after ${after ?? "first page"}`);
    }

    const data = await response.json();
    const results = data.Results || [];
    if (results.length === 0) break;

    maps.push(...results);
    if (!data.More) break;

    const nextAfter = results[results.length - 1].MapId;
    if (nextAfter === after) {
      throw new Error(`TMX pagination did not advance after map ${after}`);
    }

    after = nextAfter;
    pageCount += 1;
    if (pageCount > 25) {
      throw new Error("TMX pagination exceeded 25 pages");
    }
  }

  return maps;
}

async function fetchMapsById(ids) {
  if (ids.length === 0) return [];

  const params = new URLSearchParams({
    fields: FIELDS.join(","),
    id: ids.join(",")
  });

  const response = await fetch(`${TMX_API_URL}?${params}`);
  if (!response.ok) {
    throw new Error(`TMX API returned ${response.status} for curated ids`);
  }

  const data = await response.json();
  return data.Results || [];
}

async function fetchUserStats() {
  const params = new URLSearchParams({
    fields: "UserId,Name,AwardsReceivedCount,MapCount",
    id: String(TMX_USER_ID)
  });

  const response = await fetch(`${TMX_USERS_API_URL}?${params}`);
  if (!response.ok) {
    throw new Error(`TMX API returned ${response.status} for user stats`);
  }

  const data = await response.json();
  const user = data.Results?.[0];
  if (!user) {
    throw new Error(`TMX user ${TMX_USER_ID} was not found`);
  }

  return {
    tmxUserId: user.UserId,
    tmxName: user.Name,
    awardsReceivedCount: user.AwardsReceivedCount,
    mapCount: user.MapCount
  };
}

function serializeMaps(maps) {
  const json = JSON.stringify(maps, null, 2)
    .replace(/"([^"]+)":/g, "$1:")
    .replace(/\\\\/g, "\\");
  return `const maps = ${json};\n`;
}

function serializeSiteStats(stats) {
  const json = JSON.stringify(stats, null, 2)
    .replace(/"([^"]+)":/g, "$1:");
  return `const siteStats = ${json};\n`;
}

async function main() {
  const seedMaps = readSeedMaps();
  const seedById = new Map(seedMaps.map(map => [getMapId(map), map]));
  const newestSeedTimestamp = Math.max(...seedMaps.map(getPortfolioTimestamp));
  const fetchedMaps = await fetchTmxMaps();
  const missingCuratedIds = [...CURATED_MAP_IDS].filter(id => !fetchedMaps.some(map => map.MapId === id));
  const curatedMaps = await fetchMapsById(missingCuratedIds);
  const tmxMaps = [...fetchedMaps, ...curatedMaps];
  const tmxById = new Map(tmxMaps.map(map => [map.MapId, map]));

  const mergedMaps = seedMaps
    .map(map => mergeExistingMap(map, tmxById.get(getMapId(map))));

  const newMaps = tmxMaps
    .filter(map => !seedById.has(map.MapId))
    .filter(map => !EXCLUDED_MAP_IDS.has(map.MapId))
    .filter(map => CURATED_MAP_IDS.has(map.MapId) || Date.parse(map.UploadedAt) > newestSeedTimestamp)
    .map(fromTmxMap);

  const allMaps = [...mergedMaps, ...newMaps].sort((a, b) => {
    const idA = getMapId(a);
    const idB = getMapId(b);
    const orderA = MAP_OVERRIDES[idA]?.order;
    const orderB = MAP_OVERRIDES[idB]?.order;

    if (orderA !== undefined || orderB !== undefined) {
      return (orderA ?? Number.MAX_SAFE_INTEGER) - (orderB ?? Number.MAX_SAFE_INTEGER);
    }

    return getPortfolioTimestamp(b) - getPortfolioTimestamp(a);
  });

  fs.writeFileSync(MAPS_FILE, serializeMaps(allMaps));

  const siteStats = await fetchUserStats();
  fs.writeFileSync(SITE_STATS_FILE, serializeSiteStats(siteStats));

  console.log(`Updated maps.js with ${allMaps.length} maps (${newMaps.length} new).`);
  console.log(`Updated siteStats.js with ${siteStats.awardsReceivedCount} received awards.`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
