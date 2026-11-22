---
name: run-and-log
description: Run any long or noisy command (build, test suite, size build, benchmark) while capturing full output to logs/ so results are read from a file, not a truncated terminal buffer. Use before reporting results or writing a journal entry.
---

<!-- Managed copy. Do not edit here; edit the master and re-run the sync script. -->

# Run and Log

Terminal buffers truncate (about 16 KB), permanently losing early output. The log file is the
single source of truth for results.

## Rule

Never run a build, test suite, or benchmark without capturing its full output to `logs/`.
Short, quiet commands (`git status`, `ls`) are exempt.

## Log file naming

```
logs/YYYY-MM-DD-{task}-run{N}.log
```

- `{task}`: short kebab-case name, e.g. `full-build`, `unit-tests`, `size-budget`.
- `{N}`: starts at 1, incremented per re-run of the same task on the same day (list `logs/` first).

## Capture

Prefer redirecting to the file and then reading it, so the output is not duplicated in context:

```bash
mkdir -p logs
{command} > logs/YYYY-MM-DD-{task}-run{N}.log 2>&1; echo "exit=$?"
```

If the user wants to watch live, use `2>&1 | tee logs/...` and still read the summary from the file.
Always report the exit code. A pipe to `tee` hides the real exit status (use `set -o pipefail` or
check `PIPESTATUS`).

When using an agent terminal tool, also set a timeout and, for large output, read only the tail
of the file (`tail -n 60`) rather than the whole log.

## After the run

Extract results from the **file**:

```bash
tail -n 40 logs/{file}                                   # summary
grep -nE 'error|Error|FAIL|failed|panic|warning' logs/{file} | head -60
```

Adjust the patterns to the tool. For size budgets also record the measured number (`ls -l` or
`wc -c`) against the budget stated in `AGENTS.md`.

## Then

1. Add the command, log path and result to today's journal entry (skill `journal-entry`).
2. Never log secrets, key material or real customer data. If a command prints any, redact the
   file before keeping it and note it in the journal.
3. **Check the repo's visibility rules in `AGENTS.md` before committing a log.**
   - Private repository (default): commit logs with the change they verify, as part of the same
     subject or a `[Docs]` subject, unless they contain environment secrets.
   - Public repository: `logs/` stays local and gitignored. Never commit or paste log content into
     journals, commits or PR text; put only counts and conclusions in the journal.
