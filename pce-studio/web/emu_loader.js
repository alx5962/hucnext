/**
 * emu_loader.js
 * PC Engine WebAssembly Emulator loader (libpce / GearGrafx)
 * Forked from: https://www.emulationonline.com/systems/pc_engine/emulator/
 */

var Module = Module || {};

const CANVAS_PARENT = "#bezel";
const VIDEO_DIMS = [256, 242];
const EMU_KEYS = [
    ['x', 'a'],          // Button II
    ['z', 'b'],          // Button I
    ['Shift', 'select'], // Select
    ['Enter', 'start'],  // Run
    ['ArrowUp', 'up'],
    ['ArrowDown', 'down'],
    ['ArrowLeft', 'left'],
    ['ArrowRight', 'right'],
];

let FRAME_BYTES = 0;
let ctx = null;
let canvas = null;
let frameRequest = null;
let imageData = null;
let heap = function() {};
let isRuntimeReady = false;
let pendingRomBytes = null;

Module['onRuntimeInitialized'] = function() {
    console.log('[libpce] Runtime initialized');
    if (Module['_framebuffer_bytes']) {
        FRAME_BYTES = Module['_framebuffer_bytes']();
    }
    if (Module['_get_heap']) {
        heap = Module['_get_heap'];
    } else {
        heap = function() {
            return Module['HEAPU8']['buffer'];
        };
    }
    isRuntimeReady = true;

    // Launch any queued ROM if one was waiting for runtime compilation
    if (pendingRomBytes) {
        let bytes = pendingRomBytes;
        pendingRomBytes = null;
        rom_load_array(bytes);
    }
};

async function load_url(url) {
    let resp = await fetch(url);
    if (!resp.ok) {
        alert('Failed to load ROM from ' + url + ' (HTTP ' + resp.status + ')');
        return;
    }
    let buf;
    if (resp.bytes) {
        buf = await resp.bytes();
    } else {
        const arrayBuf = await resp.arrayBuffer();
        buf = new Uint8Array(arrayBuf);
    }
    rom_load_array(buf);
}

function rom_load_array(buf) {
    if (!isRuntimeReady || !Module['_alloc_rom'] || !Module['_init']) {
        console.log('[libpce] Runtime not ready yet, queuing ROM for launch');
        pendingRomBytes = buf;
        return;
    }
    let ptr = Module['_alloc_rom'](buf.length);
    if (ptr === 0) {
        alert('ROM larger than supported or allocation failed.');
        return;
    }
    let mem = new Uint8Array(heap(), ptr, buf.length);
    mem.set(buf, 0);
    console.log('[libpce] Loaded ROM bytes:', buf.length);
    Module['_init'](ptr, buf.length);
    if (window['emu_hash_rom']) {
        window['emu_hash_rom'](buf);
    }
    console.log('[libpce] Core initialized, starting tick loop');
    tick();
}

// Programmatic helper to load ROM from ArrayBuffer or Uint8Array
window.loadPceRom = function(data) {
    if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume();
    }
    if (data instanceof Uint8Array) {
        rom_load_array(data);
    } else if (data instanceof ArrayBuffer) {
        rom_load_array(new Uint8Array(data));
    } else {
        console.error('loadPceRom expects Uint8Array or ArrayBuffer');
    }
};

function createCanvas() {
    let parent = document.querySelector(CANVAS_PARENT);
    if (!parent) {
        console.error('[libpce] Canvas parent not found:', CANVAS_PARENT);
        return;
    }
    parent.innerHTML = '';
    let w = VIDEO_DIMS[0];
    let h = VIDEO_DIMS[1];
    let el = document.createElement('canvas');
    el.width = w;
    el.height = h;
    imageData = new ImageData(w, h);
    el.style.width = (w * 2) + 'px';
    el.style.height = (h * 2) + 'px';
    el.style.imageRendering = 'pixelated';
    el.id = 'canvas';
    parent.appendChild(el);
}

let audioContext = null;
let audioNode = null;
const SAMPLE_RATE = 44100;
const BUCKET_SAMPLES = Math.floor(SAMPLE_RATE / 10);
const audioBuckets = [];

