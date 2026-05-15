/* ── State ──────────────────────────────────────────────────────────────────── */
const state = {
  connected:   false,
  machineState:'Disconnected',
  wpos: { x:0, y:0, z:0 },
  mpos: { x:0, y:0, z:0 },
  feed: 0, spindle: 0,
  buf:  { avail:15, rx:128 },
  ov:   [100,100,100],

  gcodeText:   '',
  gcodeLines:  [],
  currentLine: -1,
  totalLines:  0,
  jobRunning:  false,
  jobPaused:   false,

  jogStep: 1,
  jogFeed: 800,

  workW: 200,
  workH: 200,
  workZ: 50,

  svgGcode: '',
  statusInterval: null,
};

/* ── DOM shortcuts ─────────────────────────────────────────────────────────── */
const $ = id => document.getElementById(id);

/* ── Init ──────────────────────────────────────────────────────────────────── */
let viz;

document.addEventListener('DOMContentLoaded', () => {
  initVisualizer();
  initTabs();
  initJog();
  initGCodeTab();
  initSVGTab();
  initConsole();
  initConnection();
  initSettings();
  initModal();
  loadConfig();
  consoleLog('info', 'MiniCNC UI ready. Connect to a serial port to start.');
});

/* ── Config ────────────────────────────────────────────────────────────────── */
async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    state.workW = cfg.work_area.x;
    state.workH = cfg.work_area.y;
    state.workZ = cfg.work_area.z;
    if (viz) viz.setWorkArea(state.workW, state.workH);
    $('cfg-x').value = state.workW;
    $('cfg-y').value = state.workH;
    $('cfg-z').value = state.workZ;
    $('cfg-feed').value = cfg.max_feed_rate;
  } catch(e) {}
}

/* ── Visualizer ────────────────────────────────────────────────────────────── */
function initVisualizer() {
  const wrap   = $('visualizer-wrap');
  const canvas = $('viz-canvas');

  function resize() {
    canvas.width  = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
    if (viz) viz.resize(canvas.width, canvas.height);
    else {
      viz = new Visualizer(canvas);
      viz.setWorkArea(state.workW, state.workH);
    }
  }

  resize();
  new ResizeObserver(resize).observe(wrap);

  $('viz-fit').addEventListener('click', () => { viz.fitToScreen(); viz.render(); });
  $('viz-zoomin').addEventListener('click', () => {
    viz.zoom *= 1.25;
    viz.render();
  });
  $('viz-zoomout').addEventListener('click', () => {
    viz.zoom /= 1.25;
    viz.render();
  });
}

/* ── Tabs ──────────────────────────────────────────────────────────────────── */
function initTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
      tab.classList.add('active');
      $('tab-' + tab.dataset.tab).classList.add('active');
    });
  });
}

/* ── Connection ────────────────────────────────────────────────────────────── */
function initConnection() {
  refreshPorts();
  $('btn-refresh-ports').addEventListener('click', refreshPorts);
  $('btn-connect').addEventListener('click', toggleConnect);
}

async function refreshPorts() {
  const res = await fetch('/api/ports');
  const { ports } = await res.json();
  const sel = $('port-select');
  sel.innerHTML = ports.length
    ? ports.map(p => `<option value="${p}">${p}</option>`).join('')
    : '<option value="">— no ports —</option>';
}

async function toggleConnect() {
  if (state.connected) {
    await fetch('/api/disconnect', { method:'POST' });
    setConnected(false);
    clearInterval(state.statusInterval);
    consoleLog('info', 'Disconnected.');
    toast('Disconnected', 'info');
  } else {
    const port = $('port-select').value;
    const baud = $('baud-select').value;
    if (!port) { toast('Select a port first', 'error'); return; }
    const res  = await fetch('/api/connect', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ port, baud: parseInt(baud) }),
    });
    const data = await res.json();
    if (data.ok) {
      setConnected(true);
      consoleLog('info', `Connected to ${port} @ ${baud}`);
      toast(`Connected to ${port}`, 'success');
      state.statusInterval = setInterval(pollStatus, 200);
    } else {
      toast(data.message || 'Connection failed', 'error');
    }
  }
}

function setConnected(c) {
  state.connected = c;
  const btn = $('btn-connect');
  btn.textContent = c ? 'Disconnect' : 'Connect';
  btn.classList.toggle('connected', c);
  if (!c) {
    setMachineState('Disconnected');
    updateStatusPanel({ state:'Disconnected', wpos:{x:0,y:0,z:0}, mpos:{x:0,y:0,z:0}, feed:0, spindle:0, buf:{avail:15,rx:128}, ov:[100,100,100] });
  }
}

