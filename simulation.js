const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const els = {
    roundValue: document.getElementById("roundValue"),
    metricNodes: document.getElementById("metricNodes"),
    metricBeeps: document.getElementById("metricBeeps"),
    metricHeard: document.getElementById("metricHeard"),
    metricDone: document.getElementById("metricDone"),
    nodeCount: document.getElementById("nodeCount"),
    identityMode: document.getElementById("identityMode"),
    model: document.getElementById("model"),
    orderMode: document.getElementById("orderMode"),
    runDelay: document.getElementById("runDelay"),
    manualOrder: document.getElementById("manualOrder"),
    nodeTable: document.getElementById("nodeTable"),
    code: document.getElementById("code"),
    log: document.getElementById("log"),
    resetBtn: document.getElementById("resetBtn"),
    stepBtn: document.getElementById("stepBtn"),
    runBtn: document.getElementById("runBtn"),
    stopBtn: document.getElementById("stopBtn"),
    compileBtn: document.getElementById("compileBtn"),
    loadExampleBtn: document.getElementById("loadExampleBtn"),
    saveAlgoBtn: document.getElementById("saveAlgoBtn"),
    loadAlgoBtn: document.getElementById("loadAlgoBtn"),
    algoFileInput: document.getElementById("algoFileInput"),
    applyOrderBtn: document.getElementById("applyOrderBtn"),
    identityTable: document.getElementById("identityTable"),
    addIdentityBtn: document.getElementById("addIdentityBtn"),
    specBtn: document.getElementById("specBtn"),
    specModal: document.getElementById("specModal"),
    closeSpecBtn: document.getElementById("closeSpecBtn")
};

const palette = ["#2563eb", "#0f766e", "#dc2626", "#9333ea", "#ca8a04", "#0891b2", "#be185d", "#475569"];
const exampleCode = `// Example: flooding from the leader.
// p.memory persists across rounds.
// In anonymous mode, p.id starts as null for non-leaders.
function send(p) {
  if (p.round === 0) {
    p.memory.flood = p.isLeader;
    p.memory.firstHeard = null;
  }

  if (p.memory.flood) return "beep";
  return "listen";
}

function receive(p) {
  if (p.observation.heard) {
    p.memory.flood = true;
    p.id = p.round;
    if (p.memory.firstHeard === null) {
      p.memory.firstHeard = p.round;
    }
  }
}`;

let state = {
    round: 0,
    nodes: [],
    order: [],
    lastActions: [],
    lastObservations: [],
    compiledSend: null,
    compiledReceive: null,
    running: false,
    timer: null,
    drag: null,
    identityStyles: createDefaultIdentityStyles()
};

function log(message) {
    els.log.textContent = `${message}\n${els.log.textContent}`.slice(0, 6000);
}

function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    canvas.width = Math.max(400, Math.floor(rect.width * window.devicePixelRatio));
    canvas.height = Math.max(360, Math.floor(rect.height * window.devicePixelRatio));
    ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
    draw();
}

function createNodes(count) {
    const anonymous = els.identityMode.value === "anonymous";
    state.nodes = Array.from({ length: count }, (_, id) => ({
        id,
        labelId: anonymous && id !== 0 ? null : id,
        isLeader: id === 0,
        memory: {},
        output: null,
        done: false
    }));
    state.order = Array.from({ length: count }, (_, id) => id);
    state.lastActions = Array.from({ length: count }, () => ({ kind: "listen", cw: false, ccw: false }));
    state.lastObservations = Array.from({ length: count }, () => emptyObservation());
}

function createDefaultIdentityStyles() {
    const styles = {
        null: { name: "A", color: "#2563eb" },
        0: { name: "L", color: "#7c3aed" }
    };
    for (let id = 1; id <= 12; id++) {
        styles[String(id)] = { name: String(id), color: palette[id % palette.length] };
    }
    return styles;
}

function identityKey(value) {
    return value === null || value === undefined || value === "" ? "null" : String(value);
}

function parseIdentityValue(value) {
    if (value === "null" || value === "") return null;
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : value;
}

function identityStyle(value) {
    const key = identityKey(value);
    if (!state.identityStyles[key]) {
        const numeric = Math.abs(Number(value) || 0);
        state.identityStyles[key] = {
            name: key,
            color: palette[numeric % palette.length]
        };
    }
    return state.identityStyles[key];
}

