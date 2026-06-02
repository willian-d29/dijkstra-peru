let map;
let markers   = {};
let polylines = [];
let adjList   = {};
let animTimer = null;
let activeMode = "dijkstra";

const COLOR = {
  edge_default:  "#CBD5E1",
  edge_visited:  "#F59E0B",
  edge_path:     "#EF4444",
  node_default:  "#2563EB",
  node_origin:   "#059669",
  node_dest:     "#7C3AED",
  node_visited:  "#F59E0B",
  node_path:     "#EF4444",
};

const SPEED = { 1: 1200, 2: 600, 3: 200 };

function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center:    { lat: -9.5, lng: -75.0 },
    zoom:      6,
    mapTypeId: "roadmap",
    styles: [
      { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#F8FAFC" }] },
      { featureType: "water", elementType: "geometry", stylers: [{ color: "#DBEAFE" }] },
    ],
  });

  buildGraph();
  drawEdges();
  drawMarkers();
  setupUI();
}

function buildGraph() {
  adjList = {};
  GRAPH_DATA.nodes.forEach(node => {
    adjList[node.id] = [];
  });

  GRAPH_DATA.edges.forEach(edge => {
    adjList[edge.from].push({ to: edge.to, km: edge.km });
    adjList[edge.to].push({ to: edge.from, km: edge.km });
  });
}

function drawEdges() {
  const coords = {};
  GRAPH_DATA.nodes.forEach(n => {
    coords[n.id] = { lat: n.lat, lng: n.lng };
  });

  GRAPH_DATA.edges.forEach(edge => {
    const line = new google.maps.Polyline({
      path: [coords[edge.from], coords[edge.to]],
      geodesic:      true,
      strokeColor:   COLOR.edge_default,
      strokeOpacity: 0.72,
      strokeWeight:  2,
      map:           map,
    });

    line._from = edge.from;
    line._to   = edge.to;
    polylines.push(line);
  });
}

function drawMarkers() {
  GRAPH_DATA.nodes.forEach(node => {
    const marker = new google.maps.Marker({
      position: { lat: node.lat, lng: node.lng },
      map:      map,
      title:    node.name,
      icon:     makeIcon(COLOR.node_default),
      label: {
        text:       node.name,
        color:      "#111827",
        fontSize:   "11px",
        fontWeight: "700",
      },
    });

    markers[node.id] = marker;
  });
}

function makeIcon(color) {
  return {
    path:         google.maps.SymbolPath.CIRCLE,
    scale:        10,
    fillColor:    color,
    fillOpacity:  1,
    strokeColor:  "#ffffff",
    strokeWeight: 2,
  };
}

function dijkstra(originId, destId) {
  const nodes   = GRAPH_DATA.nodes.map(n => n.id);
  const dist    = {};
  const prev    = {};
  const visited = new Set();
  const steps   = [];

  nodes.forEach(id => {
    dist[id] = Infinity;
    prev[id] = null;
  });
  dist[originId] = 0;

  const queue = [{ id: originId, d: 0 }];

  while (queue.length > 0) {
    queue.sort((a, b) => a.d - b.d);
    const { id: current } = queue.shift();

    if (visited.has(current)) continue;
    visited.add(current);

    steps.push({ type: "visit", node: current });

    if (current === destId) break;

    adjList[current].forEach(neighbor => {
      if (visited.has(neighbor.to)) return;

      const newDist = dist[current] + neighbor.km;

      if (newDist < dist[neighbor.to]) {
        dist[neighbor.to] = newDist;
        prev[neighbor.to] = current;
        queue.push({ id: neighbor.to, d: newDist });

        steps.push({
          type: "relax",
          from: current,
          to:   neighbor.to,
          km:   newDist,
        });
      }
    });
  }

  const path = [];
  let node = destId;
  while (node !== null) {
    path.unshift(node);
    node = prev[node];
  }

  if (path[0] !== originId) {
    return { steps, path: [], distances: dist, totalKm: Infinity };
  }

  steps.push({ type: "path", path });
  return { steps, path, distances: dist, totalKm: dist[destId] };
}