async function pollStatus() {
  if (!state.connected) return;
  try {
    const res  = await fetch('/api/status');
    const data = await res.json();
    updateStatusPanel(data);
    setMachineState(data.state);
    viz.updateMachinePos(data.wpos.x, data.wpos.y, data.wpos.z);
  } catch(e) {}
}

/* ── Status Panel ──────────────────────────────────────────────────────────── */
function updateStatusPanel(data) {
  const fmt = v => v.toFixed(3).padStart(8);
  $('wpos-x').textContent = fmt(data.wpos.x);
  $('wpos-y').textContent = fmt(data.wpos.y);
  $('wpos-z').textContent = fmt(data.wpos.z);
  $('mpos-x').textContent = fmt(data.mpos.x);
  $('mpos-y').textContent = fmt(data.mpos.y);
  $('mpos-z').textContent = fmt(data.mpos.z);
  $('stat-feed').textContent    = data.feed + ' mm/m';
  $('stat-spindle').textContent = data.spindle + ' rpm';
  $('stat-buf').textContent     = `${data.buf.avail}/${data.buf.rx}`;
  if (data.ov) {
    $('ov-feed').textContent    = data.ov[0] + '%';
    $('ov-rapid').textContent   = data.ov[1] + '%';
    $('ov-spindle').textContent = data.ov[2] + '%';
  }
}

function setMachineState(s) {
  state.machineState = s;
  const el = $('machine-state');
  el.querySelector('.state-text').textContent = s;
  el.className = '';
  el.classList.add(s.toLowerCase().replace(/[^a-z]/g,''));
  $('machine-state').classList.add(s.toLowerCase().split(':')[0]);
}

/* ── Jog ───────────────────────────────────────────────────────────────────── */
function initJog() {
  // Step buttons
  document.querySelectorAll('.step-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.step-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.jogStep = parseFloat(btn.dataset.step);
    });
  });

  // Feed slider
  const feedSlider = $('jog-feed-slider');
  feedSlider.addEventListener('input', () => {
    state.jogFeed = parseInt(feedSlider.value);
    $('jog-feed-val').textContent = state.jogFeed + ' mm/m';
  });

  // Jog buttons
  const jogMap = {
    'jog-xp': [+1,  0,  0],
    'jog-xm': [-1,  0,  0],
    'jog-yp': [ 0, +1,  0],
    'jog-ym': [ 0, -1,  0],
    'jog-zp': [ 0,  0, +1],
    'jog-zm': [ 0,  0, -1],
  };

  Object.entries(jogMap).forEach(([id, dir]) => {
    $(id)?.addEventListener('click', () => jog(...dir));
  });

  // Action buttons
  $('btn-home').addEventListener('click',  () => sendCmd('$H'));
  $('btn-zero').addEventListener('click',  () => sendCmd('G10 L20 P0 X0 Y0 Z0'));
  $('btn-probe').addEventListener('click', () => sendCmd('G38.2 Z-20 F50'));
  $('btn-unlock').addEventListener('click',() => sendCmd('$X'));

  // Keyboard jog
  document.addEventListener('keydown', e => {
    if (['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)) return;
    const map = {
      'ArrowLeft':  [-1, 0, 0],
      'ArrowRight': [+1, 0, 0],
      'ArrowUp':    [ 0,+1, 0],
      'ArrowDown':  [ 0,-1, 0],
      'PageUp':     [ 0, 0,+1],
      'PageDown':   [ 0, 0,-1],
    };
    if (map[e.key]) { e.preventDefault(); jog(...map[e.key]); }
  });
}

function jog(dx, dy, dz) {
  const s = state.jogStep;
  const f = state.jogFeed;
  const parts = [];
  if (dx) parts.push(`X${(dx*s).toFixed(3)}`);
  if (dy) parts.push(`Y${(dy*s).toFixed(3)}`);
  if (dz) parts.push(`Z${(dz*s).toFixed(3)}`);
  const cmd = `$J=G91 G21 ${parts.join(' ')} F${f}`;
  sendCmd(cmd);
}

/* ── Commands ──────────────────────────────────────────────────────────────── */
async function sendCmd(cmd) {
  consoleLog('sent', cmd);
  if (!state.connected) { consoleLog('error', 'Not connected'); return; }
  try {
    const res  = await fetch('/api/command', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ cmd }),
    });
    const data = await res.json();
    if (data.response) consoleLog('recv', data.response);
  } catch(e) { consoleLog('error', String(e)); }
}