function resetSimulation() {
    stopRun();
    const count = clamp(parseInt(els.nodeCount.value, 10) || 1, 1, 80);
    els.nodeCount.value = count;
    state.round = 0;
    state.drag = null;
    createNodes(count);
    els.manualOrder.value = state.order.join(",");
    compileAlgo();
    log(`Reset with n=${count}, ${identityLabel()}, model ${els.model.value}.`);
    render();
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function emptyObservation() {
    return {
        heard: false,
        cw: 0,
        ccw: 0,
        both: false,
        silent: true
    };
}

function compileAlgo() {
    try {
        const sendSource = `${els.code.value}
if (typeof send === "function") return send(process);
if (typeof algo === "function") return algo(process);
return "listen";`;
        const receiveSource = `${els.code.value}
if (typeof receive === "function") return receive(process);
return undefined;`;
        state.compiledSend = new Function("process", sendSource);
        state.compiledReceive = new Function("process", receiveSource);
        log("Algorithm compiled.");
        return true;
    } catch (error) {
        state.compiledSend = null;
        state.compiledReceive = null;
        log(`Compilation error: ${error.message}`);
        return false;
    }
}

function processView(node, observation = state.lastObservations[node.id]) {
    const anonymous = els.identityMode.value === "anonymous";
    const view = {
        index: node.id,
        n: state.nodes.length,
        round: state.round,
        isLeader: node.isLeader,
        anonymous,
        memory: node.memory,
        observation,
        output: node.output,
        done: node.done,
        terminate(value) {
            node.done = true;
            node.output = value;
            return "listen";
        }
    };
    Object.defineProperty(view, "id", {
        get() {
            return node.labelId;
        },
        set(value) {
            setNodeIdentity(node, value);
        },
        enumerable: true
    });
    return view;
}

function setNodeIdentity(node, value) {
    node.labelId = parseIdentityValue(value);
    identityStyle(node.labelId);
}

function normalizeAction(action) {
    const raw = String(action || "listen").toLowerCase();
    if (raw === "beep" || raw === "both") return { kind: "beep", cw: true, ccw: true };
    if (raw === "cw") return { kind: "cw", cw: true, ccw: false };
    if (raw === "ccw") return { kind: "ccw", cw: false, ccw: true };
    if (raw === "silent" || raw === "listen" || raw === "none") return { kind: "listen", cw: false, ccw: false };
    return { kind: "listen", cw: false, ccw: false };
}

function computeActions() {
    if (!state.compiledSend && !compileAlgo()) return null;

    const actions = [];
    for (const node of state.nodes) {
        if (node.done) {
            actions[node.id] = normalizeAction("listen");
            continue;
        }

        try {
            const result = state.compiledSend(processView(node, emptyObservation()));
            actions[node.id] = normalizeAction(result);
        } catch (error) {
            log(`Send error at process ${node.id}: ${error.message}`);
            stopRun();
            return null;
        }
    }
    return actions;
}

function applyReceives(observations) {
    if (!state.compiledReceive && !compileAlgo()) return false;

    for (const node of state.nodes) {
        if (node.done) continue;
        try {
            state.compiledReceive(processView(node, observations[node.id]));
        } catch (error) {
            log(`Receive error at process ${node.id}: ${error.message}`);
            stopRun();
            return false;
        }
    }
    return true;
}

function stepRound() {
    const orderOk = updateDynamicOrder();
    if (!orderOk) return;

    const actions = computeActions();
    if (!actions) return;

    const observations = computeObservations(actions);
    state.lastActions = actions;
    state.lastObservations = observations;
    if (!applyReceives(observations)) return;
    state.round += 1;

    const beeps = actions.filter(action => action.cw || action.ccw).length;
    const heard = observations.filter(obs => obs.heard).length;
    log(`Round ${state.round}: ${beeps} sends, ${heard} receives, order [${state.order.join(",")}].`);
    render();
}

function updateDynamicOrder() {
    const mode = els.orderMode.value;
    if (mode === "fixed") return true;

    if (mode === "manual") {
        return applyManualOrder(false);
    }

    if (mode === "rotate" && state.order.length > 1) {
        state.order.push(state.order.shift());
    }

    if (mode === "reverse") {
        state.order.reverse();
    }

    if (mode === "shuffle") {
        shuffle(state.order);
    }

    els.manualOrder.value = state.order.join(",");
    return true;
}

function shuffle(items) {
    for (let i = items.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [items[i], items[j]] = [items[j], items[i]];
    }
}

function applyManualOrder(announce = true) {
    const parsed = els.manualOrder.value
        .split(/[,\s]+/)
        .filter(Boolean)
        .map(value => Number(value));
    const expected = new Set(state.nodes.map(node => node.id));
    const seen = new Set(parsed);

    if (parsed.length !== state.nodes.length || seen.size !== parsed.length || parsed.some(id => !expected.has(id))) {
        log(`Invalid order. Expected a permutation of 0..${state.nodes.length - 1}.`);
        return false;
    }

    state.order = parsed;
    if (announce) {
        log(`Order applied: [${state.order.join(",")}].`);
        render();
    }
    return true;
}

function computeObservations(actions) {
    const observations = Array.from({ length: state.nodes.length }, () => emptyObservation());
    const model = els.model.value;

    for (let pos = 0; pos < state.order.length; pos++) {
        const id = state.order[pos];
        const prevId = state.order[(pos - 1 + state.order.length) % state.order.length];
        const nextId = state.order[(pos + 1) % state.order.length];
        const action = actions[id];

        if ((model === "BL" || model === "DBL") && (action.cw || action.ccw)) {
            continue;
        }

        const fromPrev = actions[prevId].cw ? 1 : 0;
        const fromNext = actions[nextId].ccw ? 1 : 0;
        observations[id] = {
            heard: fromPrev + fromNext > 0,
            cw: fromPrev,
            ccw: fromNext,
            both: fromPrev > 0 && fromNext > 0,
            silent: fromPrev + fromNext === 0
        };

        if (model === "BL") {
            observations[id].cw = observations[id].heard ? 1 : 0;
            observations[id].ccw = observations[id].heard ? 1 : 0;
            observations[id].both = observations[id].heard;
        }
    }

    return observations;
}

function startRun() {
    if (state.running) return;
    state.running = true;
    els.runBtn.textContent = "Running";
    const tick = () => {
        if (!state.running) return;
        stepRound();
        state.timer = window.setTimeout(tick, clamp(parseInt(els.runDelay.value, 10) || 600, 50, 5000));
    };
    tick();
}

function stopRun() {
    state.running = false;
    els.runBtn.textContent = "Run";
    if (state.timer) {
        window.clearTimeout(state.timer);
        state.timer = null;
    }
}

function render() {
    els.roundValue.textContent = state.round;
    els.metricNodes.textContent = state.nodes.length;
    els.metricBeeps.textContent = state.lastActions.filter(action => action.cw || action.ccw).length;
    els.metricHeard.textContent = state.lastObservations.filter(obs => obs.heard).length;
    els.metricDone.textContent = state.nodes.filter(node => node.done).length;
    renderNodeTable();
    renderIdentityTable();
    draw();
}

function renderNodeTable() {
    els.nodeTable.innerHTML = "";
    const posById = new Map(state.order.map((id, pos) => [id, pos]));
    for (const node of state.nodes) {
        const action = state.lastActions[node.id] || normalizeAction("listen");
        const obs = state.lastObservations[node.id] || emptyObservation();
        const style = identityStyle(node.labelId);
        const row = document.createElement("div");
        row.className = "node-row";
        row.innerHTML = `
            <span class="pill ${node.isLeader ? "leader" : ""}">${style.name}</span>
            <span>id ${identityKey(node.labelId)} | pos ${posById.get(node.id)} | obs ${formatObservation(obs)}</span>
            <span class="pill ${action.cw || action.ccw ? "beep" : "listen"}">${action.kind}</span>
            <span>${node.done ? String(node.output ?? "done") : ""}</span>
        `;
        els.nodeTable.appendChild(row);
    }
}

function renderIdentityTable() {
    els.identityTable.innerHTML = "";
    Object.entries(state.identityStyles).forEach(([key, style]) => {
        const row = document.createElement("div");
        row.className = "identity-row";
        row.innerHTML = `
            <input type="text" value="${key}" data-field="key" title="p.id value">
            <input type="text" value="${style.name}" data-field="name" title="Displayed name">
            <input type="color" value="${style.color}" data-field="color" title="Color">
        `;
        row.querySelector('[data-field="key"]').addEventListener("change", event => renameIdentityKey(key, event.target.value));
        row.querySelector('[data-field="name"]').addEventListener("input", event => {
            style.name = event.target.value || key;
            draw();
            renderNodeTable();
        });
        row.querySelector('[data-field="color"]').addEventListener("input", event => {
            style.color = event.target.value;
            draw();
        });
        els.identityTable.appendChild(row);
    });
}

function renameIdentityKey(oldKey, rawNewKey) {
    const newKey = identityKey(parseIdentityValue(rawNewKey));
    if (newKey === oldKey) {
        renderIdentityTable();
        return;
    }

    state.identityStyles[newKey] = state.identityStyles[oldKey];
    delete state.identityStyles[oldKey];
    for (const node of state.nodes) {
        if (identityKey(node.labelId) === oldKey) {
            node.labelId = parseIdentityValue(newKey);
        }
    }
    render();
}

function addIdentityStyle() {
    let next = 1;
    while (state.identityStyles[String(next)]) next += 1;
    state.identityStyles[String(next)] = {
        name: String(next),
        color: palette[next % palette.length]
    };
    renderIdentityTable();
}

function formatObservation(obs) {
    if (!obs.heard) return "-";
    const parts = [];
    if (obs.ccw) parts.push("CCW");
    if (obs.cw) parts.push("CW");
    return parts.join("+") || "beep";
}

function nodePositions() {
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.max(90, Math.min(width, height) * 0.34);
    const positions = new Map();

    for (let pos = 0; pos < state.order.length; pos++) {
        const angle = -Math.PI / 2 + (pos / state.order.length) * Math.PI * 2;
        positions.set(state.order[pos], {
            x: cx + radius * Math.cos(angle),
            y: cy + radius * Math.sin(angle),
            angle
        });
    }
    return positions;
}

function ringGeometry() {
    const rect = canvas.getBoundingClientRect();
    return {
        cx: rect.width / 2,
        cy: rect.height / 2,
        radius: Math.max(90, Math.min(rect.width, rect.height) * 0.34)
    };
}

function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function hitNode(point) {
    const positions = nodePositions();
    for (let i = state.nodes.length - 1; i >= 0; i--) {
        const node = state.nodes[i];
        const p = positions.get(node.id);
        const distance = Math.hypot(point.x - p.x, point.y - p.y);
        if (distance <= 30) return node.id;
    }
    return null;
}

function reorderDraggedNode() {
    if (!state.drag) return;

    const { cx, cy } = ringGeometry();
    const draggedId = state.drag.id;
    const baseOrder = state.order.filter(id => id !== draggedId);
    if (baseOrder.length === 0) {
        state.order = [draggedId];
        els.orderMode.value = "manual";
        els.manualOrder.value = state.order.join(",");
        return;
    }

    let angle = Math.atan2(state.drag.y - cy, state.drag.x - cx) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    const insertAt = clamp(Math.round((angle / (Math.PI * 2)) * baseOrder.length), 0, baseOrder.length);

    baseOrder.splice(insertAt, 0, draggedId);
    state.order = baseOrder;
    els.orderMode.value = "manual";
    els.manualOrder.value = state.order.join(",");
}

function commitDraggedNode() {
    if (!state.drag) return;
    const draggedId = state.drag.id;
    reorderDraggedNode();
    log(`Node ${draggedId} moved. New order [${state.order.join(",")}].`);
}

function projectOnRing(point) {
    const { cx, cy, radius } = ringGeometry();
    const dx = point.x - cx;
    const dy = point.y - cy;
    const length = Math.hypot(dx, dy) || 1;
    return {
        x: cx + (dx / length) * radius,
        y: cy + (dy / length) * radius
    };
}

function draw() {
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "#fbfcfe";
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (!state.nodes.length) return;
    const positions = nodePositions();
    if (state.drag) {
        positions.set(state.drag.id, { x: state.drag.x, y: state.drag.y, angle: 0 });
    }

    const { cx, cy, radius } = ringGeometry();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.strokeStyle = "#d9dee8";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 8]);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const node of state.nodes) {
        const p = positions.get(node.id);
        const action = state.lastActions[node.id] || normalizeAction("listen");
        const obs = state.lastObservations[node.id] || emptyObservation();
        const style = identityStyle(node.labelId);

        if (obs.heard) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 31, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(22, 163, 74, 0.55)";
            ctx.lineWidth = 5;
            ctx.stroke();
        }

        if (action.cw || action.ccw) {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 39, 0, Math.PI * 2);
            ctx.strokeStyle = "rgba(245, 158, 11, 0.65)";
            ctx.lineWidth = 3;
            ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, 25, 0, Math.PI * 2);
        ctx.fillStyle = style.color;
        ctx.fill();
        ctx.strokeStyle = node.isLeader ? "#2e1065" : "#ffffff";
        ctx.lineWidth = node.isLeader ? 4 : 2;
        ctx.stroke();

        ctx.fillStyle = "#ffffff";
        ctx.font = "700 14px Inter, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(style.name, p.x, p.y);

        ctx.fillStyle = "#475569";
        ctx.font = "11px Inter, sans-serif";
        ctx.fillText(`#${node.id}`, p.x, p.y + 40);
    }
}