function animateDijkstra(steps, speedMs) {
  let i = 0;

  function next() {
    if (i >= steps.length) return;

    const step = steps[i++];

    if (step.type === "visit") {
      if (markers[step.node]) {
        markers[step.node].setIcon(makeIcon(COLOR.node_visited));
      }
      addLog(`Procesando: <strong>${getName(step.node)}</strong>`);
    }

    else if (step.type === "relax") {
      colorEdge(step.from, step.to, COLOR.edge_visited, 3);
      addLog(`Mejorando ${getName(step.to)}: <strong>${formatKm(step.km)}</strong>`);
    }

    else if (step.type === "path") {
      drawFinalPath(step.path, {
        modeLabel: "Dijkstra",
        meta: `${step.path.length} ciudades conectadas`,
      });
      return;
    }

    animTimer = setTimeout(next, speedMs);
  }

  next();
}

function animateTsp(result, speedMs) {
  let i = 0;
  const logs = result.generationLogs;

  function next() {
    if (i >= logs.length) {
      drawFinalPath(result.fullPath, {
        displayPath: result.order,
        totalKm: result.km,
        modeLabel: "Agente viajero",
        meta: `${result.order.length} paradas · ${result.options.generations} generaciones · población ${result.options.populationSize}`,
      });
      addLog(`Recorrido optimizado: <strong>${formatKm(result.km)}</strong>`);
      return;
    }

    const log = logs[i++];
    addLog(`Generación ${log.generation}: mejor distancia <strong>${formatKm(log.bestKm)}</strong>`);
    animTimer = setTimeout(next, Math.max(120, speedMs * 0.45));
  }

  next();
}

function drawFinalPath(path, options = {}) {
  const displayPath = options.displayPath || path;
  const totalKm = Number.isFinite(options.totalKm) ? options.totalKm : calcTotalKm(path);

  path.forEach((nodeId, idx) => {
    let color = COLOR.node_path;
    if (nodeId === path[0]) color = COLOR.node_origin;
    else if (idx === path.length - 1) color = COLOR.node_dest;
    if (markers[nodeId]) markers[nodeId].setIcon(makeIcon(color));
  });

  for (let i = 0; i < path.length - 1; i++) {
    colorEdge(path[i], path[i + 1], COLOR.edge_path, 5);
  }

  document.getElementById("result-mode").textContent = options.modeLabel || "Resultado";
  document.getElementById("result-km").textContent = formatKm(totalKm);
  document.getElementById("result-path").textContent = displayPath.map(getName).join(" → ");
  document.getElementById("result-meta").textContent = options.meta || "";
  document.getElementById("result-box").classList.remove("hidden");

  addLog(`Ruta encontrada: <strong>${formatKm(totalKm)}</strong>`);
}

function colorEdge(fromId, toId, color, weight) {
  polylines.forEach(line => {
    if (
      (line._from === fromId && line._to === toId) ||
      (line._from === toId && line._to === fromId)
    ) {
      line.setOptions({ strokeColor: color, strokeWeight: weight, strokeOpacity: 1 });
    }
  });
}

function clearVisualization(resetLog = true) {
  if (animTimer) {
    clearTimeout(animTimer);
    animTimer = null;
  }

  GRAPH_DATA.nodes.forEach(n => {
    markers[n.id].setIcon(makeIcon(COLOR.node_default));
  });

  polylines.forEach(line => {
    line.setOptions({
      strokeColor:   COLOR.edge_default,
      strokeOpacity: 0.72,
      strokeWeight:  2,
    });
  });

  document.getElementById("result-box").classList.add("hidden");
  document.getElementById("result-mode").textContent = "Resultado";
  document.getElementById("result-km").textContent = "— km";
  document.getElementById("result-path").textContent = "—";
  document.getElementById("result-meta").textContent = "";

  if (resetLog) setLogHint();
}

function resetAll() {
  clearVisualization(true);

  document.getElementById("select-origin").value = "";
  document.getElementById("select-dest").value = "";
  document.getElementById("select-tsp-origin").value = "";
  document.getElementById("tsp-return-origin").checked = true;

  document.querySelectorAll("#tsp-city-list input[type='checkbox']").forEach(input => {
    input.checked = false;
    input.disabled = false;
    input.closest(".city-option").classList.remove("disabled");
  });

  updateTspSelectedCount();
}

