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

function encodeIds(p) {
    if (p.id == null) return 1;
    if (!p.memory.propagate) return 0;

    if (p.id === null) {
        return 1 << 0;
    }

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

function send(p) {
    if (p.round == 0) {
        if (p.isLeader) return "both";
        else return "listen";
    }
    if (p.round == 1) p.orSend((p.memory.count == 2 ? 1 : 0) + (p.id == null ? 2 : 0));
    if (p.round == p.memory.roundProp) return propagateSend(p);
    if (p.round == p.memory.roundProp + 1) p.orSend(encodeIds(p));

    return "listen";
}

function receive(p) {
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
        p.memory.lastCount = 0;
        p.memory.roundProp = 2;
        p.memory.propagateId = 3;
    }
    if (p.round == p.memory.roundProp)
        p.memory.propagate = propagateReceive(p, p.memory.propagateId);
    if (p.round == p.memory.roundProp + 1) {
        const propagateIds = decodeIds(p.observation.or);
        p.log("propagateIds: " + propagateIds);
        if (propagateIds.includes(null)) {
            p.memory.lastCount = propagateIds.length - 1;
            p.memory.count += p.memory.lastCount;
        } else {
            p.memory.lastCount = propagateIds.length;
            p.memory.count += p.memory.lastCount;
            p.terminate(p.memory.count);
        }
        p.log("last count: " + p.memory.lastCount);
        if (p.memory.lastCount == 1) {
            p.memory.roundProp += 2;
            ++p.memory.propagateId;
        }
        p.log("roundProp: " + p.memory.roundProp);
    }
    if (p.round > p.memory.roundProp + 1)
        p.terminate(6);
}