/* ── GCode Tab ─────────────────────────────────────────────────────────────── */
function initGCodeTab() {
  const dropZone  = $('drop-zone');
  const fileInput = $('file-input');

  dropZone.addEventListener('click',       () => fileInput.click());
  dropZone.addEventListener('dragover',    e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave',   () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) loadGCodeFile(file);
  });
  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) loadGCodeFile(e.target.files[0]);
  });

  $('btn-run').addEventListener('click',   startJob);
  $('btn-pause').addEventListener('click', pauseJob);
  $('btn-stop').addEventListener('click',  stopJob);
}

function loadGCodeFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const text = e.target.result;
    loadGCode(text, file.name, file.size);
  };
  reader.readAsText(file);
}

function loadGCode(text, name = 'gcode.nc', size = 0) {
  state.gcodeText  = text;
  state.gcodeLines = text.split('\n').filter(l => l.trim());
  state.totalLines = state.gcodeLines.length;
  state.currentLine = -1;

  $('file-name').textContent  = name;
  $('file-meta').textContent  = `${state.totalLines} lines · ${(size/1024).toFixed(1)} KB`;
  $('gcode-file-info').classList.add('visible');
  $('btn-run').disabled = false;

  renderGCodeViewer();
  viz.loadGCode(text);
  toast(`Loaded: ${name}`, 'success');
}

function renderGCodeViewer() {
  const viewer = $('gcode-viewer');
  viewer.innerHTML = state.gcodeLines.map((line, i) => {
    const isComment = line.trim().startsWith(';') || line.trim().startsWith('(');
    const cls = isComment ? 'gcode-comment' : 'gcode-move';
    return `<div class="gcode-line ${cls}" id="gl-${i}">${escHtml(line)}</div>`;
  }).join('');
}

async function startJob() {
  if (!state.connected) { toast('Not connected', 'error'); return; }
  const res = await fetch('/api/run', { method:'POST' });
  const d   = await res.json();
  if (d.ok) {
    state.jobRunning = true;
    toast('Job started', 'success');
  } else {
    toast(d.message, 'error');
  }
}

async function pauseJob() {
  if (state.jobPaused) {
    await fetch('/api/resume', { method:'POST' });
    state.jobPaused = false;
    $('btn-pause').textContent = '⏸ Pause';
  } else {
    await fetch('/api/pause', { method:'POST' });
    state.jobPaused = true;
    $('btn-pause').textContent = '▶ Resume';
  }
}

async function stopJob() {
  await fetch('/api/stop', { method:'POST' });
  state.jobRunning = false;
  state.jobPaused  = false;
  $('btn-pause').textContent = '⏸ Pause';
}

function updateProgress(line, total) {
  const pct = total ? (line / total * 100) : 0;
  $('progress-fill').style.width  = pct + '%';
  $('progress-pct').textContent   = pct.toFixed(0) + '%';
  $('progress-lines').textContent = `${line} / ${total} lines`;

  // Highlight current line in viewer
  document.querySelectorAll('.gcode-line.active').forEach(el => el.classList.remove('active'));
  const el = $('gl-' + line);
  if (el) { el.classList.add('active'); el.scrollIntoView({ block:'nearest' }); }

  viz.setCurrentLine(line);
}

/* ── SVG Tab ───────────────────────────────────────────────────────────────── */
function initSVGTab() {
  const dropZone = $('svg-drop-zone');
  const fileInput= $('svg-file-input');

  dropZone.addEventListener('click',     () => fileInput.click());
  dropZone.addEventListener('dragover',  e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) loadSVGFile(file);
  });
  fileInput.addEventListener('change', e => {
    if (e.target.files[0]) loadSVGFile(e.target.files[0]);
  });

  $('btn-convert').addEventListener('click',  convertSVG);
  $('btn-download-gcode').addEventListener('click', downloadGCode);
  $('btn-use-gcode').addEventListener('click', useSVGGCode);

  // Live update feed label
  $('svg-feed').addEventListener('input', () => {
    $('svg-feed-val').textContent = $('svg-feed').value;
  });
}

let svgText = '';

function loadSVGFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    svgText = e.target.result;
    renderSVGPreview(svgText);
    $('btn-convert').disabled = false;
    toast('SVG loaded', 'success');
  };
  reader.readAsText(file);
}