function setupUI() {
  populateCityControls();
  setupModeSwitch();
  setupTspControls();

  const btnRun = document.getElementById("btn-run");
  const btnReset = document.getElementById("btn-reset");
  const speedSlider = document.getElementById("speed-slider");
  const speedLabel = document.getElementById("speed-label");
  const labels = { 1: "Lenta", 2: "Normal", 3: "Rápida" };

  speedSlider.addEventListener("input", () => {
    speedLabel.textContent = labels[speedSlider.value];
  });

  btnRun.addEventListener("click", () => {
    if (activeMode === "dijkstra") runDijkstraMode();
    else runTspMode();
  });

  btnReset.addEventListener("click", resetAll);
  setMode("dijkstra");
}

function populateCityControls() {
  const selects = [
    document.getElementById("select-origin"),
    document.getElementById("select-dest"),
    document.getElementById("select-tsp-origin"),
  ];

  const sortedNodes = GRAPH_DATA.nodes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  selects.forEach(select => {
    sortedNodes.forEach(node => {
      select.appendChild(new Option(node.name, node.id));
    });
  });

  const cityList = document.getElementById("tsp-city-list");
  sortedNodes.forEach(node => {
    const label = document.createElement("label");
    label.className = "city-option";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.value = node.id;

    const name = document.createElement("span");
    name.textContent = node.name;

    label.appendChild(checkbox);
    label.appendChild(name);
    cityList.appendChild(label);
  });
}

function setupModeSwitch() {
  document.querySelectorAll(".mode-btn").forEach(button => {
    button.addEventListener("click", () => {
      setMode(button.dataset.mode);
    });
  });
}

function setMode(mode) {
  activeMode = mode;

  document.querySelectorAll(".mode-btn").forEach(button => {
    button.classList.toggle("active", button.dataset.mode === mode);
  });

  document.getElementById("dijkstra-controls").classList.toggle("hidden", mode !== "dijkstra");
  document.getElementById("tsp-controls").classList.toggle("hidden", mode !== "tsp");
  document.getElementById("btn-run").textContent = mode === "dijkstra" ? "Calcular ruta" : "Optimizar recorrido";

  clearVisualization(true);
}

function setupTspControls() {
  const tspOrigin = document.getElementById("select-tsp-origin");
  const cityList = document.getElementById("tsp-city-list");
  const btnAll = document.getElementById("btn-tsp-all");
  const btnClear = document.getElementById("btn-tsp-clear");

  tspOrigin.addEventListener("change", syncTspOriginAvailability);
  cityList.addEventListener("change", updateTspSelectedCount);

  btnAll.addEventListener("click", () => {
    cityList.querySelectorAll("input[type='checkbox']").forEach(input => {
      if (!input.disabled) input.checked = true;
    });
    updateTspSelectedCount();
  });

  btnClear.addEventListener("click", () => {
    cityList.querySelectorAll("input[type='checkbox']").forEach(input => {
      input.checked = false;
    });
    updateTspSelectedCount();
  });
}

function syncTspOriginAvailability() {
  const originId = document.getElementById("select-tsp-origin").value;

  document.querySelectorAll("#tsp-city-list input[type='checkbox']").forEach(input => {
    const isOrigin = input.value === originId;
    input.disabled = isOrigin;
    if (isOrigin) input.checked = false;
    input.closest(".city-option").classList.toggle("disabled", isOrigin);
  });

  updateTspSelectedCount();
}

function updateTspSelectedCount() {
  const count = getSelectedTspCities().length;
  document.getElementById("tsp-selected-count").textContent =
    count === 1 ? "1 ciudad" : `${count} ciudades`;
}

function runDijkstraMode() {
  const originId = document.getElementById("select-origin").value;
  const destId = document.getElementById("select-dest").value;

  if (!originId || !destId) {
    alert("Por favor selecciona ciudad de origen y destino.");
    return;
  }
  if (originId === destId) {
    alert("El origen y destino deben ser ciudades diferentes.");
    return;
  }

  clearVisualization(false);
  document.getElementById("log-list").innerHTML = "";

  markers[originId].setIcon(makeIcon(COLOR.node_origin));
  markers[destId].setIcon(makeIcon(COLOR.node_dest));

  const speedMs = SPEED[document.getElementById("speed-slider").value];
  const { steps, path } = dijkstra(originId, destId);

  if (path.length === 0) {
    addLog("No existe ruta entre estas ciudades.");
    return;
  }

  animateDijkstra(steps, speedMs);
}

