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
    errorBox: document.getElementById("errorBox"),
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
const exampleCode = '/* SIMULATOR_IDENTITY_TABLE eyIwIjp7Im5hbWUiOiJMIiwiY29sb3IiOiIjN2MzYWVkIn0sIjEiOnsibmFtZSI6IkNXIiwiY29sb3IiOiIjMGY3NjZlIn0sIjIiOnsibmFtZSI6IkNDVyIsImNvbG9yIjoiI2RjMjYyNiJ9LCIzIjp7Im5hbWUiOiJWMSIsImNvbG9yIjoiIzkzMzNlYSJ9LCI0Ijp7Im5hbWUiOiJWMiIsImNvbG9yIjoiI2NhOGEwNCJ9LCI1Ijp7Im5hbWUiOiJWMyIsImNvbG9yIjoiIzA4OTFiMiJ9LCI2Ijp7Im5hbWUiOiJWNCIsImNvbG9yIjoiI2JlMTg1ZCJ9LCI3Ijp7Im5hbWUiOiI3IiwiY29sb3IiOiIjNDc1NTY5In0sIjgiOnsibmFtZSI6IjgiLCJjb2xvciI6IiMyNTYzZWIifSwiOSI6eyJuYW1lIjoiOSIsImNvbG9yIjoiIzBmNzY2ZSJ9LCIxMCI6eyJuYW1lIjoiMTAiLCJjb2xvciI6IiNkYzI2MjYifSwiMTEiOnsibmFtZSI6IjExIiwiY29sb3IiOiIjOTMzM2VhIn0sIjEyIjp7Im5hbWUiOiIxMiIsImNvbG9yIjoiI2NhOGEwNCJ9LCJudWxsIjp7Im5hbWUiOiJBIiwiY29sb3IiOiIjMjU2M2ViIn19 */\nfunction propagateSend(p) {\n    if (p.id == null) return "ccw";\n    else return "cw";\n}\n\nfunction propagateReceive(p, idx) {\n    if (p.observation.cw && p.id == null) p.id = idx;\n    else if (p.observation.ccw && p.id != null) return true;\n    return false;\n}\n\nfunction encodeIds(p) {\n    if (p.id == null) return 1;\n    if (!p.memory.propagate) return 0;\n\n    if (p.id === null) {\n        return 1 << 0;\n    }\n\n    return 1 << (p.id + 1);\n}\n\nfunction decodeIds(value) {\n    const ids = [];\n\n    if (value & 1) {\n        ids.push(null);\n    }\n\n    for (let id = 0; id < 30; id++) {\n        if (value & (1 << (id + 1))) {\n        ids.push(id);\n        }\n    }\n\n    return ids;\n}\n\nfunction send(p) {\n    if (p.round == 0) {\n        if (p.isLeader) return "both";\n        else return "listen";\n    }\n    if (p.round == 1) p.orSend((p.memory.count == 2 ? 1 : 0) + (p.id == null ? 2 : 0));\n    if (p.round == p.memory.roundProp) return propagateSend(p);\n    if (p.round == p.memory.roundProp + 1) p.orSend(encodeIds(p));\n\n    return "listen";\n}\n\nfunction receive(p) {\n    if (p.round == 0) {\n        if (p.isLeader && p.observation.heard) p.terminate(1);\n        else if (p.observation.both) p.memory.count = 2;\n        else if (p.observation.cw) p.id = 1;\n        else if (p.observation.ccw) p.id = 2;\n    }\n    if (p.round == 1) {\n        p.log("observation: " + (p.observation.or & 2));\n        if ((p.observation.or & 1) == 1) \n            p.terminate(2);\n        if ((p.observation.or & 2) == 0)\n            p.terminate(3);\n        p.memory.count = 3;\n        p.memory.lastCount = 0;\n        p.memory.roundProp = 2;\n        p.memory.propagateId = 3;\n    }\n    if (p.round == p.memory.roundProp)\n        p.memory.propagate = propagateReceive(p, p.memory.propagateId);\n    if (p.round == p.memory.roundProp + 1) {\n        const propagateIds = decodeIds(p.observation.or);\n        p.log("propagateIds: " + propagateIds);\n        if (propagateIds.includes(null)) {\n            p.memory.lastCount = propagateIds.length - 1;\n            p.memory.count += p.memory.lastCount;\n        } else {\n            p.memory.lastCount = propagateIds.length;\n            p.memory.count += p.memory.lastCount;\n            p.terminate(p.memory.count);\n        }\n        p.log("last count: " + p.memory.lastCount);\n        if (p.memory.lastCount == 1) {\n            p.memory.roundProp += 2;\n            ++p.memory.propagateId;\n        }\n        p.log("roundProp: " + p.memory.roundProp);\n    }\n    if (p.round > p.memory.roundProp + 1)\n        p.terminate(6);\n}\n';

