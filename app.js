// Approximate lat/lon for each available server location.
const SERVERS = [
  { id: "montreal", name: "Montreal", lat: 45.5017, lon: -73.5673 },
  { id: "dallas", name: "Dallas", lat: 32.7767, lon: -96.797 },
  { id: "chicago", name: "Chicago", lat: 41.8781, lon: -87.6298 },
  { id: "portland", name: "Portland", lat: 45.5152, lon: -122.6784 },
  { id: "los_angeles", name: "Los Angeles", lat: 34.0522, lon: -118.2437 },
  { id: "ashburn", name: "Ashburn", lat: 39.0438, lon: -77.4874 },
  { id: "miami", name: "Miami", lat: 25.7617, lon: -80.1918 },
  { id: "sao_paulo", name: "Sao Paulo", lat: -23.5505, lon: -46.6333 },
  { id: "frankfurt", name: "Frankfurt", lat: 50.1109, lon: 8.6821 },
  { id: "paris", name: "Paris", lat: 48.8566, lon: 2.3522 },
  { id: "london", name: "London", lat: 51.5074, lon: -0.1278 },
  { id: "warsaw", name: "Warsaw", lat: 52.2297, lon: 21.0122 },
  { id: "madrid", name: "Madrid", lat: 40.4168, lon: -3.7038 },
  { id: "stockholm", name: "Stockholm", lat: 59.3293, lon: 18.0686 },
  { id: "mumbai", name: "Mumbai", lat: 19.076, lon: 72.8777 },
  { id: "singapore", name: "Singapore", lat: 1.3521, lon: 103.8198 },
  { id: "tokyo", name: "Tokyo", lat: 35.6762, lon: 139.6503 },
  { id: "sydney", name: "Sydney", lat: -33.8688, lon: 151.2093 },
];

const EARTH_RADIUS_KM = 6371;

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

function haversineKm(a, b) {
  const dLat = toRadians(b.lat - a.lat);
  const dLon = toRadians(b.lon - a.lon);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

function estimatePingMs(km) {
  return Math.round(km / 100 + 20);
}

const state = {
  count: 2,
};

const playerInputsEl = document.getElementById("playerInputs");
const findBtn = document.getElementById("findBtn");
const resultsSection = document.getElementById("resultsSection");
const bestPickEl = document.getElementById("bestPick");
const resultsListEl = document.getElementById("resultsList");

const MAX_POSSIBLE_KM = Math.PI * EARTH_RADIUS_KM; // antipodal distance, used to scale bar widths

function buildOptionsHtml(selectedIndex) {
  return SERVERS.map(
    (s, i) =>
      `<option value="${s.id}" ${i === selectedIndex ? "selected" : ""}>${s.name}</option>`,
  ).join("");
}

function renderPlayerInputs() {
  playerInputsEl.innerHTML = "";
  for (let i = 0; i < state.count; i++) {
    const defaultIndex = i % SERVERS.length;
    const group = document.createElement("div");
    group.className = "player-input-group";
    group.innerHTML = `
      <label for="player-${i}">Player ${i + 1} location</label>
      <select id="player-${i}">${buildOptionsHtml(defaultIndex)}</select>
    `;
    playerInputsEl.appendChild(group);
  }
  resultsSection.hidden = true;
}

document.querySelectorAll(".count-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document
      .querySelectorAll(".count-btn")
      .forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    state.count = Number(btn.dataset.count);
    renderPlayerInputs();
  });
});

function getSelectedPlayers() {
  const selects = playerInputsEl.querySelectorAll("select");
  return Array.from(selects).map((sel) =>
    SERVERS.find((s) => s.id === sel.value),
  );
}

function rankServers(players) {
  return SERVERS.map((candidate) => {
    const distances = players.map((p) => haversineKm(candidate, p));
    const maxDist = Math.max(...distances);
    const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
    return { candidate, distances, maxDist, avgDist };
  }).sort((a, b) => a.maxDist - b.maxDist || a.avgDist - b.avgDist);
}

function renderResults(players, ranked) {
  resultsListEl.innerHTML = ranked
    .map((row, i) => {
      const isBest = i === 0;
      const playerChips = row.distances
        .map((km, playerIndex) => {
          const barPct = Math.min(100, (km / MAX_POSSIBLE_KM) * 100);
          return `
            <div class="player-chip">
              <div class="player-chip-labels">
                <span>Player ${playerIndex + 1} &middot; ${players[playerIndex].name}</span>
                <span class="player-chip-value">${Math.round(km)} km (~${estimatePingMs(km)}ms)</span>
              </div>
              <div class="player-chip-bar">
                <div class="player-chip-bar-fill" style="width: ${barPct}%"></div>
              </div>
            </div>`;
        })
        .join("");

      return `
        <div class="result-card ${isBest ? "is-best" : ""}">
          <div class="result-top">
            <span class="result-rank">#${i + 1}</span>
            <span class="result-name">${row.candidate.name}</span>
            <div class="result-badges">
              <span class="result-badge">Worst-case: ${Math.round(row.maxDist)} km (~${estimatePingMs(row.maxDist)}ms)</span>
              <span class="result-badge">Avg: ${Math.round(row.avgDist)} km (~${estimatePingMs(row.avgDist)}ms)</span>
            </div>
          </div>
          <div class="result-players">${playerChips}</div>
        </div>`;
    })
    .join("");

  const best = ranked[0];
  bestPickEl.innerHTML = `Best choice: <strong>${best.candidate.name}</strong> &mdash; worst-case ~${estimatePingMs(best.maxDist)}ms for any player`;

  resultsSection.hidden = false;
}

findBtn.addEventListener("click", () => {
  const players = getSelectedPlayers();
  const ranked = rankServers(players);
  renderResults(players, ranked);
});

renderPlayerInputs();