function runTspMode() {
  const originId = document.getElementById("select-tsp-origin").value;
  const visitIds = getSelectedTspCities();

  if (!originId) {
    alert("Selecciona la ciudad inicial.");
    return;
  }
  if (visitIds.length < 2) {
    alert("Selecciona al menos dos ciudades a visitar.");
    return;
  }

  clearVisualization(false);
  document.getElementById("log-list").innerHTML = "";
  markers[originId].setIcon(makeIcon(COLOR.node_origin));

  try {
    const distanceData = buildTspDistanceData(originId, visitIds);
    const options = getGeneticOptions();
    const result = runGeneticTSP(originId, visitIds, distanceData, options);

    addLog(`Calculando ${visitIds.length} ciudades con algoritmo genético.`);
    animateTsp(result, SPEED[document.getElementById("speed-slider").value]);
  }
  catch (error) {
    addLog(error.message);
  }
}

function getSelectedTspCities() {
  return Array.from(document.querySelectorAll("#tsp-city-list input[type='checkbox']:checked"))
    .filter(input => !input.disabled)
    .map(input => input.value);
}

function getGeneticOptions() {
  return {
    populationSize: clampInteger(document.getElementById("ga-population").value, 20, 500, 80),
    generations: clampInteger(document.getElementById("ga-generations").value, 20, 1200, 180),
    mutationRate: clampInteger(document.getElementById("ga-mutation").value, 1, 80, 8) / 100,
    returnToOrigin: document.getElementById("tsp-return-origin").checked,
  };
}

function buildTspDistanceData(originId, visitIds) {
  const ids = [originId, ...visitIds];
  const matrix = {};
  const paths = {};

  ids.forEach(id => {
    matrix[id] = {};
    matrix[id][id] = 0;
  });

  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      const from = ids[i];
      const to = ids[j];
      const result = dijkstra(from, to);

      if (result.path.length === 0 || !Number.isFinite(result.totalKm)) {
        throw new Error(`No existe ruta entre ${getName(from)} y ${getName(to)}.`);
      }

      matrix[from][to] = result.totalKm;
      matrix[to][from] = result.totalKm;
      paths[routeKey(from, to)] = result.path;
      paths[routeKey(to, from)] = result.path.slice().reverse();
    }
  }

  return { matrix, paths };
}

function runGeneticTSP(originId, visitIds, distanceData, options) {
  let population = createInitialPopulation(originId, visitIds, distanceData.matrix, options.populationSize);
  let bestRoute = population[0].slice();
  let bestKm = calcTspDistance(originId, bestRoute, distanceData.matrix, options.returnToOrigin);
  const generationLogs = [];
  const sampleEvery = Math.max(1, Math.floor(options.generations / 9));

  for (let generation = 1; generation <= options.generations; generation++) {
    const scored = population
      .map(route => ({
        route,
        km: calcTspDistance(originId, route, distanceData.matrix, options.returnToOrigin),
      }))
      .sort((a, b) => a.km - b.km);

    if (scored[0].km < bestKm) {
      bestKm = scored[0].km;
      bestRoute = scored[0].route.slice();
    }

    if (generation === 1 || generation === options.generations || generation % sampleEvery === 0) {
      generationLogs.push({
        generation,
        bestKm,
        route: bestRoute.slice(),
      });
    }

    const nextPopulation = [
      scored[0].route.slice(),
      scored[1] ? scored[1].route.slice() : scored[0].route.slice(),
    ];

    while (nextPopulation.length < options.populationSize) {
      const parentA = selectParent(scored).route;
      const parentB = selectParent(scored).route;
      const child = orderCrossover(parentA, parentB);
      mutateRoute(child, options.mutationRate);
      nextPopulation.push(child);
    }

    population = nextPopulation;
  }

  const order = options.returnToOrigin
    ? [originId, ...bestRoute, originId]
    : [originId, ...bestRoute];

  return {
    order,
    fullPath: composeFullPath(order, distanceData.paths),
    km: bestKm,
    generationLogs,
    options,
  };
}