let state = {
    round: 0,
    nodes: [],
    order: [],
    lastActions: [],
    lastObservations: [],
    lastOrSends: [],
    lastTerminations: [],
    compiledSend: null,
    compiledReceive: null,
    running: false,
    timer: null,
    drag: null,
    identityStyles: createDefaultIdentityStyles(),
    roundOrValue: 0
};

function log(message) {
    els.log.textContent = `${message}\n${els.log.textContent}`.slice(0, 6000);
}

function formatDebugValue(value) {
    if (typeof value === "string") return value;
    try {
        return JSON.stringify(value);
    } catch (_error) {
        return String(value);
    }
}

function clearError() {
    els.errorBox.textContent = "";
    els.errorBox.classList.remove("visible");
    els.code.classList.remove("code-error");
}

function reportError(title, error, context = {}) {
    const details = [];
    details.push(title);
    if (context.round !== undefined) details.push(`Round: ${context.round}`);
    if (context.phase) details.push(`Phase: ${context.phase}`);
    if (context.processId !== undefined) details.push(`Process: ${context.processId}`);
    if (error && error.name) details.push(`Type: ${error.name}`);
    if (error && error.message) details.push(`Message: ${error.message}`);

    const stackLine = findUserStackLine(error);
    if (stackLine) details.push(`Location: ${stackLine}`);

    if (context.hint) details.push(`Hint: ${context.hint}`);

    els.errorBox.textContent = details.join("\n");
    els.errorBox.classList.add("visible");
    els.code.classList.add("code-error");
    log(`${title}: ${error && error.message ? error.message : "unknown error"}`);
}

