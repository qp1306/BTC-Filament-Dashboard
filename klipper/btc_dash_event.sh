#!/usr/bin/env bash

# BTC Filament Dashboard event sender.
# Called by Klipper gcode_shell_command.
# Accepts simple key=value arguments, for example:
#   event=pickup tool=2 state=active mdm_state=moving message=on_carriage

URL="http://127.0.0.1:7131/api/event"

# Defaults
EVENT="manual"
TOOL=""
STATE=""
MESSAGE=""
SPOOL_ID=""
MDM_STATE=""
FILAMENT_MM=""
OLD_TOOL=""
NEW_TOOL=""
PROGRESS=""
LAYER=""
PRINTING_TIME=""
PRINT_RATE_MMS=""
THIS_PRINT_M=""
PRINT_START_M=""

for arg in "$@"; do
  key="${arg%%=*}"
  val="${arg#*=}"
  case "$key" in
    event|EVENT) EVENT="$val" ;;
    tool|TOOL) TOOL="$val" ;;
    state|STATE) STATE="$val" ;;
    message|MESSAGE) MESSAGE="$val" ;;
    spool_id|SPOOL_ID) SPOOL_ID="$val" ;;
    mdm_state|MDM_STATE) MDM_STATE="$val" ;;
    filament_mm|FILAMENT_MM) FILAMENT_MM="$val" ;;
    old_tool|OLD_TOOL) OLD_TOOL="$val" ;;
    new_tool|NEW_TOOL) NEW_TOOL="$val" ;;
    progress|PROGRESS) PROGRESS="$val" ;;
    layer|LAYER) LAYER="$val" ;;
    printing_time|PRINTING_TIME) PRINTING_TIME="$val" ;;
    print_rate_mms|PRINT_RATE_MMS) PRINT_RATE_MMS="$val" ;;
    this_print_m|THIS_PRINT_M) THIS_PRINT_M="$val" ;;
    print_start_m|PRINT_START_M) PRINT_START_M="$val" ;;
  esac
done

curl -fsS --max-time 1 -G "$URL" \
  --data-urlencode "event=${EVENT}" \
  --data-urlencode "tool=${TOOL}" \
  --data-urlencode "state=${STATE}" \
  --data-urlencode "message=${MESSAGE}" \
  --data-urlencode "spool_id=${SPOOL_ID}" \
  --data-urlencode "mdm_state=${MDM_STATE}" \
  --data-urlencode "filament_mm=${FILAMENT_MM}" \
  --data-urlencode "old_tool=${OLD_TOOL}" \
  --data-urlencode "new_tool=${NEW_TOOL}" \
  --data-urlencode "progress=${PROGRESS}" \
  --data-urlencode "layer=${LAYER}" \
  --data-urlencode "printing_time=${PRINTING_TIME}" \
  --data-urlencode "print_rate_mms=${PRINT_RATE_MMS}" \
  --data-urlencode "this_print_m=${THIS_PRINT_M}" \
  --data-urlencode "print_start_m=${PRINT_START_M}" \
  >/dev/null 2>&1 || true
