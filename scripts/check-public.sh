#!/bin/sh
# Managed copy. Master: potatoflow/shared/scripts/ (edit there, then run ./sync-shared.sh).
#
# Leak scan for a PUBLIC repository. Run from the repo root:  sh scripts/check-public.sh
# Exit 0 = nothing found, 1 = findings (printed as FILE:LINE: reason, never the matched text, so the
# scan does not copy a secret into a log). Also run by the pre-commit hook when this file exists.
#
# It looks at tracked and untracked files that git does not ignore (or every file, outside git) and flags:
#   - file types that carry source, data or secrets (.map .wasm .svelte .rs databases, keys, state, archives)
#   - private keys, GitHub tokens, cloud resource identifiers, public IPv4 addresses
#   - names of, or relative paths to, the private repositories
#   - database schema statements (a schema is design detail)
#   - workflow rules: upload-artifact, pull_request_target, set -x, printenv
#   - files over 1 MB
# A match is a reason to look, not proof. It cannot see history already pushed, nor judge prose.
# POSIX sh and grep only.

set -u

self="scripts/check-public.sh"
found=0

report() { printf 'FOUND   %s\n' "$1"; found=$((found + 1)); }

if [ -d .git ] || [ -f .git ]; then
  files=$(git ls-files -co --exclude-standard 2>/dev/null)
else
  files=$(find . -type f -not -path './node_modules/*' -not -path './logs/*' -not -path './.git/*' | sed 's#^\./##')
fi

[ -n "$files" ] || { echo "OK      no files to scan"; exit 0; }

# 1. File types
printf '%s\n' "$files" | while IFS= read -r f; do
  [ -f "$f" ] || continue
  case "$f" in
    *.map|*.wasm|*.svelte|*.rs|*.sqlite|*.sqlite3|*.db|*.pem|*.key|*.p12|*.pfx|*.tfstate|*.tfstate.*|\
    *.tar|*.tar.gz|*.tgz|*.tar.br|*.zip|*.br|.env|.env.*)
      case "$f" in .env.example) ;; *) echo "FILETYPE $f"; ;; esac ;;
  esac
  size=$(wc -c < "$f" 2>/dev/null | tr -d ' ')
  [ "${size:-0}" -gt 1048576 ] && echo "BIGFILE $f"
done > /tmp/check-public.$$ 2>/dev/null
while IFS= read -r line; do
  kind=${line%% *}; path=${line#* }
  case "$kind" in
    FILETYPE) report "$path: file type that must not be in a public repo" ;;
    BIGFILE)  report "$path: larger than 1 MB (built output or data?)" ;;
  esac
done < /tmp/check-public.$$
rm -f /tmp/check-public.$$

# 2. Content patterns. scan <label> <regex> [only-paths-matching-this-case-glob]
scan() {
  label=$1; regex=$2; only=${3:-}
  printf '%s\n' "$files" | while IFS= read -r f; do
    [ -f "$f" ] || continue
    [ "$f" != "$self" ] || continue
    if [ -n "$only" ]; then
      # shellcheck disable=SC2254
      case "$f" in $only) ;; *) continue ;; esac
    fi
    case "$f" in package-lock.json|*.png|*.jpg|*.jpeg|*.gif|*.ico|*.woff|*.woff2) continue ;; esac
    grep -nIE -e "$regex" "$f" 2>/dev/null | cut -d: -f1 | while IFS= read -r n; do
      echo "$f:$n: $label"
    done
  done
}

out=$(
  scan "private key block" '-----BEGIN [A-Z ]*PRIVATE KEY-----'
  scan "GitHub token" '(ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}'
  scan "cloud resource identifier (ocid)" 'ocid1\.[a-z]+\.'
  scan "IPv4 address (only loopback, 0.0.0.0 and documentation ranges are allowed)" \
    '(^|[^0-9.])([0-9]{1,3}\.){3}[0-9]{1,3}([^0-9.]|$)'
  scan "name of a private repository" 'potatoflow-(app|workspace|test-logs)'
  scan "path into a sibling private repository" '(^|[^A-Za-z0-9_.-])\.\./(app|test-logs)([^A-Za-z0-9_-]|$)'
  scan "database schema statement" 'CREATE[[:space:]]+(TABLE|TRIGGER|VIEW|UNIQUE[[:space:]]+INDEX)'
  scan "workflow uses upload-artifact" 'actions/upload-artifact' '.github/workflows/*'
  scan "workflow uses pull_request_target" 'pull_request_target' '.github/workflows/*'
  scan "shell tracing (set -x)" 'set[[:space:]]+-[a-z]*x' '.github/workflows/*'
  scan "dumps the environment" '(^|[^A-Za-z_])(printenv|env[[:space:]]*\|)' '.github/workflows/*'
)

# IPv4 matches that are allowed: drop lines whose only address is loopback / 0.0.0.0 / doc ranges / version-like.
# (The IPv4 regex cannot tell a version string from an address, so every hit is re-checked here.)
filtered=$(printf '%s\n' "$out" | while IFS= read -r line; do
  [ -n "$line" ] || continue
  case "$line" in
    *"IPv4 address"*)
      f=${line%%:*}; rest=${line#*:}; n=${rest%%:*}
      text=$(sed -n "${n}p" "$f")
      real=$(printf '%s\n' "$text" | grep -oE '([0-9]{1,3}\.){3}[0-9]{1,3}' \
        | grep -vE '^(127\.0\.0\.1|0\.0\.0\.0|192\.0\.2\.[0-9]+|198\.51\.100\.[0-9]+|203\.0\.113\.[0-9]+)$' \
        | awk -F. '$1<=255&&$2<=255&&$3<=255&&$4<=255 && !($1==0)' | head -n 1)
      [ -n "$real" ] && echo "$line"
      ;;
    *) echo "$line" ;;
  esac
done)

if [ -n "$filtered" ]; then
  printf '%s\n' "$filtered" | while IFS= read -r l; do printf 'FOUND   %s\n' "$l"; done
  found=$((found + $(printf '%s\n' "$filtered" | grep -c .)))
fi

if [ "$found" -gt 0 ]; then
  echo "BLOCKED $found finding(s). This repository is public: remove or move them, do not commit around this check."
  exit 1
fi
echo "OK      public-repo scan found nothing"
exit 0
