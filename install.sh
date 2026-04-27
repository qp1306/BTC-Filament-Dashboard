#!/usr/bin/env bash
set -e

BASE="$HOME/printer_data/config/btc2/features"
DASH="$BASE/btc_dashboard"
DATA="$DASH/data"
PORT=7131

mkdir -p "$DATA"

fetch() {
  curl -fsSL "https://raw.githubusercontent.com/qp1306/BTC-Filament-Dashboard/main/$1"
}

echo "Installing BTC Filament Dashboard..."

# Core files
fetch btc_dashboard/btc_dashboard_server.py > "$DASH/btc_dashboard_server.py"
fetch btc_dashboard/index.html > "$DASH/index.html"
fetch btc_dashboard/style.css > "$DASH/style.css"
fetch btc_dashboard/app.js > "$DASH/app.js"

# Data (only if missing so your live data is not wiped on update)
[ ! -f "$DATA/config.json" ] && fetch btc_dashboard/data/config.json > "$DATA/config.json"
[ ! -f "$DATA/tools.json" ] && fetch btc_dashboard/data/tools.json > "$DATA/tools.json"
[ ! -f "$DATA/spools.json" ] && fetch btc_dashboard/data/spools.json > "$DATA/spools.json"
[ ! -f "$DATA/history.json" ] && fetch btc_dashboard/data/history.json > "$DATA/history.json"
[ ! -f "$DATA/status.json" ] && fetch btc_dashboard/data/status.json > "$DATA/status.json"

# Klipper include + shell event bridge
fetch klipper/btc_filament_dashboard.cfg > "$BASE/btc_filament_dashboard.cfg"
fetch klipper/btc_dash_event.sh > "$DASH/btc_dash_event.sh"

chmod +x "$DASH/btc_dashboard_server.py"
chmod +x "$DASH/btc_dash_event.sh"

# systemd service
sudo tee /etc/systemd/system/btc-dashboard.service >/dev/null <<EOF
[Unit]
Description=BTC Filament Dashboard
After=network.target

[Service]
User=$USER
WorkingDirectory=$DASH
ExecStart=/usr/bin/python3 $DASH/btc_dashboard_server.py
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable btc-dashboard.service
sudo systemctl restart btc-dashboard.service

echo "\nInstall complete"
echo "Open: http://$(hostname -I | awk '{print $1}'):$PORT"
echo "Klipper include: $BASE/btc_filament_dashboard.cfg"
echo "Event bridge: $DASH/btc_dash_event.sh"