function renderSVGPreview(text) {
  const wrap = $('svg-preview-canvas');
  wrap.innerHTML = text;
  const svgEl = wrap.querySelector('svg');
  if (svgEl) {
    svgEl.style.maxWidth  = '100%';
    svgEl.style.maxHeight = '100%';
    svgEl.style.filter    = 'invert(1) hue-rotate(160deg)';
  }
}

function convertSVG() {
  if (!svgText) { toast('Load an SVG first', 'error'); return; }
  try {
    const conv = new SVGtoGCode({
      feedRate:      parseInt($('svg-feed').value)    || 800,
      seekRate:      parseInt($('svg-seek').value)    || 2000,
      zSafe:         parseFloat($('svg-zsafe').value) || 5,
      zCut:          parseFloat($('svg-zcut').value)  || 0,
      scale:         parseFloat($('svg-scale').value) || 1,
      originX:       parseFloat($('svg-ox').value)    || 0,
      originY:       parseFloat($('svg-oy').value)    || 0,
      passes:        parseInt($('svg-passes').value)  || 1,
      passDepth:     parseFloat($('svg-passdepth').value) || 0,
      laserMode:     $('svg-laser').checked,
      spindleSpeed:  parseInt($('svg-spindle').value) || 10000,
    });
    state.svgGcode = conv.convert(svgText);
    $('svg-gcode-out').textContent = state.svgGcode;
    $('btn-download-gcode').disabled = false;
    $('btn-use-gcode').disabled = false;
    toast('Converted! ' + state.svgGcode.split('\n').length + ' lines', 'success');
  } catch(e) {
    toast('Conversion error: ' + e.message, 'error');
  }
}

function downloadGCode() {
  if (!state.svgGcode) return;
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([state.svgGcode], { type:'text/plain' }));
  a.download = 'output.nc';
  a.click();
}

function useSVGGCode() {
  if (!state.svgGcode) return;
  loadGCode(state.svgGcode, 'from-svg.nc', state.svgGcode.length);
  // Switch to GCode tab
  document.querySelector('[data-tab="gcode"]').click();
  toast('GCode loaded to job queue', 'success');
}

/* ── Console ───────────────────────────────────────────────────────────────── */
let cmdHistory = [];
let histIdx    = -1;

function initConsole() {
  const input = $('console-input');

  $('btn-send').addEventListener('click', () => {
    const cmd = input.value.trim();
    if (cmd) { sendCmd(cmd); cmdHistory.unshift(cmd); histIdx = -1; input.value = ''; }
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const cmd = input.value.trim();
      if (cmd) { sendCmd(cmd); cmdHistory.unshift(cmd); histIdx = -1; input.value = ''; }
    } else if (e.key === 'ArrowUp') {
      histIdx = Math.min(histIdx + 1, cmdHistory.length - 1);
      input.value = cmdHistory[histIdx] || '';
    } else if (e.key === 'ArrowDown') {
      histIdx = Math.max(histIdx - 1, -1);
      input.value = histIdx >= 0 ? cmdHistory[histIdx] : '';
    }
  });

  // Quick commands
  document.querySelectorAll('.quick-cmd').forEach(btn => {
    btn.addEventListener('click', () => sendCmd(btn.dataset.cmd));
  });
}

function consoleLog(type, msg) {
  const out  = $('console-output');
  const line = document.createElement('div');
  line.className = `console-line ${type}`;
  line.textContent = msg;
  out.appendChild(line);
  out.scrollTop = out.scrollHeight;
}

/* ── Settings Modal ────────────────────────────────────────────────────────── */
function initSettings() {
  $('btn-settings').addEventListener('click', () => $('settings-modal').classList.add('open'));
}

function initModal() {
  document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target === el) el.closest('.modal-overlay').classList.remove('open');
    });
  });

  $('btn-save-settings').addEventListener('click', async () => {
    const x = parseInt($('cfg-x').value);
    const y = parseInt($('cfg-y').value);
    const z = parseInt($('cfg-z').value);
    state.workW = x; state.workH = y; state.workZ = z;
    viz.setWorkArea(x, y);
    await fetch('/api/config', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ work_area: {x,y,z} }),
    });
    $('settings-modal').classList.remove('open');
    toast('Settings saved', 'success');
  });
}

/* ── Toast ─────────────────────────────────────────────────────────────────── */
function toast(msg, type = 'info', duration = 3000) {
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  $('toast-container').appendChild(t);
  setTimeout(() => t.remove(), duration);
}

/* ── Helpers ───────────────────────────────────────────────────────────────── */
function escHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
