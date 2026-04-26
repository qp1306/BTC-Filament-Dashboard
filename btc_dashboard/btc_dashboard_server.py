#!/usr/bin/env python3
import json
import os
import time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
PORT = int(os.environ.get("BTC_DASHBOARD_PORT", "7131"))


def now_iso():
    return time.strftime("%Y-%m-%d %H:%M:%S")


def read_json(path, fallback):
    try:
        if path.exists():
            with path.open("r", encoding="utf-8") as f:
                return json.load(f)
    except Exception:
        pass
    return fallback


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
        f.write("\n")
    tmp.replace(path)


def load_dashboard_state():
    config = read_json(DATA_DIR / "config.json", {})
    tools = read_json(DATA_DIR / "tools.json", {"tools": []})
    spools = read_json(DATA_DIR / "spools.json", {"spools": {}})
    history = read_json(DATA_DIR / "history.json", {"events": []})
    status = read_json(DATA_DIR / "status.json", {})

    return {
        "ok": True,
        "updated_at": now_iso(),
        "config": config,
        "tools": tools.get("tools", []),
        "spools": spools.get("spools", {}),
        "history": history.get("events", []),
        "status": status,
    }


def record_event(params):
    tool = params.get("tool", [""])[0]
    event = params.get("event", ["manual"])[0]
    state = params.get("state", [""])[0]
    message = params.get("message", [""])[0]
    spool_id = params.get("spool_id", [""])[0]
    mdm_state = params.get("mdm_state", [""])[0]
    filament_mm = params.get("filament_mm", [""])[0]

    status = read_json(DATA_DIR / "status.json", {})
    history = read_json(DATA_DIR / "history.json", {"events": []})
    tools_data = read_json(DATA_DIR / "tools.json", {"tools": []})

    event_row = {
        "time": now_iso(),
        "tool": tool,
        "event": event,
        "state": state,
        "message": message,
        "spool_id": spool_id,
        "mdm_state": mdm_state,
        "filament_mm": filament_mm,
    }

    history.setdefault("events", [])
    history["events"].insert(0, event_row)
    history["events"] = history["events"][:200]

    status["last_event"] = event
    status["last_message"] = message
    status["updated_at"] = now_iso()

    if tool != "":
        try:
            status["active_tool"] = int(tool)
        except ValueError:
            status["active_tool"] = tool

        for t in tools_data.get("tools", []):
            if str(t.get("id")) == str(tool):
                if state:
                    t["state"] = state
                if spool_id:
                    try:
                        t["spool_id"] = int(spool_id)
                    except ValueError:
                        t["spool_id"] = spool_id
                if mdm_state:
                    t["mdm_state"] = mdm_state
                if filament_mm:
                    try:
                        t["filament_mm"] = float(filament_mm)
                    except ValueError:
                        t["filament_mm"] = filament_mm
                t["last_update"] = now_iso()

    write_json(DATA_DIR / "status.json", status)
    write_json(DATA_DIR / "history.json", history)
    write_json(DATA_DIR / "tools.json", tools_data)

    return {"ok": True, "event": event_row}


class BTCHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)

    def send_json(self, data, code=200):
        payload = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(payload)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(payload)

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/health":
            self.send_json({"ok": True, "time": now_iso()})
            return

        if parsed.path == "/api/status":
            self.send_json(load_dashboard_state())
            return

        if parsed.path == "/api/event":
            params = parse_qs(parsed.query)
            self.send_json(record_event(params))
            return

        if parsed.path == "/":
            self.path = "/index.html"

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/event":
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length).decode("utf-8") if length else ""

            try:
                data = json.loads(body) if body else {}
                params = {k: [str(v)] for k, v in data.items()}
            except Exception:
                params = parse_qs(body)

            self.send_json(record_event(params))
            return

        self.send_json({"ok": False, "error": "Unknown POST endpoint"}, 404)


if __name__ == "__main__":
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    os.chdir(BASE_DIR)
    print(f"BTC Filament Dashboard running on port {PORT}")
    print(f"Serving from: {BASE_DIR}")
    server = ThreadingHTTPServer(("0.0.0.0", PORT), BTCHandler)
    server.serve_forever()
