# Linux Fundamentals for DevOps — Learning Summary

- **Filesystem navigation** — moving around confidently (`pwd`, `cd`, `ls`, `find`, `du`, `df`)
  is the base skill everything else depends on.
- **Permissions** — reading `ls -l` output, `chmod` (symbolic + octal), `chown`, and why
  `./script.sh` fails with "Permission denied" until it's executable.
- **Users & groups** — `/etc/passwd`, `/etc/group`, `useradd`/`usermod`/`groupadd`, and
  preferring group membership over loosening permissions to `777`.
- **Process management** — inspecting with `ps`/`top`, stopping gracefully with `kill -15`
  before escalating to `kill -9`, and managing real services via `systemctl` instead of
  raw `kill`.
- **Package management** — `apt`/`dnf` workflows, always updating the index before installing.
- **Shell scripting** — `set -euo pipefail`, option parsing with `while`/`case`, functions,
  loops, and exit codes.
- **Hands-on task** — `health-check.sh` ties all of this together: it parses `--threshold`/
  `--log` flags, reads disk (`df`), memory (`free`), CPU load (`/proc/loadavg`, `nproc`), and
  top processes (`ps`), flags anything over threshold, and logs the report with `tee -a`.

## How `health-check.sh` Works

This is the hands-on script that ties the topics above together. It reports disk,
memory, and CPU usage plus the top memory-consuming processes, and flags anything
over a configurable threshold. Walkthrough by section:

**1. Safety flags**
```bash
set -euo pipefail
```
`-e` stops the script on the first error, `-u` errors on any undefined variable, and
`-o pipefail` fails a pipeline if any stage of it fails (not just the last one). This
means a problem is caught immediately instead of the script silently continuing with
bad data.

**2. Defaults and argument parsing**
```bash
THRESHOLD=80
LOGFILE="./health-check.log"
```
followed by a `while [[ $# -gt 0 ]]; do case "$1" in ... esac done` loop that reads
`--threshold N` and `--log FILE` from the command line, and `-h`/`--help` to print
usage. This lets the script run with sensible defaults but be reconfigured per
environment without editing the file — e.g. a stricter threshold in production.

**3. Input validation**
```bash
if ! [[ "$THRESHOLD" =~ ^[0-9]+$ ]]; then
    echo "Error: --threshold must be a whole number, got '$THRESHOLD'" >&2
    exit 1
fi
```
Rejects a non-numeric `--threshold` early with a clear error, rather than failing
later with a confusing arithmetic error.

**4. The `report()` function** — builds the actual output, one metric at a time:
- **Disk usage:** `df -h --output=target,pcent | tail -n +2` gets each mount point and
  its use percentage (skipping the header row with `tail -n +2`). A `while read` loop
  strips the `%` sign and compares the number against `$THRESHOLD`, printing
  `WARNING:` or `OK:` per mount.
- **Memory usage:** `free -m` reports memory in MB; `awk '/^Mem:/{print $2}'` and
  `$3` pull out total and used MB. A plain arithmetic expression
  (`100 * mem_used / mem_total`) turns that into a percentage.
- **CPU load:** reads the 1-minute load average from `/proc/loadavg` with
  `cut -d ' ' -f1`, divides it by core count (`nproc`) using `awk`, and multiplies by
  100 to express load as "percent of capacity" — a load of `1.0` on a single core
  means fully busy, so normalizing by core count makes it comparable to disk/memory
  percentages on the same threshold.
- **Top processes:** `ps -eo pid,comm,%mem --sort=-%mem | head -n 6` lists PID,
  command, and memory percent, sorted descending, showing the header plus the top 5.

**5. Timestamped, dual-destination logging**
```bash
report | tee -a "$LOGFILE"
```
`tee -a` prints the report to the terminal and appends it to the log file in one
step, so a run is visible immediately and also kept for later trend review (e.g. via
`tail -n 20 health-check.log` or a cron job appending every 15 minutes).

**Why this matters:** the script is a small, self-contained example of the same
pattern used by real monitoring tools (Nagios, Zabbix, Prometheus alerting) —
compute a value, compare it to a threshold, emit a different severity, and log it —
built entirely from standard Linux utilities rather than a monitoring framework.

## Command Quick-Reference

### `find` — search the filesystem
```bash
find /var/log -name "*.log"          # by name
find . -mtime -1                     # modified in last 1 day
find . -size +100M                   # larger than 100MB
find . -type f -exec chmod 644 {} \; # run a command on each match
```
Key flags: `-name`, `-type f/d`, `-mtime`, `-size`, `-exec`

### `grep` — search text
```bash
grep -i "error" app.log       # case-insensitive
grep -r "TODO" src/           # recursive
grep -n "def " file.py        # show line numbers
grep -v "debug" app.log       # invert match (exclude)
grep -c "error" app.log       # count matches
```
Key flags: `-i`, `-r`, `-n`, `-v`, `-c`, `-E` (extended regex)