async function setupAudio() {
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContextClass({ sampleRate: SAMPLE_RATE });
        await audioContext.audioWorklet.addModule('audio-worker.js');
        audioNode = new AudioWorkletNode(audioContext, 'streaming-audio-processor');
        audioNode.connect(audioContext.destination);
        audioNode.port.onmessage = (e) => {
            audioBuckets.push(e.data);
        };
        console.log('[libpce] AudioWorklet initialized, state:', audioContext.state);
    } catch (err) {
        console.warn('[libpce] Audio initialization error (requires user gesture or secure context):', err);
    }
}

function setupBuiltins() {
    let gamelist = document.querySelector('#gamelist');
    if (!gamelist) return;
    gamelist.addEventListener('change', () => {
        if (gamelist.value) {
            load_url(gamelist.value);
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
        }
    });
}

const EMU_KEY_LIST = [];

function clearKeys() {
    if (!Module['_set_key']) {
        return;
    }
    for (let i = 0; i < EMU_KEY_LIST.length; i++) {
        Module['_set_key'](i, 0);
    }
}

function setKey(e, pressed) {
    let key = e.key;
    let idx = EMU_KEY_LIST.findIndex(k => k === key);
    if (idx !== -1) {
        if (e.preventDefault && (key.startsWith('Arrow') || key === ' ' || key === 'Enter')) {
            e.preventDefault();
        }
        if (Module['_set_key']) {
            Module['_set_key'](idx, pressed ? 1 : 0);
        }
    }
}

function setupInput() {
    EMU_KEYS.forEach(mapping => {
        let [keyName, elementId] = mapping;
        EMU_KEY_LIST.push(keyName);
        if (elementId !== '') {
            let el = document.getElementById(elementId);
            if (!el) return;
            el.addEventListener('mousedown', (e) => {
                e.preventDefault();
                if (audioContext && audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                setKey({ key: keyName }, true);
            });
            el.addEventListener('touchstart', (e) => {
                e.preventDefault();
                if (audioContext && audioContext.state === 'suspended') {
                    audioContext.resume();
                }
                setKey({ key: keyName }, true);
            }, { passive: false });
            el.addEventListener('mouseup', (e) => { e.preventDefault(); setKey({ key: keyName }, false); });
            el.addEventListener('touchend', (e) => { e.preventDefault(); setKey({ key: keyName }, false); }, { passive: false });
            el.addEventListener('mouseleave', () => setKey({ key: keyName }, false));
        }
    });

    document.addEventListener('keydown', function(e) {
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
        setKey(e, true);
    });
    document.addEventListener('keyup', function(e) {
        setKey(e, false);
    });
}

function tick() {
    if (frameRequest != null) {
        cancelAnimationFrame(frameRequest);
    }
    Module['_frame']();
    let fbPtr = Module['_framebuffer']();
    const fbArray = new Uint8ClampedArray(heap(), fbPtr, imageData.data.length);
    imageData.data.set(fbArray);
    ctx.putImageData(imageData, 0, 0);

    if (Module['_apu_sample_variable'] && audioNode) {
        let sampleBufferPtr = Module['_alloc_rom'](2 * SAMPLE_RATE);
        const count = Module['_apu_sample_variable'](sampleBufferPtr, Math.floor(SAMPLE_RATE / 60));
        const samples = new Int16Array(heap(), sampleBufferPtr, count);
        let bucket = null;
        if (audioBuckets.length > 0) {
            bucket = audioBuckets.pop();
        } else {
            bucket = new Int16Array(BUCKET_SAMPLES);
        }
        bucket.set(samples);
        audioNode.port.postMessage([bucket, count], [bucket.buffer]);
    }
    if (window.drawControls) {
        window.drawControls();
    }
    frameRequest = requestAnimationFrame(tick);
}

function setupScaleButtons() {
    const scale1 = document.getElementById('scale-1x');
    const scale2 = document.getElementById('scale-2x');
    const scale3 = document.getElementById('scale-3x');
    let w = VIDEO_DIMS[0];
    let h = VIDEO_DIMS[1];
    const buttons = [scale1, scale2, scale3];

    function setActive(activeBtn) {
        buttons.forEach(btn => {
            if (btn) btn.classList.remove('active');
        });
        if (activeBtn) activeBtn.classList.add('active');
    }

    if (scale1 && scale2 && scale3 && canvas) {
        scale1.addEventListener('click', () => {
            canvas.style.width = w + 'px';
            canvas.style.height = h + 'px';
            setActive(scale1);
        });
        scale2.addEventListener('click', () => {
            canvas.style.width = (w * 2) + 'px';
            canvas.style.height = (h * 2) + 'px';
            setActive(scale2);
        });
        scale3.addEventListener('click', () => {
            canvas.style.width = (w * 3) + 'px';
            canvas.style.height = (h * 3) + 'px';
            setActive(scale3);
        });
    }
}

function setupRomPicker() {
    const picker = document.querySelector('#cart_picker');
    if (!picker) return;

    picker.addEventListener('change', function(e) {
        if (!e.target.files || e.target.files.length !== 1) {
            return;
        }
        let file = e.target.files[0];
        let reader = new FileReader();
        reader.addEventListener('load', function(ev) {
            let romBytes = new Uint8Array(ev.target.result);
            rom_load_array(romBytes);
        });
        reader.readAsArrayBuffer(file);
        if (audioContext && audioContext.state === 'suspended') {
            audioContext.resume();
        }
    });
}

function setupDragAndDrop() {
    const bezel = document.querySelector(CANVAS_PARENT);
    if (!bezel) return;

    bezel.addEventListener('dragover', (e) => e.preventDefault());
    bezel.addEventListener('drop', (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            let file = e.dataTransfer.files[0];
            let reader = new FileReader();
            reader.addEventListener('load', (ev) => {
                rom_load_array(new Uint8Array(ev.target.result));
            });
            reader.readAsArrayBuffer(file);
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
        }
    });
}

