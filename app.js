let map;
let markers   = {};
let polylines = [];
let adjList   = {};
let animTimer = null;

const COLOR = {
  edge_default:  "#BDBDBD",
  edge_visited:  "#FF9800",
  edge_path:     "#E53935",
  node_default:  "#1565C0",
  node_origin:   "#2E7D32",
  node_dest:     "#6A1B9A",
  node_visited:  "#FF9800",
  node_path:     "#E53935",
};

const SPEED = { 1: 1200, 2: 600, 3: 200 };

// Inicializa la instancia de Google Maps 
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center:    { lat: -9.5, lng: -75.0 },
    zoom:      6,
    mapTypeId: "roadmap",
    styles: [
      { featureType: "poi",    elementType: "labels", stylers: [{ visibility: "off" }] },
      { featureType: "transit",elementType: "labels", stylers: [{ visibility: "off" }] },
    ],
  });

  buildGraph();
  drawEdges();
  drawMarkers();
  setupUI();
}

// Construye la lista de adyacencia 
function buildGraph() {
  GRAPH_DATA.nodes.forEach(node => {
    adjList[node.id] = [];
  });

  GRAPH_DATA.edges.forEach(edge => {
    adjList[edge.from].push({ to: edge.to,   km: edge.km });
    adjList[edge.to].push(  { to: edge.from, km: edge.km });
  });
}

// Dibuja las líneas iniciales (aristas)
function drawEdges() {
  const coords = {};
  GRAPH_DATA.nodes.forEach(n => { coords[n.id] = { lat: n.lat, lng: n.lng }; });

  GRAPH_DATA.edges.forEach(edge => {
    const line = new google.maps.Polyline({
      path: [ coords[edge.from], coords[edge.to] ],
      geodesic:     true,
      strokeColor:  COLOR.edge_default,
      strokeOpacity: 0.6,
      strokeWeight:  2,
      map:           map,
    });

    line._from = edge.from;
    line._to   = edge.to;
    polylines.push(line);
  });
}

// Crea los marcadores visuales para cada ciudad en el mapa
function drawMarkers() {
  GRAPH_DATA.nodes.forEach(node => {
    const marker = new google.maps.Marker({
      position: { lat: node.lat, lng: node.lng },
      map:       map,
      title:     node.name,
      icon:      makeIcon(COLOR.node_default),
      label: {
        text:      node.name,
        color:     "#111111",
        fontSize:  "11px",
        fontWeight:"bold",
      },
    });

    markers[node.id] = marker;
  });
}

function makeIcon(color) {
  return {
    path:        google.maps.SymbolPath.CIRCLE,
    scale:       10,
    fillColor:   color,
    fillOpacity: 1,
    strokeColor: "#ffffff",
    strokeWeight: 2,
  };
}

// cálculo de la ruta más corta utilizando el algoritmo de Dijkstra
function dijkstra(originId, destId) {
  const nodes     = GRAPH_DATA.nodes.map(n => n.id);
  const dist      = {};
  const prev      = {};
  const visited   = new Set();
  const steps     = [];

  nodes.forEach(id => { dist[id] = Infinity; prev[id] = null; });
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
    return { steps, path: [], distances: dist };
  }

  steps.push({ type: "path", path });

  return { steps, path, distances: dist };
}





function animate(steps, speedMs) {
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
      addLog(`  → ${getName(step.to)}: ${step.km} km`);
    }

    else if (step.type === "path") {
      drawFinalPath(step.path);
      return;
    }

    animTimer = setTimeout(next, speedMs);
  }

  next();
}

function drawFinalPath(path) {
  path.forEach((nodeId, idx) => {
    let color = COLOR.node_path;
    if (idx === 0)            color = COLOR.node_origin;
    if (idx === path.length-1) color = COLOR.node_dest;
    markers[nodeId].setIcon(makeIcon(color));
  });

  for (let i = 0; i < path.length - 1; i++) {
    colorEdge(path[i], path[i+1], COLOR.edge_path, 5);
  }

  const totalKm = calcTotalKm(path);
  const names   = path.map(getName).join(" → ");

  document.getElementById("result-km").textContent   = totalKm + " km";
  document.getElementById("result-path").textContent = names;
  document.getElementById("result-box").classList.remove("hidden");

  addLog(` Ruta encontrada: ${totalKm} km`);
}