canvas.addEventListener("mousedown", event => {
    const rawPoint = canvasPoint(event);
    const id = hitNode(rawPoint);
    if (id === null) return;
    const point = projectOnRing(rawPoint);
    state.drag = { id, x: point.x, y: point.y };
    stopRun();
    draw();
});

canvas.addEventListener("mousemove", event => {
    if (!state.drag) return;
    const point = projectOnRing(canvasPoint(event));
    state.drag.x = point.x;
    state.drag.y = point.y;
    reorderDraggedNode();
    render();
});

window.addEventListener("mouseup", () => {
    if (!state.drag) return;
    commitDraggedNode();
    state.drag = null;
    render();
});

function identityLabel() {
    return els.identityMode.value === "anonymous" ? "anonymous" : "identified";
}

function openSpecModal() {
    els.specModal.classList.add("open");
    els.specModal.setAttribute("aria-hidden", "false");
}

function closeSpecModal() {
    els.specModal.classList.remove("open");
    els.specModal.setAttribute("aria-hidden", "true");
}

function encodeIdentityTable() {
    return btoa(unescape(encodeURIComponent(JSON.stringify(state.identityStyles))));
}

function decodeIdentityTable(encoded) {
    return JSON.parse(decodeURIComponent(escape(atob(encoded))));
}

