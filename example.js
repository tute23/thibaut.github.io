/* SIMULATOR_IDENTITY_TABLE eyIwIjp7Im5hbWUiOiJMIiwiY29sb3IiOiIjN2MzYWVkIn0sIjEiOnsibmFtZSI6IkNXIiwiY29sb3IiOiIjMGY3NjZlIn0sIjIiOnsibmFtZSI6IkNDVyIsImNvbG9yIjoiI2RjMjYyNiJ9LCIzIjp7Im5hbWUiOiJWMSIsImNvbG9yIjoiIzkzMzNlYSJ9LCI0Ijp7Im5hbWUiOiJWMiIsImNvbG9yIjoiI2NhOGEwNCJ9LCI1Ijp7Im5hbWUiOiJWMyIsImNvbG9yIjoiIzA4OTFiMiJ9LCI2Ijp7Im5hbWUiOiJWNCIsImNvbG9yIjoiI2JlMTg1ZCJ9LCI3Ijp7Im5hbWUiOiI3IiwiY29sb3IiOiIjNDc1NTY5In0sIjgiOnsibmFtZSI6IjgiLCJjb2xvciI6IiMyNTYzZWIifSwiOSI6eyJuYW1lIjoiOSIsImNvbG9yIjoiIzBmNzY2ZSJ9LCIxMCI6eyJuYW1lIjoiMTAiLCJjb2xvciI6IiNkYzI2MjYifSwiMTEiOnsibmFtZSI6IjExIiwiY29sb3IiOiIjOTMzM2VhIn0sIjEyIjp7Im5hbWUiOiIxMiIsImNvbG9yIjoiI2NhOGEwNCJ9LCJudWxsIjp7Im5hbWUiOiJBIiwiY29sb3IiOiIjMjU2M2ViIn19 */

const INITIAL_TARGET_N = 8;
const FIRST_NEW_ID = 3;
const PHASE = {
    START: "start:",
    REGULAR: "regular:",
    EXTRA: "extra:",
    CONFLICT: "conflict:",
};

function isNullId(id) {
    return id === null || id === undefined;
}

function ensureCountById(p) {
    if (!p.memory.countById) p.memory.countById = {};
}

function recordCountForIds(p, ids, count) {
    ensureCountById(p);
    for (const id of ids) {
        if (!isNullId(id)) p.memory.countById[id] = count;
    }
}

function encodeId(id) {
    return id === null ? 1 : (1 << (id + 1));
}

function encodeIdsPropagate1(p, includeNull = true) {
    if (p.id == null && includeNull) return 1;
    if (!p.memory.propagate) return 0;
    return encodeId(p.id);
}

function encodeIdsPropagate2(p) {
    if (p.id == null || p.memory.propagate) return 0;
    return 1 << (p.id + 1);
}

function decodeIds(value) {
    const ids = [];
    if (value & 1) ids.push(null);

    for (let id = 0; 1 << (id + 1) <= value; id++) {
        if (value & (1 << (id + 1))) ids.push(id);
    }
    return ids;
}

function propagateSend(p) {
    return p.id == null ? "ccw" : "cw";
}

function propagateReceive(p, id) {
    if (p.observation.cw && p.id == null) {
        p.id = id;
        return true;
    }
    return !!(p.observation.ccw && p.id != null);
}

function startPropagationRound(p) {
    p.memory.propagateId = p.memory.freshId;
    p.memory.freshId += 1;
    p.memory.propagate = propagateReceive(p, p.memory.propagateId);
}

function splitKnownIds(p, firstIds, secondIds) {
    let count = 0;

    for (const id of firstIds) {
        if (id === null) continue;

        if (!secondIds.includes(id)) {
            count += p.memory.countById[id] || 0;
        } else if (p.memory.countById[id] == 2) {
            count += 1;
            if (p.id === id && !p.memory.propagate) p.id = p.memory.freshId;
            recordCountForIds(p, [id], 1);
            recordCountForIds(p, [p.memory.freshId], 1);
            p.memory.freshId += 1;
        } else {
            p.terminate(-1);
            return null;
        }
    }

    return count;
}

function finishRegularPropagation(p, count) {
    recordCountForIds(p, [p.memory.propagateId], count);
    p.memory.count += count;

    if (!p.memory.propagateIds.includes(null))
        p.terminate(p.memory.count);
    else if (p.memory.count + 1 == p.memory.N)
        p.terminate(p.memory.count + 1);

    if (count == 3)
        p.memory.phase = PHASE.EXTRA + "1";
    else
        p.memory.phase = PHASE.REGULAR + "1";
}

function handleExtraSplit(p) {
    p.memory.propagateIds2 = decodeIds(p.observation.or);

    let count = 0;
    let unknownCount = false;

    for (const id of p.memory.propagateIds1) {
        if (id == null) {
            p.terminate(8);
            return;
        }

        if (!p.memory.propagateIds2.includes(id)) {
            count += p.memory.countById[id] || 0;
        } else if (p.memory.countById[id] == 2) {
            count += 1;
            if (p.id === id && !p.memory.propagate) p.id = p.memory.freshId;
            recordCountForIds(p, [id], 1);
            recordCountForIds(p, [p.memory.freshId], 1);
            p.memory.freshId += 1;
        } else {
            count += 1;
            unknownCount = true;
            if (p.id === id && !p.memory.propagate) p.id = p.memory.freshId;
            p.memory.confkict1 = id;
            p.memory.conflict2 = p.memory.freshId;
            p.memory.freshId += 1;
        }
    }

    if (p.id == null) p.id = p.memory.freshId;
    p.memory.propagateId = p.memory.freshId;

    if (unknownCount) {
        p.memory.freshId += 1;
        if (p.memory.count + count >= p.memory.N) {
            p.terminate(p.memory.N);
            return;
        }
        p.memory.phase = PHASE.CONFLICT + "1";
        p.memory.cc = count;
        return;
    }

    recordCountForIds(p, [p.memory.freshId], count);
    p.memory.freshId += 1;
    p.memory.count += count;
    p.terminate(p.memory.count);
}