function colorEdge(fromId, toId, color, weight) {
  polylines.forEach(line => {
    if (
      (line._from === fromId && line._to === toId) ||
      (line._from === toId   && line._to === fromId)
    ) {
      line.setOptions({ strokeColor: color, strokeWeight: weight, strokeOpacity: 1 });
    }
  });
}

function resetAll() {
  if (animTimer) { clearTimeout(animTimer); animTimer = null; }

  GRAPH_DATA.nodes.forEach(n => {
    markers[n.id].setIcon(makeIcon(COLOR.node_default));
  });

  polylines.forEach(line => {
    line.setOptions({
      strokeColor:   COLOR.edge_default,
      strokeOpacity: 0.6,
      strokeWeight:  2,
    });
  });

  document.getElementById("result-box").classList.add("hidden");
  document.getElementById("log-list").innerHTML =
    '<li class="log-hint">Selecciona origen y destino para comenzar.</li>';

  document.getElementById("select-origin").value = "";
  document.getElementById("select-dest").value   = "";
}

function setupUI() {
  const selectOrigin = document.getElementById("select-origin");
  const selectDest   = document.getElementById("select-dest");
  const btnRun       = document.getElementById("btn-run");
  const btnReset     = document.getElementById("btn-reset");
  const speedSlider  = document.getElementById("speed-slider");
  const speedLabel   = document.getElementById("speed-label");

  const labels = { 1: "Lenta", 2: "Normal", 3: "Rápida" };
  GRAPH_DATA.nodes
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name))
    .forEach(node => {
      const opt1 = new Option(node.name, node.id);
      const opt2 = new Option(node.name, node.id);
      selectOrigin.appendChild(opt1);
      selectDest.appendChild(opt2);
    });

  speedSlider.addEventListener("input", () => {
    speedLabel.textContent = labels[speedSlider.value];
  });

  btnRun.addEventListener("click", () => {
    const originId = selectOrigin.value;
    const destId   = selectDest.value;

    if (!originId || !destId) {
      alert("Por favor selecciona ciudad de origen y destino.");
      return;
    }
    if (originId === destId) {
      alert("El origen y destino deben ser ciudades diferentes.");
      return;
    }

    if (animTimer) clearTimeout(animTimer);
    GRAPH_DATA.nodes.forEach(n => {
      markers[n.id].setIcon(makeIcon(COLOR.node_default));
    });
    polylines.forEach(line => {
      line.setOptions({ strokeColor: COLOR.edge_default, strokeOpacity: 0.6, strokeWeight: 2 });
    });
    document.getElementById("result-box").classList.add("hidden");
    document.getElementById("log-list").innerHTML = "";

    markers[originId].setIcon(makeIcon(COLOR.node_origin));
    markers[destId].setIcon(makeIcon(COLOR.node_dest));

    const speedMs = SPEED[speedSlider.value];
    const { steps, path } = dijkstra(originId, destId);

    if (path.length === 0) {
      addLog("No existe ruta entre estas ciudades.");
      return;
    }

    animate(steps, speedMs);
  });

  btnReset.addEventListener("click", resetAll);
}

function getName(id) {
  const node = GRAPH_DATA.nodes.find(n => n.id === id);
  return node ? node.name : id;
}

function calcTotalKm(path) {
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const edge = GRAPH_DATA.edges.find(e =>
      (e.from === path[i] && e.to === path[i+1]) ||
      (e.from === path[i+1] && e.to === path[i])
    );
    if (edge) total += edge.km;
  }
  return total;
}

function addLog(msg) {
  const list = document.getElementById("log-list");
  const li   = document.createElement("li");
  li.innerHTML = msg;
  list.appendChild(li);
  list.scrollTop = list.scrollHeight;
}