function createSavedAlgorithmContent() {
    return `/* SIMULATOR_IDENTITY_TABLE ${encodeIdentityTable()} */\n${els.code.value}`;
}

function loadIdentityTableFromContent(content) {
    const match = content.match(/^\/\* SIMULATOR_IDENTITY_TABLE ([A-Za-z0-9+/=]+) \*\/\s*/);
    if (!match) return content;

    try {
        state.identityStyles = decodeIdentityTable(match[1]);
        renderIdentityTable();
        log("Identity table loaded from file.");
    } catch (error) {
        log(`Could not load identity table: ${error.message}`);
    }

    return content.slice(match[0].length);
}

async function saveAlgorithm() {
    const defaultName = `algo-round-${state.round}.js`;
    const content = createSavedAlgorithmContent();

    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: defaultName,
                types: [{
                    description: "JavaScript Algorithm",
                    accept: { "text/javascript": [".js"], "text/plain": [".txt"] }
                }]
            });
            const writable = await handle.createWritable();
            await writable.write(content);
            await writable.close();
            log(`Algorithm and identity table saved to ${handle.name}.`);
            return;
        } catch (error) {
            if (error.name === "AbortError") {
                log("Save canceled.");
                return;
            }
            log(`File save unavailable: ${error.message}`);
        }
    }

    const filename = window.prompt("File name to save", defaultName);
    if (!filename) {
        log("Save canceled.");
        return;
    }

    const blob = new Blob([content], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    log(`Algorithm and identity table saved as ${filename}.`);
}

function loadAlgorithmFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
        const content = String(reader.result || "");
        els.code.value = loadIdentityTableFromContent(content);
        compileAlgo();
        render();
        log(`Algorithm loaded from ${file.name}.`);
    };
    reader.onerror = () => {
        log(`Could not load ${file.name}.`);
    };
    reader.readAsText(file);
}

els.resetBtn.addEventListener("click", resetSimulation);
els.stepBtn.addEventListener("click", stepRound);
els.runBtn.addEventListener("click", startRun);
els.stopBtn.addEventListener("click", stopRun);
els.compileBtn.addEventListener("click", compileAlgo);
els.saveAlgoBtn.addEventListener("click", saveAlgorithm);
els.loadAlgoBtn.addEventListener("click", () => els.algoFileInput.click());
els.algoFileInput.addEventListener("change", event => {
    loadAlgorithmFile(event.target.files[0]);
    event.target.value = "";
});
els.applyOrderBtn.addEventListener("click", () => applyManualOrder(true));
els.addIdentityBtn.addEventListener("click", addIdentityStyle);
els.specBtn.addEventListener("click", openSpecModal);
els.closeSpecBtn.addEventListener("click", closeSpecModal);
els.specModal.addEventListener("click", event => {
    if (event.target === els.specModal) closeSpecModal();
});
window.addEventListener("keydown", event => {
    if (event.key === "Escape") closeSpecModal();
});
els.loadExampleBtn.addEventListener("click", () => {
    els.code.value = exampleCode;
    compileAlgo();
});
els.nodeCount.addEventListener("change", resetSimulation);
els.identityMode.addEventListener("change", resetSimulation);
els.model.addEventListener("change", resetSimulation);

window.addEventListener("resize", resizeCanvas);
els.code.value = exampleCode;
resizeCanvas();
resetSimulation();
