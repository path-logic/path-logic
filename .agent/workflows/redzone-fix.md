---
description:
---

# Workflow: Red Zone Remediation (/redzone-fix)

1. **Reference Audit:** Load docs/reports/AUDIT_RESULTS.md.
2. **Isolate Logic:** Move leaked UI logic from Core to App/Adapter layer.
3. **Secure I/O:** Enforce EncryptionService on all raw writes.
4. **Verify:** Run Vitest; do not commit unless tests pass.
