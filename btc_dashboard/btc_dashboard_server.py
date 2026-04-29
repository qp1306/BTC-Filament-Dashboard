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

DEFAULT_SPOOLS = {
    "0": {"id": 100, "material": "PLA", "color": "White", "hex": "#f5f5f5", "total_m": 400, "remaining_m": 312, "g_per_m": 2.955},
    "1": {"id": 101, "material": "ABS", "color": "Black", "hex": "#050505", "total_m": 400, "remaining_m": 198, "g_per_m": 2.55},
    "2": {"id": 102, "material": "PETG", "color": "Orange", "hex": "#ff9632", "total_m": 400, "remaining_m": 286, "g_per_m": 3.05},
    "3": {"id": 103, "material": "TPU95A", "color": "Clear", "hex": "#aeb4b8", "total_m": 400, "remaining_m": 324, "g_per_m": 2.91},
    "4": {"id": 104, "material": "PLA", "color": "Blue", "hex": "#199ce8", "total_m": 400, "remaining_m": 150, "g_per_m": 2.967},
    "5": {"id": 105, "material": "PLA", "color": "Red", "hex": "#ff3030", "total_m": 400, "remaining_m": 98, "g_per_m": 2.959},
}


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


def to_num(value, fallback=None):
    try:
        if value == "" or value is None:
            return fallback
        if isinstance(value, str) and "." not in value:
            return int(value)
        return float(value)
    except Exception:
        return fallback


def make_default_tools():
    tools = []
    for i in range(6):
        sp = DEFAULT_SPOOLS[str(i)]
        tools.append({
            "id": i,
            "state": "ready",
            "mdm_sensor": f"T{i}",
            "mdm_state": "idle",
            "spool_id": sp["id"],
            "filament_mm": round((sp["total_m"] - sp["remaining_m"]) * 1000, 1),
            "last_update": "",
        })
    return tools


def normalise_state(status, tools_data, spools_data):
    tools = tools_data.setdefault("tools", [])
    by_id = {str(t.get("id")): t for t in tools if "id" in t}

    for i in range(6):
        sid = str(i)
        if sid not in by_id:
            tools.append(make_default_tools()[i])
            by_id[sid] = tools[-1]
        t = by_id[sid]
        t.setdefault("id", i)
        t.setdefault("state", "ready")
        t.setdefault("mdm_sensor", f"T{i}")
        t.setdefault("mdm_state", "idle")
        t.setdefault("spool_id", DEFAULT_SPOOLS[sid]["id"])
        t.setdefault("filament_mm", round((DEFAULT_SPOOLS[sid]["total_m"] - DEFAULT_SPOOLS[sid]["remaining_m"]) * 1000, 1))

    active = status.get("active_tool")
    if active in (None, ""):
        active = 0
        status["active_tool"] = 0

    for t in tools:
        tid = str(t.get("id"))
        if tid == str(active):
            t["state"] = "active"
            if str(t.get("mdm_state", "")).lower() in ("", "idle", "ready", "active"):
                t["mdm_state"] = "moving" if status.get("printing", False) else "idle"
        elif str(t.get("state", "")).lower() in ("active", "moving", "printing"):
            t["state"] = "ready"
            if str(t.get("mdm_state", "")).lower() in ("active", "moving", "printing"):
                t["mdm_state"] = "idle"

    spools = spools_data.setdefault("spools", {})
    for i in range(6):
        spools.setdefault(str(i), DEFAULT_SPOOLS[str(i)].copy())
        spools.setdefault(str(DEFAULT_SPOOLS[str(i)]["id"]), DEFAULT_SPOOLS[str(i)].copy())

    status.setdefault("progress", 16)
    status.setdefault("layer", "42 / 256")
    status.setdefault("printing_time", "02:14:37")
    status.setdefault("print_rate_mms", 6.2)
    status.setdefault("this_print_m", 14.8)
    status.setdefault("print_state", "idle")

    return status, tools_data, spools_data


def load_dashboard_state():
    config = read_json(DATA_DIR / "config.json", {})
    tools = read_json(DATA_DIR / "tools.json", {"tools": make_default_tools()})
    spools = read_json(DATA_DIR / "spools.json", {"spools": {}})
    history = read_json(DATA_DIR / "history.json", {"events": []})
    status = read_json(DATA_DIR / "status.json", {})
    status, tools, spools = normalise_state(status, tools, spools)

    return {
        "ok": True,
        "updated_at": now_iso(),
        "config": config,
        "tools": tools.get("tools", []),
        "spools": spools.get("spools", {}),
        "history": history.get("events", []),
        "status": status,
    }


def get_param(params, name, default=""):
    return params.get(name, [default])[0]


def set_tool_active(status, tools_data, tool):
    if tool == "":
        return
    tid = to_num(tool, tool)
    status["active_tool"] = tid
    for t in tools_data.get("tools", []):
        if str(t.get("id")) == str(tool):
            t["state"] = "active"
            t["mdm_state"] = "moving" if status.get("printing", False) else "idle"
            t["last_update"] = now_iso()
        elif str(t.get("state", "")).lower() in ("active", "moving", "printing"):
            t["state"] = "ready"
            if str(t.get("mdm_state", "")).lower() in ("active", "moving", "printing"):
                t["mdm_state"] = "idle"