### `sed` — stream editor
```bash
sed 's/foo/bar/' file.txt        # replace first match per line
sed 's/foo/bar/g' file.txt       # replace all matches
sed -i 's/foo/bar/g' file.txt    # edit file in place
sed -n '5,10p' file.txt          # print lines 5-10
```
Key flags: `-i` (in-place), `-n` (suppress auto-print), `-e` (multiple expressions)

### `awk` — pattern-based text processing
```bash
awk '{print $1}' file.txt              # print first column
awk -F',' '{print $2}' file.csv        # custom delimiter
awk '/Mem:/{print $2}' <<< "$(free -m)" # match pattern then print field
awk '{sum+=$3} END{print sum}' file    # sum a column
```
Key flags: `-F` (field separator), `-v` (pass variable)

### `sort` — sort lines
```bash
sort file.txt              # alphabetical
sort -n file.txt           # numeric
sort -r file.txt           # reverse
sort -k2 file.txt          # sort by 2nd column
sort -u file.txt           # sort + dedupe
```
Key flags: `-n`, `-r`, `-k`, `-u`

### `uniq` — filter duplicate lines (needs sorted input)
```bash
sort file.txt | uniq          # remove adjacent duplicates
sort file.txt | uniq -c       # count occurrences
sort file.txt | uniq -d       # show only duplicates
```
Key flags: `-c` (count), `-d` (duplicates only), `-u` (unique only)

### `cut` — extract columns
```bash
cut -d',' -f1,3 file.csv    # fields 1 and 3, comma-delimited
cut -d: -f1 /etc/passwd     # usernames
cut -c1-5 file.txt          # first 5 characters of each line
```
Key flags: `-d` (delimiter), `-f` (field), `-c` (character range)

### `xargs` — build commands from input
```bash
find . -name "*.tmp" | xargs rm          # delete matched files
echo "a b c" | xargs -n1 echo            # one arg per line
find . -name "*.log" | xargs -I{} mv {} archive/
```
Key flags: `-n` (args per command), `-I` (placeholder), `-P` (parallel)

### `wc` — count lines/words/bytes
```bash
wc -l file.txt      # line count
wc -w file.txt      # word count
wc -c file.txt      # byte count
```
Key flags: `-l`, `-w`, `-c`

### `head` / `tail` — view start/end of a file
```bash
head -n 20 file.log      # first 20 lines
tail -n 20 file.log      # last 20 lines
tail -f file.log         # follow (live updates, e.g. logs)
```
Key flags: `-n` (line count), `-f` (follow)

### `less` — page through a file
```bash
less file.log
# inside less: /pattern to search, n for next match, q to quit
```
Key flags: `-N` (show line numbers), `-S` (no line wrap)

### `cat` — print/concatenate files
```bash
cat file.txt                 # print whole file
cat file1 file2 > merged.txt # concatenate
cat -n file.txt               # with line numbers
```
Key flags: `-n` (number lines), `-A` (show hidden/special chars)

### `tee` — write output to a file and stdout at once
```bash
echo "hello" | tee out.txt        # overwrite
report | tee -a health-check.log  # append (used in health-check.sh)
```
Key flags: `-a` (append)

### `chmod` — change permissions
```bash
chmod +x script.sh       # add execute for everyone
chmod 755 script.sh       # owner rwx, group/others rx
chmod -R 644 configs/     # recursive
```
Key flags: `-R` (recursive), `+/-` (add/remove), octal mode (e.g. `755`)

### `chown` — change ownership
```bash
chown alice file.txt          # change owner
chown alice:deploy file.txt   # change owner and group
chown -R alice:deploy app/    # recursive
```
Key flags: `-R` (recursive)

### `tar` — archive files
```bash
tar -czvf backup.tar.gz dir/   # create gzip archive
tar -xzvf backup.tar.gz        # extract gzip archive
tar -tvf backup.tar.gz         # list contents without extracting
```
Key flags: `-c` (create), `-x` (extract), `-z` (gzip), `-v` (verbose), `-f` (file), `-t` (list)

### `du` — disk usage of files/directories
```bash
du -sh *          # size of each item in current dir, human-readable
du -sh dir/        # total size of one directory
du -ah dir/ | sort -rh | head    # biggest files/dirs first
```
Key flags: `-s` (summary), `-h` (human-readable), `-a` (include files, not just dirs)

### `df` — disk space per filesystem
```bash
df -h                          # human-readable, all mounts
df -h --output=target,pcent    # just mount point + usage % (used in health-check.sh)
```
Key flags: `-h` (human-readable), `--output` (choose columns)

### `ps` — snapshot of running processes
```bash
ps aux                                    # all processes, full detail
ps -eo pid,comm,%mem,%cpu --sort=-%mem    # custom columns sorted by memory
```
Key flags: `-e` (all processes), `-o` (custom columns), `--sort`