function resolveConflictCounts(p) {
    p.memory.propagateIds2 = decodeIds(p.observation.or);

    const firstHasConflict1 = p.memory.propagateIds1.includes(p.memory.conflict1);
    const secondHasConflict1 = p.memory.propagateIds2.includes(p.memory.conflict1);
    const firstHasPropagate = p.memory.propagateIds1.includes(p.memory.propagateId);
    const secondHasPropagate = p.memory.propagateIds2.includes(p.memory.propagateId);

    if ((firstHasConflict1 && secondHasConflict1) || (firstHasPropagate && secondHasPropagate)) {
        recordCountForIds(p, [p.memory.conflict1], 2);
        recordCountForIds(p, [p.memory.conflict2], 1);
        recordCountForIds(p, [p.memory.propagateId], p.memory.cc + 1);
    } else if (p.memory.propagateIds1.includes(p.memory.conflict2) || p.memory.propagateIds1.length == 2) {
        recordCountForIds(p, [p.memory.conflict1], 1);
        recordCountForIds(p, [p.memory.conflict2], 2);
        recordCountForIds(p, [p.memory.propagateId], p.memory.cc);
    } else {
        recordCountForIds(p, [p.memory.conflict1], 2);
        recordCountForIds(p, [p.memory.conflict2], 1);
        recordCountForIds(p, [p.memory.propagateId], p.memory.cc + 1);
    }

    p.memory.count += p.memory.countById[p.memory.propagateId];
    p.terminate(p.memory.count);
}

function send(p) {
    if (p.round == 0) {
        p.memory.N = INITIAL_TARGET_N;
        p.memory.phase = PHASE.START + "1";
    }

    switch (p.memory.phase) {
        case PHASE.START + "1":
            return p.isLeader ? "both" : "listen";
        case PHASE.START + "2":
            p.orSend((p.memory.count == 2 ? 1 : 0) + (p.id == null ? 2 : 0));
            break;
        case PHASE.REGULAR + "1":
            return propagateSend(p);
        case PHASE.REGULAR + "2":
            p.orSend(encodeIdsPropagate1(p));
            break;
        case PHASE.REGULAR + "3":
            p.orSend(encodeIdsPropagate2(p));
            break;
        case PHASE.EXTRA + "1":
            if (p.id == null) return "cw";
            break;
        case PHASE.EXTRA + "2":
            p.orSend(encodeIdsPropagate1(p, false));
            break;
        case PHASE.EXTRA + "3":
            p.orSend(encodeIdsPropagate2(p));
            break;
        case PHASE.CONFLICT + "1":
            if (p.id == p.memory.conflict2) return "cw";
            break;
        case PHASE.CONFLICT + "2":
            p.orSend(encodeIdsPropagate1(p, false));
            break;
        case PHASE.CONFLICT + "3":
            p.orSend(encodeIdsPropagate2(p));
            break;
    }

    return "listen";
}

function receive(p) {
    ensureCountById(p);

    switch (p.memory.phase) {
        case PHASE.START + "1":
            if (p.isLeader && p.observation.heard) p.terminate(1);
            else if (p.observation.both) p.memory.count = 2;
            else if (p.observation.cw) p.id = 1;
            else if (p.observation.ccw) p.id = 2;
            p.memory.phase = PHASE.START + "2";
            break;
        case PHASE.START + "2":
            if ((p.observation.or & 1) == 1) p.terminate(2);
            if ((p.observation.or & 2) == 0) p.terminate(3);
            p.memory.count = 3;
            recordCountForIds(p, [0, 1, 2], 1);
            p.memory.phase = PHASE.REGULAR + "1";
            p.memory.freshId = FIRST_NEW_ID;
            break;
        case PHASE.REGULAR + "1":
            startPropagationRound(p);
            p.memory.phase = PHASE.REGULAR + "2";
            break;
        case PHASE.REGULAR + "2":
            p.memory.propagateIds = decodeIds(p.observation.or);
            p.memory.phase = PHASE.REGULAR + "3";
            break;
        case PHASE.REGULAR + "3": {
            const count = splitKnownIds(p, p.memory.propagateIds, decodeIds(p.observation.or));
            if (count === null) return;
            finishRegularPropagation(p, count);
            break;
        }
        case PHASE.EXTRA + "1":
            p.memory.propagate = p.observation.heard;
            p.memory.phase = PHASE.EXTRA + "2";
            break;
        case PHASE.EXTRA + "2":
            p.memory.propagateIds1 = decodeIds(p.observation.or);
            p.memory.phase = PHASE.EXTRA + "3";
            break;
        case PHASE.EXTRA + "3":
            handleExtraSplit(p);
            break;
        case PHASE.CONFLICT + "1":
            p.memory.propagate = p.observation.cw;
            p.memory.phase = PHASE.CONFLICT + "2";
            break;
        case PHASE.CONFLICT + "2":
            p.memory.propagateIds1 = decodeIds(p.observation.or);
            p.memory.phase = PHASE.CONFLICT + "3";
            break;
        case PHASE.CONFLICT + "3":
            resolveConflictCounts(p);
            break;
    }
}
