# Shell Scripting — Basic to Intermediate Examples

## Basics

### Variables and command substitution
```bash
name="server1"
today=$(date '+%Y-%m-%d')
count=$(wc -l < file.txt)
echo "$name checked on $today, $count lines"
```

### Reading user input
```bash
read -p "Enter environment (dev/staging/prod): " env
echo "Deploying to $env"
```

### Conditionals
```bash
if [[ -f "$1" ]]; then
    echo "File exists"
elif [[ -d "$1" ]]; then
    echo "It's a directory"
else
    echo "Not found"
fi
```
Common test operators: `-f` file, `-d` dir, `-z` empty string, `-n` non-empty,
`-eq`/`-ne`/`-gt`/`-lt` numeric compare, `==`/`!=` string compare.

### Loops
```bash
# for loop over files
for f in *.log; do
    echo "Processing $f"
done

# for loop over a range
for i in {1..5}; do
    echo "Attempt $i"
done

# while loop
count=0
while (( count < 3 )); do
    echo "count=$count"
    ((count++))
done
```

### Functions
```bash
greet() {
    local who="$1"
    echo "Hello, $who"
}
greet "Alice"
```
`local` keeps the variable scoped to the function, avoiding clashes with
script-level variables of the same name.

### Exit codes
```bash
grep -q "ERROR" app.log
if [[ $? -eq 0 ]]; then
    echo "Errors found"
fi

# more idiomatic: skip $? and test the command directly
if grep -q "ERROR" app.log; then
    echo "Errors found"
fi
```
`0` means success, any non-zero means failure — check with `$?` or, better,
test the command directly in the `if`.

---

## Intermediate

### Parsing command-line flags
```bash
threshold=80
while [[ $# -gt 0 ]]; do
    case "$1" in
        --threshold) threshold="$2"; shift 2 ;;
        -h|--help) echo "usage: $0 [--threshold N]"; exit 0 ;;
        *) echo "unknown option: $1" >&2; exit 1 ;;
    esac
done
```

### Arrays
```bash
services=("nginx" "postgres" "redis")

for svc in "${services[@]}"; do
    systemctl is-active --quiet "$svc" && echo "$svc: up" || echo "$svc: down"
done

echo "Total services: ${#services[@]}"
```

### Associative arrays (maps)
```bash
declare -A ports
ports[nginx]=80
ports[postgres]=5432
ports[redis]=6379

for svc in "${!ports[@]}"; do
    echo "$svc listens on ${ports[$svc]}"
done
```

### String manipulation
```bash
path="/var/log/app.log"
echo "${path##*/}"      # app.log      (strip longest match from front)
echo "${path%/*}"       # /var/log     (strip shortest match from back)
name="${path##*/}"
echo "${name%.log}"     # app          (strip suffix)

version="v1.2.3"
echo "${version#v}"     # 1.2.3        (strip prefix)
```

### Case statements
```bash
case "$1" in
    start|up)   echo "Starting service" ;;
    stop|down)  echo "Stopping service" ;;
    restart)    echo "Restarting service" ;;
    *)          echo "Usage: $0 {start|stop|restart}"; exit 1 ;;
esac
```

### Error handling with `trap`
```bash
cleanup() {
    echo "Cleaning up temp files..."
    rm -f /tmp/myscript.$$
}
trap cleanup EXIT

echo "work" > /tmp/myscript.$$
# cleanup runs automatically on exit, even if the script errors out
```

### Reading a file line by line
```bash
while IFS= read -r line; do
    echo "Line: $line"
done < servers.txt
```
`IFS=` preserves leading/trailing whitespace, and `-r` prevents backslashes
from being interpreted — the standard-safe way to read a file line by line.

### Here-docs
```bash
cat <<EOF > config.yaml
environment: $env
threshold: $threshold
generated: $(date '+%Y-%m-%d')
EOF
```

### Combining commands with process substitution
```bash
diff <(sort file1.txt) <(sort file2.txt)
```
Runs both commands and feeds their output as if they were files, without
writing temporary files to disk.

### Arithmetic and formatted output
```bash
used=6980
total=8000
pct=$(( 100 * used / total ))
printf "Memory: %d%% (%d/%dMB)\n" "$pct" "$used" "$total"
```

### A small reusable pattern: retry with backoff
```bash
retry() {
    local attempts=3
    local delay=2
    local n=0
    until "$@"; do
        n=$((n + 1))
        if (( n >= attempts )); then
            echo "Failed after $attempts attempts" >&2
            return 1
        fi
        echo "Attempt $n failed, retrying in ${delay}s..."
        sleep "$delay"
        delay=$((delay * 2))
    done
}

retry curl -sf https://example.com/health
```

