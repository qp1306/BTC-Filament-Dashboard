# BTC Filament Dashboard

A lightweight web dashboard for a BTC toolchanger setup using MDM filament sensors for T0-T5.

Installs into:

```text
~/printer_data/config/btc2/features/btc_dashboard/
~/printer_data/config/btc2/features/btc_filament_dashboard.cfg
```

Dashboard port:

```text
7131
```

## One-line install

```bash
curl -fsSL https://raw.githubusercontent.com/qp1306/BTC-Filament-Dashboard/main/install.sh | bash
```

Then open:

```text
http://YOUR_PRINTER_IP:7131
```

## What this first version does

- Creates the dashboard folder under `/config/btc2/features`
- Adds a small Python web server
- Adds `index.html`, `style.css`, and `app.js`
- Creates runtime JSON files for T0-T5
- Creates a Klipper include file
- Creates a `btc-dashboard.service` systemd service
- Preserves runtime JSON data when reinstalled

## Klipper include

Add this to your printer config include stack when ready:

```ini
[include btc2/features/btc_filament_dashboard.cfg]
```

## Useful commands

```bash
sudo systemctl status btc-dashboard.service --no-pager
sudo systemctl restart btc-dashboard.service
journalctl -u btc-dashboard.service -n 100 --no-pager
```

## Current project stage

Base dashboard pack is ready. Next stage is live Spoolman integration and BTC tool-change hooks.