async function checkAndAutoLoadRom() {
    try {
        // Prevent browser caching using cache: 'no-store' and a timestamp query parameter
        const cacheBustUrl = 'rom/rom.pce?_nocache=' + Date.now();
        let resp = await fetch(cacheBustUrl, {
            cache: 'no-store',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });

        if (resp.ok && resp.status === 200) {
            // Guard against SPA/fallback servers returning index.html as a 200 response
            const contentType = resp.headers.get('content-type') || '';
            if (contentType.includes('text/html')) {
                console.log('[libpce] rom/rom.pce returned HTML (likely 404 fallback), manual selection enabled');
                return false;
            }

            const arrayBuf = await resp.arrayBuffer();
            // A valid PC Engine ROM is at least several kilobytes
            if (arrayBuf.byteLength < 512) {
                console.log('[libpce] rom/rom.pce is empty or invalid size (' + arrayBuf.byteLength + ' bytes)');
                return false;
            }

            console.log('[libpce] Found valid rom/rom.pce (' + arrayBuf.byteLength + ' bytes), hiding ROM selector & drag-and-drop');
            // Hide the choose ROM / drag-and-drop UI
            const romLoader = document.querySelector('.rom-loader');
            if (romLoader) {
                romLoader.style.display = 'none';
            }

            const romBytes = new Uint8Array(arrayBuf);
            rom_load_array(romBytes);
            return true;
        }
    } catch (err) {
        console.log('[libpce] rom/rom.pce check skipped or not found:', err);
    }
    return false;
}

async function load() {
    createCanvas();
    canvas = document.querySelector('#canvas');
    if (canvas) {
        ctx = canvas.getContext('2d', { alpha: false });
        canvas.addEventListener('click', () => {
            if (audioContext && audioContext.state === 'suspended') {
                audioContext.resume();
            }
        });
    }
    setupInput();
    setupAudio();
    setupBuiltins();
    setupScaleButtons();

    const autoLoaded = await checkAndAutoLoadRom();
    if (!autoLoaded) {
        const romLoader = document.querySelector('.rom-loader');
        if (romLoader) {
            romLoader.style.display = '';
        }
        setupRomPicker();
        setupDragAndDrop();
    }
}

window.addEventListener('load', load);