function createInitialPopulation(originId, visitIds, matrix, populationSize) {
  const population = [
    visitIds.slice(),
    nearestNeighborRoute(originId, visitIds, matrix),
  ];

  while (population.length < populationSize) {
    population.push(shuffleArray(visitIds));
  }

  return population;
}

function nearestNeighborRoute(originId, visitIds, matrix) {
  const remaining = new Set(visitIds);
  const route = [];
  let current = originId;

  while (remaining.size > 0) {
    let bestCity = null;
    let bestKm = Infinity;

    remaining.forEach(cityId => {
      const km = matrix[current][cityId];
      if (km < bestKm) {
        bestKm = km;
        bestCity = cityId;
      }
    });

    if (!bestCity) bestCity = remaining.values().next().value;
    route.push(bestCity);
    remaining.delete(bestCity);
    current = bestCity;
  }

  return route;
}

function calcTspDistance(originId, route, matrix, returnToOrigin) {
  let total = 0;
  let current = originId;

  route.forEach(cityId => {
    total += matrix[current][cityId];
    current = cityId;
  });

  if (returnToOrigin && route.length > 0) {
    total += matrix[current][originId];
  }

  return total;
}

function selectParent(scored) {
  const tournamentSize = Math.min(4, scored.length);
  let best = scored[Math.floor(Math.random() * scored.length)];

  for (let i = 1; i < tournamentSize; i++) {
    const contender = scored[Math.floor(Math.random() * scored.length)];
    if (contender.km < best.km) best = contender;
  }

  return best;
}

function orderCrossover(parentA, parentB) {
  const size = parentA.length;
  if (size < 2) return parentA.slice();

  let start = Math.floor(Math.random() * size);
  let end = Math.floor(Math.random() * size);
  if (start > end) [start, end] = [end, start];

  const child = Array(size).fill(null);
  const used = new Set();

  for (let i = start; i <= end; i++) {
    child[i] = parentA[i];
    used.add(parentA[i]);
  }

  let cursor = (end + 1) % size;
  for (let offset = 0; offset < size; offset++) {
    const gene = parentB[(end + 1 + offset) % size];
    if (!used.has(gene)) {
      child[cursor] = gene;
      used.add(gene);
      cursor = (cursor + 1) % size;
    }
  }

  return child;
}

function mutateRoute(route, mutationRate) {
  if (route.length < 2 || Math.random() >= mutationRate) return;

  const a = Math.floor(Math.random() * route.length);
  let b = Math.floor(Math.random() * route.length);
  while (a === b) b = Math.floor(Math.random() * route.length);

  [route[a], route[b]] = [route[b], route[a]];
}

function composeFullPath(order, pairPaths) {
  const fullPath = [];

  for (let i = 0; i < order.length - 1; i++) {
    const segment = pairPaths[routeKey(order[i], order[i + 1])];
    if (!segment) continue;

    if (fullPath.length === 0) fullPath.push(...segment);
    else fullPath.push(...segment.slice(1));
  }

  return fullPath;
}

function shuffleArray(values) {
  const copy = values.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function routeKey(fromId, toId) {
  return `${fromId}|${toId}`;
}

function setLogHint() {
  const hint = activeMode === "dijkstra"
    ? "Selecciona origen y destino para comenzar."
    : "Selecciona una ciudad inicial y las paradas del recorrido.";

  document.getElementById("log-list").innerHTML = `<li class="log-hint">${hint}</li>`;
}

function getName(id) {
  const node = GRAPH_DATA.nodes.find(n => n.id === id);
  return node ? node.name : id;
}

function calcTotalKm(path) {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const edge = GRAPH_DATA.edges.find(e =>
      (e.from === path[i] && e.to === path[i + 1]) ||
      (e.from === path[i + 1] && e.to === path[i])
    );
    if (edge) total += edge.km;
  }
  return total;
}

function clampInteger(value, min, max, fallback) {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function formatKm(km) {
  if (!Number.isFinite(km)) return "— km";
  return `${Math.round(km).toLocaleString("es-PE")} km`;
}

function addLog(msg) {
  const list = document.getElementById("log-list");
  const li = document.createElement("li");
  li.innerHTML = msg;
  list.appendChild(li);
  list.scrollTop = list.scrollHeight;
}
