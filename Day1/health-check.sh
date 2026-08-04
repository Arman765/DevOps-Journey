#!/usr/bin/env bash
# health-check.sh - reports disk, memory, CPU load and top processes,
# flagging anything that crosses a threshold.
# Usage: ./health-check.sh [--threshold N] [--log /path/to/file]

set -euo pipefail

THRESHOLD=80
LOGFILE="./health-check.log"

usage() {
    cat <<EOF
Usage: $0 [--threshold N] [--log FILE]

  --threshold N   Warn when disk/memory/CPU usage is >= N percent (default: 80)
  --log FILE      Append the report to FILE (default: ./health-check.log)
  -h, --help      Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --threshold)
            [[ $# -ge 2 ]] || { echo "Error: --threshold requires a value" >&2; exit 1; }
            THRESHOLD="$2"
            shift 2
            ;;
        --log)
            [[ $# -ge 2 ]] || { echo "Error: --log requires a value" >&2; exit 1; }
            LOGFILE="$2"
            shift 2
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            echo "Unknown option: $1" >&2
            usage
            exit 1
            ;;
    esac
done

if ! [[ "$THRESHOLD" =~ ^[0-9]+$ ]]; then
    echo "Error: --threshold must be a whole number, got '$THRESHOLD'" >&2
    exit 1
fi

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

report() {
    echo "Health Check Report - $TIMESTAMP"
    echo "Threshold: ${THRESHOLD}%"

    echo
    echo "--- Disk Usage ---"
    # skip the header row, read each mount + its use percentage
    df -h --output=target,pcent | tail -n +2 | while read -r mount pcent; do
        pcent_num=${pcent%\%}
        if (( pcent_num >= THRESHOLD )); then
            echo "WARNING: disk usage on $mount is ${pcent} (threshold ${THRESHOLD}%)"
        else
            echo "OK: disk usage on $mount is ${pcent}"
        fi
    done

    echo
    echo "--- Memory Usage ---"
    mem_total=$(free -m | awk '/^Mem:/{print $2}')
    mem_used=$(free -m | awk '/^Mem:/{print $3}')
    mem_pcent=$(( 100 * mem_used / mem_total ))
    if (( mem_pcent >= THRESHOLD )); then
        echo "WARNING: memory usage is ${mem_pcent}% (${mem_used}MB / ${mem_total}MB), threshold ${THRESHOLD}%"
    else
        echo "OK: memory usage is ${mem_pcent}% (${mem_used}MB / ${mem_total}MB)"
    fi

    echo
    echo "--- CPU Load ---"
    cpu_cores=$(nproc)
    load1=$(cut -d ' ' -f1 /proc/loadavg)
    load_pcent=$(awk -v core_load="$load1" -v cores="$cpu_cores" 'BEGIN{printf "%.0f", (core_load/cores)*100}')
    if (( load_pcent >= THRESHOLD )); then
        echo "WARNING: CPU load is ${load_pcent}% of capacity (1-min load ${load1} across ${cpu_cores} cores), threshold ${THRESHOLD}%"
    else
        echo "OK: CPU load is ${load_pcent}% of capacity (1-min load ${load1} across ${cpu_cores} cores)"
    fi

    echo
    echo "--- Top 5 Processes by Memory ---"
    ps -eo pid,comm,%mem --sort=-%mem | head -n 6
}

report | tee -a "$LOGFILE"
