/* SIMULATOR_IDENTITY_TABLE eyIwIjp7Im5hbWUiOiJMIiwiY29sb3IiOiIjN2MzYWVkIn0sIjEiOnsibmFtZSI6IkNXIiwiY29sb3IiOiIjMGY3NjZlIn0sIjIiOnsibmFtZSI6IkNDVyIsImNvbG9yIjoiI2RjMjYyNiJ9LCIzIjp7Im5hbWUiOiJWMSIsImNvbG9yIjoiIzkzMzNlYSJ9LCI0Ijp7Im5hbWUiOiJWMiIsImNvbG9yIjoiI2NhOGEwNCJ9LCI1Ijp7Im5hbWUiOiJWMyIsImNvbG9yIjoiIzA4OTFiMiJ9LCI2Ijp7Im5hbWUiOiJWNCIsImNvbG9yIjoiI2JlMTg1ZCJ9LCI3Ijp7Im5hbWUiOiI3IiwiY29sb3IiOiIjNDc1NTY5In0sIjgiOnsibmFtZSI6IjgiLCJjb2xvciI6IiMyNTYzZWIifSwiOSI6eyJuYW1lIjoiOSIsImNvbG9yIjoiIzBmNzY2ZSJ9LCIxMCI6eyJuYW1lIjoiMTAiLCJjb2xvciI6IiNkYzI2MjYifSwiMTEiOnsibmFtZSI6IjExIiwiY29sb3IiOiIjOTMzM2VhIn0sIjEyIjp7Im5hbWUiOiIxMiIsImNvbG9yIjoiI2NhOGEwNCJ9LCJudWxsIjp7Im5hbWUiOiJBIiwiY29sb3IiOiIjMjU2M2ViIn19 */
function propagateSend(p) {
    if (p.id == null) return "ccw";
    else return "cw";
}

function propagateReceive(p, idx) {
    if (p.observation.cw && p.id == null) p.id = idx;
    else if (p.observation.ccw && p.id != null) return true;
    return false;
}

function encodeIdsPropagate1(p) {
    if (p.id == null) return 1;
    if (!p.memory.propagate) return 0;

    if (p.id === null) {
        return 1 << 0;
    }

    return 1 << (p.id + 1);
}

function encodeIdsPropagate2(p) {
    if (p.id == null || p.memory.propagate) return 0;
    return 1 << (p.id + 1);
}

function decodeIds(value) {
    const ids = [];

    if (value & 1) {
        ids.push(null);
    }

    for (let id = 0; id < 30; id++) {
        if (value & (1 << (id + 1))) {
        ids.push(id);
        }
    }

    return ids;
}


function ensureCountById(p) {
    if (!p.memory.countById) p.memory.countById = {};
}

function recordCountForIds(p, ids, count) {
    ensureCountById(p);
    for (const id of ids) {
        if (id !== null && id !== undefined) {
            p.memory.countById[id] = count;
        }
    }
}

function send(p) {
    if (p.round == 0) {
         p.memory.N = 7;
        if (p.isLeader) return "both";
        else return "listen";  
    }
    if (p.round == 1) p.orSend((p.memory.count == 2 ? 1 : 0) + (p.id == null ? 2 : 0));
    if (p.round == p.memory.roundProp) return propagateSend(p);
    if (p.round == p.memory.roundProp + 1) p.orSend(encodeIdsPropagate1(p));
    if (p.round == p.memory.roundProp + 2) p.orSend(encodeIdsPropagate2(p));

    return "listen";
}

function receive(p) {
    ensureCountById(p);
    if (p.round == 0) {
        if (p.isLeader && p.observation.heard) p.terminate(1);
        else if (p.observation.both) p.memory.count = 2;
        else if (p.observation.cw) p.id = 1;
        else if (p.observation.ccw) p.id = 2;
    }
    if (p.round == 1) {
        p.log("observation: " + (p.observation.or & 2));
        if ((p.observation.or & 1) == 1) 
            p.terminate(2);
        if ((p.observation.or & 2) == 0)
            p.terminate(3);
        p.memory.count = 3;
        recordCountForIds(p, [0, 1, 2], 1);
        p.memory.roundProp = 2;
        p.memory.propagateId = 3;
        p.memory.freshId = 3;
    }
    if (p.round == p.memory.roundProp) {
        p.memory.propagateId = p.memory.freshId;
        ++p.memory.freshId;
        p.memory.propagate = propagateReceive(p, p.memory.propagateId);
    }
    if (p.round == p.memory.roundProp + 1)
        p.memory.propagateIds = decodeIds(p.observation.or);
    if (p.round == p.memory.roundProp + 2) {
        const propagateIds2 = decodeIds(p.observation.or);
        if (p.isLeader) {
            p.log("PropagateIds1: " + p.memory.propagateIds);
            p.log("PropagateIds2: " + propagateIds2);
        }
        var count = 0;
        for (const id of p.memory.propagateIds) {
            if (id !== null) {
                if (!propagateIds2.includes(id)) {
                    count += p.memory.countById[id] || 0;
                } else if (p.memory.countById[id] == 2) {
                    ++count;
                    if (p.id === id && !p.memory.propagate) p.id = p.memory.freshId;
                    recordCountForIds(p, [id], 1);
                    recordCountForIds(p, [p.memory.freshId], 1);
                    ++p.memory.freshId;
                } else {
                    p.terminate(-1);
                    return;
                }
            }
        }
        recordCountForIds(p, [p.memory.propagateId], count);
        p.memory.count += count;
        if (p.isLeader) p.log("Count: " + p.memory.count);
        if (!p.memory.propagateIds.includes(null))
            p.terminate(p.memory.count);
        else if (p.memory.count + 1 == p.memory.N)
            p.terminate(p.memory.count + 1);
        p.memory.roundProp = p.round + 1;
    }
}
