---
name: launch
description: Pre-launch gate. Runs the full pre-launch checklist.
---

# Launch Command

Use the `auditor` agent with the `pre-launch-checklist` skill.

Do not mark launch as ready until all CRITICAL and FAIL items are resolved.

## Output

Produce a summary at the end:

```
LAUNCH READY: YES / NO
Blocking issues: <count>
Warnings: <count>
```