function findUserStackLine(error) {
    if (!error || !error.stack) return "";
    const lines = String(error.stack).split("\n").map(line => line.trim());
    return lines.find(line => line.includes("<anonymous>")) || lines[1] || "";
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
    state.lastOrSends = Array.from({ length: count }, () => null);
    state.lastTerminations = Array.from({ length: count }, () => null);
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
        silent: true,
        or: 0
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
        clearError();
        log("Algorithm compiled.");
        return true;
    } catch (error) {
        state.compiledSend = null;
        state.compiledReceive = null;
        reportError("Compilation error", error, {
            hint: "Check brackets, parentheses, function names, and JavaScript syntax."
        });
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
        log(...values) {
            const rendered = values.map(value => formatDebugValue(value)).join(" ");
            log(`[r${state.round} p${node.id}] ${rendered}`);
        },
        orSend(value) {
            const numeric = Number(value);
            if (!Number.isInteger(numeric)) {
                throw new Error(`orSend expects an integer, got ${JSON.stringify(value)}`);
            }
            state.roundOrValue |= numeric;
            state.lastOrSends[node.id] = (state.lastOrSends[node.id] ?? 0) | numeric;
        },
        terminate(value) {
            node.done = true;
            node.output = value;
            state.lastTerminations[node.id] = value;
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

function normalizeAction(action, context = {}) {
    const raw = String(action || "listen").toLowerCase();
    if (raw === "beep" || raw === "both") return { kind: "beep", cw: true, ccw: true };
    if (raw === "cw") return { kind: "cw", cw: true, ccw: false };
    if (raw === "ccw") return { kind: "ccw", cw: false, ccw: true };
    if (raw === "silent" || raw === "listen" || raw === "none") return { kind: "listen", cw: false, ccw: false };

    reportError("Invalid action", new Error(`send(p) returned ${JSON.stringify(action)}`), {
        phase: "send",
        processId: context.processId,
        round: state.round,
        hint: 'Return one of "listen", "beep", "both", "cw", or "ccw". Use p.orSend(integer) separately for the global OR primitive.'
    });
    return null;
}

function computeActions() {
    if (!state.compiledSend && !compileAlgo()) return null;

    const actions = [];
    state.roundOrValue = 0;
    state.lastOrSends = Array.from({ length: state.nodes.length }, () => null);
    state.lastTerminations = Array.from({ length: state.nodes.length }, () => null);
    for (const node of state.nodes) {
        if (node.done) {
            actions[node.id] = normalizeAction("listen", { processId: node.id });
            continue;
        }

        try {
            const result = state.compiledSend(processView(node, emptyObservation()));
            const action = normalizeAction(result, { processId: node.id });
            if (!action) {
                stopRun();
                return null;
            }
            actions[node.id] = action;
        } catch (error) {
            reportError("Runtime error", error, {
                phase: "send",
                processId: node.id,
                round: state.round
            });
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
            reportError("Runtime error", error, {
                phase: "receive",
                processId: node.id,
                round: state.round
            });
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
            silent: fromPrev + fromNext === 0,
            or: state.roundOrValue
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
        const action = state.lastActions[node.id] || { kind: "listen", cw: false, ccw: false };
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
        if (state.lastOrSends[node.id] === null) continue;
        const p = positions.get(node.id);
        const vx = p.x - cx;
        const vy = p.y - cy;
        const length = Math.hypot(vx, vy) || 1;
        const bubbleX = p.x - (vx / length) * 62;
        const bubbleY = p.y - (vy / length) * 62;
        drawConnector(bubbleX, bubbleY, cx, cy, "#06b6d4");
    }

    if (state.lastOrSends.some(value => value !== null)) {
        drawBubble(cx, cy, `OR ${state.roundOrValue}`, {
            fill: "#1f2937",
            stroke: "#111827",
            text: "#ffffff"
        });
    }

    for (const node of state.nodes) {
        const p = positions.get(node.id);
        const action = state.lastActions[node.id] || { kind: "listen", cw: false, ccw: false };
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

        const vx = p.x - cx;
        const vy = p.y - cy;
        const length = Math.hypot(vx, vy) || 1;
        const ux = vx / length;
        const uy = vy / length;

        if (state.lastOrSends[node.id] !== null) {
            const bubbleX = p.x - ux * 62;
            const bubbleY = p.y - uy * 62;
            drawBubble(bubbleX, bubbleY, String(state.lastOrSends[node.id]), {
                fill: "#ecfeff",
                stroke: "#06b6d4",
                text: "#164e63"
            });
        }

        if (state.lastTerminations[node.id] !== null) {
            const bubbleX = p.x + ux * 48;
            const bubbleY = p.y + uy * 48;
            drawBubble(bubbleX, bubbleY, `out ${formatDebugValue(state.lastTerminations[node.id])}`, {
                fill: "#f0fdf4",
                stroke: "#22c55e",
                text: "#14532d"
            });
        }
    }
}

function drawConnector(x1, y1, x2, y2, color) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}

function drawBubble(x, y, text, colors) {
    const label = String(text);
    ctx.save();
    ctx.font = "700 12px Inter, sans-serif";
    const width = Math.min(Math.max(ctx.measureText(label).width + 18, 42), 150);
    const height = 26;
    const left = x - width / 2;
    const top = y - height / 2;

    ctx.fillStyle = colors.fill;
    ctx.strokeStyle = colors.stroke;
    ctx.lineWidth = 1.5;
    roundRect(left, top, width, height, 13);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = colors.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label.length > 18 ? `${label.slice(0, 17)}…` : label, x, y + 0.5);
    ctx.restore();
}

function roundRect(x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + r);
    ctx.lineTo(x + width, y + height - r);
    ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    ctx.lineTo(x + r, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
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
    els.code.value = loadIdentityTableFromContent(exampleCode);
    compileAlgo();
    render();
});
els.nodeCount.addEventListener("change", resetSimulation);
els.identityMode.addEventListener("change", resetSimulation);
els.model.addEventListener("change", resetSimulation);

window.addEventListener("resize", resizeCanvas);
els.code.value = loadIdentityTableFromContent(exampleCode);
resizeCanvas();
resetSimulation();
