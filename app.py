from flask import Flask, render_template, jsonify, request
import os
import serial

app = Flask(__name__)

# ── Machine configuration ── easy to change here ──────────────────────────────
MACHINE_CONFIG = {
    "work_area": {"x": 200, "y": 200, "z": 50},   # mm
    "max_feed_rate": 3000,                          # mm/min
    "max_spindle_rpm": 10000,
    "steps_per_mm": {"x": 80, "y": 80, "z": 400},
    "default_feed": 800,
    "default_seek": 2000,
    "baud_rates": [9600, 19200, 38400, 57600, 115200, 250000],
    "default_baud": 115200,
}


@app.route("/")
def index():
    return render_template("index.html", config=MACHINE_CONFIG)


# ── Stub API endpoints (implement with pyserial later) ────────────────────────

@app.route("/api/ports", methods=["GET"])
def list_ports():
    """Return available serial ports."""
    # TODO: use serial.tools.list_ports.comports()
    ports = [port.device for port in serial.tools.list_ports.comports()]
    return jsonify({"ports": []})


@app.route("/api/connect", methods=["POST"])
def connect():
    data = request.json
    # TODO: open serial port, send unlock, read GRBL greeting
    return jsonify({"ok": False, "message": "Backend not implemented yet"})


@app.route("/api/disconnect", methods=["POST"])
def disconnect():
    # TODO: close serial port
    return jsonify({"ok": True})


@app.route("/api/command", methods=["POST"])
def send_command():
    data = request.json
    cmd = data.get("cmd", "")
    # TODO: write cmd to serial, return response
    return jsonify({"ok": False, "response": "Backend not implemented yet"})


@app.route("/api/status", methods=["GET"])
def get_status():
    # TODO: send '?' to GRBL and parse response
    return jsonify({
        "state": "Disconnected",
        "wpos": {"x": 0.0, "y": 0.0, "z": 0.0},
        "mpos": {"x": 0.0, "y": 0.0, "z": 0.0},
        "feed": 0,
        "spindle": 0,
        "buf": {"avail": 15, "rx": 128},
        "ov": [100, 100, 100],
    })


@app.route("/api/upload", methods=["POST"])
def upload_gcode():
    f = request.files.get("file")
    if not f:
        return jsonify({"ok": False, "message": "No file"})
    content = f.read().decode("utf-8")
    lines = [l.strip() for l in content.splitlines() if l.strip() and not l.startswith(";")]
    # TODO: store in session/queue for streaming
    return jsonify({"ok": True, "lines": len(lines), "content": content})


@app.route("/api/run", methods=["POST"])
def run_job():
    # TODO: start streaming stored GCode line by line
    return jsonify({"ok": False, "message": "Backend not implemented yet"})


@app.route("/api/pause", methods=["POST"])
def pause_job():
    # TODO: send feed hold '!'
    return jsonify({"ok": False, "message": "Backend not implemented yet"})


@app.route("/api/resume", methods=["POST"])
def resume_job():
    # TODO: send cycle start '~'
    return jsonify({"ok": False, "message": "Backend not implemented yet"})


@app.route("/api/stop", methods=["POST"])
def stop_job():
    # TODO: send soft reset 0x18
    return jsonify({"ok": False, "message": "Backend not implemented yet"})


@app.route("/api/config", methods=["GET"])
def get_config():
    return jsonify(MACHINE_CONFIG)


@app.route("/api/config", methods=["POST"])
def update_config():
    global MACHINE_CONFIG
    data = request.json
    if "work_area" in data:
        MACHINE_CONFIG["work_area"].update(data["work_area"])
    return jsonify({"ok": True, "config": MACHINE_CONFIG})


if __name__ == "__main__":
    app.run(debug=True, port=5000, host="0.0.0.0")