def update_tool(tools_data, tool, state="", mdm_state="", spool_id="", filament_mm=""):
    if tool == "":
        return
    for t in tools_data.get("tools", []):
        if str(t.get("id")) == str(tool):
            if state:
                t["state"] = state
            if mdm_state:
                t["mdm_state"] = mdm_state
            if spool_id:
                t["spool_id"] = to_num(spool_id, spool_id)
            if filament_mm:
                t["filament_mm"] = to_num(filament_mm, filament_mm)
            t["last_update"] = now_iso()
            return


def mark_all_tools_idle_except_active(status, tools_data):
    active = status.get("active_tool")
    for t in tools_data.get("tools", []):
        if str(t.get("id")) == str(active):
            t["state"] = "active"
            t["mdm_state"] = "idle"
        else:
            if str(t.get("state", "")).lower() in ("active", "moving", "printing"):
                t["state"] = "ready"
            if str(t.get("mdm_state", "")).lower() in ("active", "moving", "printing"):
                t["mdm_state"] = "idle"
        t["last_update"] = now_iso()


def record_event(params):
    tool = get_param(params, "tool")
    old_tool = get_param(params, "old_tool")
    new_tool = get_param(params, "new_tool")
    event = get_param(params, "event", "manual")
    state = get_param(params, "state")
    message = get_param(params, "message")
    spool_id = get_param(params, "spool_id")
    mdm_state = get_param(params, "mdm_state")
    filament_mm = get_param(params, "filament_mm")

    status = read_json(DATA_DIR / "status.json", {})
    history = read_json(DATA_DIR / "history.json", {"events": []})
    tools_data = read_json(DATA_DIR / "tools.json", {"tools": make_default_tools()})
    spools_data = read_json(DATA_DIR / "spools.json", {"spools": {}})
    status, tools_data, spools_data = normalise_state(status, tools_data, spools_data)

    event_l = event.lower()
    state_l = state.lower()

    if event_l in ("print_start", "print_started", "start"):
        status["printing"] = True
        status["print_state"] = "printing"
        status["progress"] = 0
        status["layer"] = "0 / 0"
        status["printing_time"] = "00:00:00"
        status["print_rate_mms"] = 0
        status["this_print_m"] = 0
        status["print_start_time"] = now_iso()
        if tool != "":
            status["active_tool"] = to_num(tool, tool)
        mark_all_tools_idle_except_active(status, tools_data)

    elif event_l in ("print_end", "print_complete", "complete", "completed"):
        status["printing"] = False
        status["print_state"] = "complete"
        status["progress"] = 100
        status["print_rate_mms"] = 0
        status["print_end_time"] = now_iso()
        mark_all_tools_idle_except_active(status, tools_data)

    elif event_l in ("print_cancel", "print_cancelled", "cancel", "cancelled"):
        status["printing"] = False
        status["print_state"] = "cancelled"
        status["print_rate_mms"] = 0
        status["print_end_time"] = now_iso()
        mark_all_tools_idle_except_active(status, tools_data)

    if old_tool != "":
        update_tool(tools_data, old_tool, "ready", "idle")
    if new_tool != "":
        set_tool_active(status, tools_data, new_tool)
        tool = new_tool

    if tool != "" and event_l not in ("print_start", "print_started", "start", "print_end", "print_complete", "complete", "completed", "print_cancel", "print_cancelled", "cancel", "cancelled"):
        if event_l in ("pickup", "toolchange", "toolchange_done", "active") or state_l in ("active", "moving", "printing"):
            set_tool_active(status, tools_data, tool)
        elif event_l in ("dropoff", "docked", "standby") or state_l in ("ready", "standby", "idle"):
            update_tool(tools_data, tool, "ready", "idle", spool_id, filament_mm)
            if str(status.get("active_tool")) == str(tool):
                status["active_tool"] = None
        else:
            update_tool(tools_data, tool, state, mdm_state, spool_id, filament_mm)

    # Optional print/dashboard fields from Klipper.
    for key in ("progress", "layer", "printing_time", "print_rate_mms", "this_print_m", "print_start_m"):
        val = get_param(params, key)
        if val != "":
            status[key] = to_num(val, val)

    status["last_event"] = event
    status["last_message"] = message
    status["updated_at"] = now_iso()

    event_row = {
        "time": now_iso(),
        "tool": tool,
        "old_tool": old_tool,
        "new_tool": new_tool,
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

    write_json(DATA_DIR / "status.json", status)
    write_json(DATA_DIR / "history.json", history)
    write_json(DATA_DIR / "tools.json", tools_data)
    write_json(DATA_DIR / "spools.json", spools_data)
    return {"ok": True, "event": event_row, "status": status}


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
            self.send_json(record_event(parse_qs(parsed.query)))
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
    ThreadingHTTPServer(("0.0.0.0", PORT), BTCHandler).serve_forever()
