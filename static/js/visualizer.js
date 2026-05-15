/**
 * CNC Toolpath Visualizer
 * Renders GCode paths on a canvas with pan/zoom and live position marker.
 */
class Visualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx    = canvas.getContext('2d');

    // Work area in mm (configurable)
    this.workW = 200;
    this.workH = 200;

    // Camera
    this.zoom    = 1;
    this.offsetX = 0;
    this.offsetY = 0;

    // State
    this.toolpath  = [];   // [{x,y,z,rapid}]
    this.machinePos = { x: 0, y: 0, z: 0 };
    this.currentLine = -1;
    this.cursorPos   = null;

    // Interaction
    this._drag = null;
    this._bindEvents();
    this.fitToScreen();
  }

  setWorkArea(w, h) {
    this.workW = w;
    this.workH = h;
    this.fitToScreen();
  }

  fitToScreen() {
    const margin = 40;
    const scaleX = (this.canvas.width  - margin * 2) / this.workW;
    const scaleY = (this.canvas.height - margin * 2) / this.workH;
    this.zoom    = Math.min(scaleX, scaleY);
    this.offsetX = (this.canvas.width  - this.workW * this.zoom) / 2;
    this.offsetY = (this.canvas.height - this.workH * this.zoom) / 2;
  }

  /* ── GCode parsing ──────────────────────────────────────────────────────── */
  loadGCode(text) {
    const lines = text.split('\n');
    this.toolpath = [];
    let x = 0, y = 0, z = 0;
    let absolute = true;

    for (const raw of lines) {
      const line = raw.split(';')[0].split('(')[0].trim().toUpperCase();
      if (!line) continue;

      if (line.startsWith('G90')) { absolute = true; continue; }
      if (line.startsWith('G91')) { absolute = false; continue; }

      const isG0 = /^G0(?:[^-\d]|$)/.test(line);
      const isG1 = /^G1(?:[^-\d]|$)/.test(line);
      if (!isG0 && !isG1) continue;

      const px = this._param(line, 'X');
      const py = this._param(line, 'Y');
      const pz = this._param(line, 'Z');

      if (absolute) {
        if (px !== null) x = px;
        if (py !== null) y = py;
        if (pz !== null) z = pz;
      } else {
        if (px !== null) x += px;
        if (py !== null) y += py;
        if (pz !== null) z += pz;
      }

      this.toolpath.push({ x, y, z, rapid: isG0 });
    }
    this.currentLine = -1;
    this.render();
  }

  _param(line, letter) {
    const m = line.match(new RegExp(letter + '([+-]?[\\d.]+)'));
    return m ? parseFloat(m[1]) : null;
  }

  /* ── Coordinate transforms ──────────────────────────────────────────────── */
  mmToCanvas(x, y) {
    return {
      cx: this.offsetX + x * this.zoom,
      cy: this.offsetY + (this.workH - y) * this.zoom,
    };
  }

  canvasToMM(cx, cy) {
    return {
      x: (cx - this.offsetX) / this.zoom,
      y: this.workH - (cy - this.offsetY) / this.zoom,
    };
  }

  /* ── Render ─────────────────────────────────────────────────────────────── */
  render() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    this._drawBackground();
    this._drawGrid();
    this._drawWorkArea();
    this._drawToolpath();
    this._drawMachinePos();
    this._drawOrigin();
  }

  _drawBackground() {
    const { ctx, canvas } = this;
    ctx.fillStyle = '#080810';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  _drawGrid() {
    const { ctx } = this;
    const step = 10; // mm
    const { cx: x0, cy: y0 } = this.mmToCanvas(0, 0);
    const { cx: xW, cy: yH } = this.mmToCanvas(this.workW, this.workH);
    const pxStep = step * this.zoom;

    ctx.strokeStyle = '#1a1a30';
    ctx.lineWidth   = 1;

    // Vertical
    for (let x = 0; x <= this.workW; x += step) {
      const { cx } = this.mmToCanvas(x, 0);
      ctx.beginPath();
      ctx.moveTo(cx, yH);
      ctx.lineTo(cx, y0);
      ctx.stroke();
    }
    // Horizontal
    for (let y = 0; y <= this.workH; y += step) {
      const { cy } = this.mmToCanvas(0, y);
      ctx.beginPath();
      ctx.moveTo(x0, cy);
      ctx.lineTo(xW, cy);
      ctx.stroke();
    }

    // Major grid (50mm)
    ctx.strokeStyle = '#252545';
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.workW; x += 50) {
      const { cx } = this.mmToCanvas(x, 0);
      ctx.beginPath();
      ctx.moveTo(cx, yH);
      ctx.lineTo(cx, y0);
      ctx.stroke();
    }
    for (let y = 0; y <= this.workH; y += 50) {
      const { cy } = this.mmToCanvas(0, y);
      ctx.beginPath();
      ctx.moveTo(x0, cy);
      ctx.lineTo(xW, cy);
      ctx.stroke();
    }
  }

  _drawWorkArea() {
    const { ctx } = this;
    const { cx: x0, cy: y0 } = this.mmToCanvas(0, 0);
    const w = this.workW * this.zoom;
    const h = this.workH * this.zoom;

    // Border glow
    ctx.shadowColor  = '#00d4aa44';
    ctx.shadowBlur   = 12;
    ctx.strokeStyle  = '#00d4aa55';
    ctx.lineWidth    = 1.5;
    ctx.strokeRect(x0, y0 - h, w, h);
    ctx.shadowBlur   = 0;

    // Corner marks
    const m = 10;
    const corners = [[x0,y0],[x0+w,y0],[x0,y0-h],[x0+w,y0-h]];
    ctx.strokeStyle = '#00d4aa99';
    ctx.lineWidth   = 1.5;
    corners.forEach(([cx,cy]) => {
      const dx = cx === x0 ? 1 : -1;
      const dy = cy === y0 ? -1 : 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy + dy*m);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + dx*m, cy);
      ctx.stroke();
    });

    // Labels
    ctx.fillStyle = '#00d4aa55';
    ctx.font = '10px monospace';
    ctx.fillText(`${this.workW}mm`, x0 + 4, y0 + 14);
    ctx.save();
    ctx.translate(x0 - 14, y0 - h + 4);
    ctx.rotate(Math.PI/2);
    ctx.fillText(`${this.workH}mm`, 0, 0);
    ctx.restore();
  }

  _drawToolpath() {
    const { ctx } = this;
    if (!this.toolpath.length) return;

    let px = 0, py = 0;
    this.toolpath.forEach((pt, i) => {
      const { cx, cy }   = this.mmToCanvas(pt.x, pt.y);
      const { cx: pcx, cy: pcy } = this.mmToCanvas(px, py);

      if (i === 0) { px = pt.x; py = pt.y; return; }

      ctx.beginPath();
      ctx.moveTo(pcx, pcy);
      ctx.lineTo(cx, cy);

      if (pt.rapid) {
        ctx.strokeStyle = '#ffffff18';
        ctx.setLineDash([4, 4]);
        ctx.lineWidth = 1;
      } else {
        const active = i === this.currentLine;
        ctx.strokeStyle = active ? '#00d4aa' : (i < this.currentLine ? '#00d4aa66' : '#7c6ff755');
        ctx.setLineDash([]);
        ctx.lineWidth = active ? 2 : 1;
      }
      ctx.stroke();
      ctx.setLineDash([]);

      px = pt.x;
      py = pt.y;
    });
  }

  _drawMachinePos() {
    const { ctx } = this;
    const { x, y } = this.machinePos;
    const { cx, cy } = this.mmToCanvas(x, y);

    // Cross-hair
    const size = 10;
    ctx.strokeStyle = '#00d4aa';
    ctx.lineWidth   = 1.5;
    ctx.shadowColor = '#00d4aa';
    ctx.shadowBlur  = 8;

    ctx.beginPath();
    ctx.moveTo(cx - size, cy);
    ctx.lineTo(cx + size, cy);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx, cy + size);
    ctx.stroke();

    // Circle
    ctx.beginPath();
    ctx.arc(cx, cy, 4, 0, Math.PI * 2);
    ctx.fillStyle = '#00d4aa';
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  _drawOrigin() {
    const { ctx } = this;
    const { cx, cy } = this.mmToCanvas(0, 0);
    const len = 16;

    ctx.lineWidth = 1.5;

    // X axis (red)
    ctx.strokeStyle = '#f87171';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + len, cy);
    ctx.stroke();
    ctx.fillStyle = '#f87171';
    ctx.font = '9px monospace';
    ctx.fillText('X', cx + len + 2, cy + 4);

    // Y axis (green)
    ctx.strokeStyle = '#4ade80';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx, cy - len);
    ctx.stroke();
    ctx.fillStyle = '#4ade80';
    ctx.fillText('Y', cx - 3, cy - len - 2);
  }

  /* ── Events ─────────────────────────────────────────────────────────────── */
  _bindEvents() {
    const c = this.canvas;

    c.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.12 : 1/1.12;
      const rect   = c.getBoundingClientRect();
      const mx     = e.clientX - rect.left;
      const my     = e.clientY - rect.top;
      this.offsetX = mx - (mx - this.offsetX) * factor;
      this.offsetY = my - (my - this.offsetY) * factor;
      this.zoom   *= factor;
      this.render();
    }, { passive: false });

    c.addEventListener('mousedown', e => {
      this._drag = { x: e.clientX, y: e.clientY, ox: this.offsetX, oy: this.offsetY };
    });

    window.addEventListener('mousemove', e => {
      if (this._drag) {
        this.offsetX = this._drag.ox + (e.clientX - this._drag.x);
        this.offsetY = this._drag.oy + (e.clientY - this._drag.y);
        this.render();
      }
      const rect = this.canvas.getBoundingClientRect();
      const pos  = this.canvasToMM(e.clientX - rect.left, e.clientY - rect.top);
      this.cursorPos = pos;
      document.getElementById('viz-cursor-pos').textContent =
        `X:${pos.x.toFixed(1)} Y:${pos.y.toFixed(1)}`;
    });

    window.addEventListener('mouseup', () => { this._drag = null; });
  }

  resize(w, h) {
    this.canvas.width  = w;
    this.canvas.height = h;
    this.fitToScreen();
    this.render();
  }

  updateMachinePos(x, y, z) {
    this.machinePos = { x, y, z };
    this.render();
  }

  setCurrentLine(n) {
    this.currentLine = n;
    this.render();
  }
}
