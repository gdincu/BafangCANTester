'use strict';

const SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const NOTIFY_UUID  = '0000fff4-0000-1000-8000-00805f9b34fb';
const MAX_LOG_ENTRIES = 500;

const COMMANDS = {
    PAS: {
        0: '02 01 89 01 00 8B 03',
        1: '02 01 89 01 01 8C 03',
        2: '02 01 89 01 02 8D 03',
        3: '02 01 89 01 03 8E 03',
        4: '02 01 89 01 04 8F 03'
    },
    HEADLIGHT_ON: '02 01 A3 01 01 A6 03',
    HEADLIGHT_OFF: '02 01 A3 01 00 A5 03',
    ALTERNATIVE: '02 01 A1 01 01 A4 03'
};

let bleDevice = null;
let gattServer = null;
let service = null;
let targetCharacteristic = null;
let notifyCharacteristic = null;
let logHistory = [];

const statusEl = document.getElementById('status');
const logEl = document.getElementById('consoleLog');
const sendBtn = document.getElementById('sendBtn');
const sendWithResponseBtn = document.getElementById('sendWithResponseBtn');
const hexInput = document.getElementById('hexInput');
const uuidInput = document.getElementById('uuidInput');
const filterInput = document.getElementById('filterInput');
const capabilitiesEl = document.getElementById('capabilities');

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js').catch((error) => {
            console.warn('Service worker registration failed:', error);
        });
    });
}

function timestamp() {
    return new Date().toISOString().slice(11, 23);
}

function log(message, type = 'rx') {
    const prefix = type === 'tx' ? 'TX →' : type === 'error' ? 'ERROR' : 'RX ←';
    const line = `[${timestamp()}] ${prefix} ${message}`;
    logHistory.push(line);
    if (logHistory.length > MAX_LOG_ENTRIES) {
        logHistory.splice(0, logHistory.length - MAX_LOG_ENTRIES);
    }
    const div = document.createElement('div');
    div.className = type;
    div.innerText = line;
    logEl.prepend(div);
    while (logEl.children.length > MAX_LOG_ENTRIES) {
        logEl.lastChild.remove();
    }
}

function normalizeCharacteristicUUID(input) {
    let uuid = input.trim().toLowerCase();
    if (uuid.startsWith('0x')) {
        uuid = uuid.substring(2);
    }
    if (/^[0-9a-f]{4}$/.test(uuid)) {
        return `0000${uuid}-0000-1000-8000-00805f9b34fb`;
    }
    const compact = uuid.replace(/-/g, '');
    if (/^[0-9a-f]{32}$/.test(compact)) {
        return `${compact.slice(0, 8)}-${compact.slice(8, 12)}-${compact.slice(12, 16)}-${compact.slice(16, 20)}-${compact.slice(20)}`;
    }
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(uuid)) {
        return uuid;
    }
    throw new Error(`Invalid characteristic UUID: "${input}"`);
}

function hexToBytes(hexString) {
    const cleanHex = hexString.replace(/[\s,:-]/g, '').toLowerCase();
    if (!cleanHex) throw new Error('Payload is empty.');
    if (!/^[0-9a-f]+$/.test(cleanHex)) throw new Error('Payload contains non-hexadecimal characters.');
    if (cleanHex.length % 2 !== 0) throw new Error('Hex payload must contain an even number of characters.');
    
    const bytes = new Uint8Array(cleanHex.length / 2);
    for (let i = 0; i < cleanHex.length; i += 2) {
        bytes[i / 2] = parseInt(cleanHex.substring(i, i + 2), 16);
    }
    return bytes;
}

function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
}

function setConnectedUI(connected) {
    document.getElementById('connectBtn').classList.toggle('hidden', connected);
    document.getElementById('disconnectBtn').classList.toggle('hidden', !connected);
    if (!connected) {
        sendBtn.disabled = true;
        sendWithResponseBtn.disabled = true;
        capabilitiesEl.classList.add('hidden');
    }
}

function updateWriteButtons() {
    if (!targetCharacteristic) {
        sendBtn.disabled = true;
        sendWithResponseBtn.disabled = true;
        return;
    }
    const props = targetCharacteristic.properties;
    sendBtn.disabled = !(props.write || props.writeWithoutResponse);
    sendWithResponseBtn.disabled = !props.write;
}

document.getElementById('connectBtn').addEventListener('click', async () => {
    try {
        if (!navigator.bluetooth) throw new Error('Web Bluetooth is not supported by this browser.');
        statusEl.innerText = 'Status: Requesting Bluetooth Device...';
        
        bleDevice = await navigator.bluetooth.requestDevice({
            filters: [{ name: 'DP E12.CAN' }],
            optionalServices: [SERVICE_UUID]
        });

        bleDevice.addEventListener('gattserverdisconnected', onDisconnected);
        statusEl.innerText = 'Status: Connecting to GATT Server...';
        gattServer = await bleDevice.gatt.connect();

        statusEl.innerText = 'Status: Getting Primary Service...';
        service = await gattServer.getPrimaryService(SERVICE_UUID);
        log(`Connected to ${bleDevice.name || 'Bafang device'}`, 'rx');

        try {
            notifyCharacteristic = await service.getCharacteristic(NOTIFY_UUID);
            await notifyCharacteristic.startNotifications();
            notifyCharacteristic.addEventListener('characteristicvaluechanged', handleIncoming);
            log(`Notifications enabled on ${NOTIFY_UUID}`, 'rx');
        } catch (notifyError) {
            log(`Notification characteristic unavailable: ${notifyError.message}`, 'error');
        }

        await resolveTargetCharacteristic();
        updateWriteButtons();
        statusEl.innerText = 'Status: Connected & Ready';
        setConnectedUI(true);
    } catch (error) {
        statusEl.innerText = 'Status: Connection Failed';
        log(error.name + ': ' + error.message, 'error');
    }
});

async function resolveTargetCharacteristic() {
    const uuid = normalizeCharacteristicUUID(uuidInput.value);
    log(`Looking for characteristic ${uuid}`, 'rx');
    targetCharacteristic = await service.getCharacteristic(uuid);
    const props = targetCharacteristic.properties;

    capabilitiesEl.innerText = [
        `UUID: ${targetCharacteristic.uuid}`,
        `Properties: ${describeProperties(props)}`
    ].join('\n');
    capabilitiesEl.classList.remove('hidden');
    log(`Found ${targetCharacteristic.uuid}`, 'rx');
    log(`Properties: ${describeProperties(props)}`, 'rx');

    if (!props.write && !props.writeWithoutResponse) {
        throw new Error(`Characteristic ${uuid} does not advertise WRITE or WRITE WITHOUT RESPONSE.`);
    }
}

function describeProperties(props) {
    const list = [];
    if (props.broadcast) list.push('BROADCAST');
    if (props.read) list.push('READ');
    if (props.write) list.push('WRITE');
    if (props.writeWithoutResponse) list.push('WRITE_NO_RESPONSE');
    if (props.notify) list.push('NOTIFY');
    if (props.indicate) list.push('INDICATE');
    return list.join(' | ') || 'NONE';
}

async function sendHexCommand(hexString, forceResponse = false) {
    if (!bleDevice || !gattServer || !gattServer.connected) {
        alert('Device is not connected.');
        return;
    }

    try {
        if (!targetCharacteristic) {
            if (!service || !gattServer || !gattServer.connected) {
                log('Send Error: Device is not connected.', 'error');
                return;
            }
            await resolveTargetCharacteristic();
            updateWriteButtons();
        }

        const bytes = hexToBytes(hexString);
        const uuid = targetCharacteristic.uuid;
        const props = targetCharacteristic.properties;

        if (forceResponse) {
            if (!props.write) throw new Error('This characteristic does not support Write With Response.');
            log(`[UUID: ${uuid}] WRITE WITH RESPONSE → ${bytesToHex(bytes)}`, 'tx');
            await targetCharacteristic.writeValueWithResponse(bytes);
        } else {
            if (props.writeWithoutResponse) {
                log(`[UUID: ${uuid}] WRITE WITHOUT RESPONSE → ${bytesToHex(bytes)}`, 'tx');
                await targetCharacteristic.writeValueWithoutResponse(bytes);
            } else if (props.write) {
                log(`[UUID: ${uuid}] WRITE WITH RESPONSE → ${bytesToHex(bytes)}`, 'tx');
                await targetCharacteristic.writeValueWithResponse(bytes);
            } else {
                throw new Error('Characteristic has no usable write property.');
            }
        }
        log(`Sent ${bytes.length} byte(s) successfully.`, 'tx');
    } catch (error) {
        log(`Send Error: ${error.name}: ${error.message}`, 'error');
    }
}

function sendPreset(hexString) {
    if (!hexString) {
        log('Send Error: Unknown preset command.', 'error');
        return;
    }
    hexInput.value = hexString;
    sendHexCommand(hexString, false);
}

sendBtn.addEventListener('click', () => sendHexCommand(hexInput.value, false));
sendWithResponseBtn.addEventListener('click', () => sendHexCommand(hexInput.value, true));

document.querySelectorAll('.pas-btn').forEach(button => {
    button.addEventListener('click', () => sendPreset(COMMANDS.PAS[button.dataset.pas]));
});

document.querySelectorAll('.preset-btn').forEach(button => {
    button.addEventListener('click', () => sendPreset(COMMANDS[button.dataset.preset]));
});

uuidInput.addEventListener('change', async () => {
    if (!service || !gattServer || !gattServer.connected) return;
    try {
        await resolveTargetCharacteristic();
        updateWriteButtons();
    } catch (error) {
        targetCharacteristic = null;
        updateWriteButtons();
        log(`Characteristic Error: ${error.message}`, 'error');
    }
});

function handleIncoming(event) {
    const view = event.target.value;
    const buffer = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
    const hexString = bytesToHex(buffer);
    const filterValue = filterInput.value.replace(/[\s,:-]/g, '').toUpperCase();

    if (!filterValue || hexString.replace(/\s+/g, '').includes(filterValue)) {
        log(hexString, 'rx');
    } else {
        logHistory.push(`[${timestamp()}] RX ← ${hexString} (Hidden by filter)`);
    }
}

document.getElementById('disconnectBtn').addEventListener('click', () => {
    try {
        if (bleDevice && bleDevice.gatt && bleDevice.gatt.connected) {
            bleDevice.gatt.disconnect();
        }
    } catch (error) {
        log(`Disconnect Error: ${error.message}`, 'error');
    }
});

function onDisconnected() {
    statusEl.innerText = 'Status: Disconnected';
    setConnectedUI(false);
    gattServer = null;
    service = null;
    targetCharacteristic = null;
    notifyCharacteristic = null;
    log('Bluetooth device disconnected.', 'error');
}

document.getElementById('clearBtn').addEventListener('click', () => {
    logEl.innerHTML = '';
    logHistory = [];
});

document.getElementById('exportBtn').addEventListener('click', () => {
    if (logHistory.length === 0) {
        alert('Log is empty.');
        return;
    }
    const blob = new Blob([logHistory.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bafang_can_log_${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});
