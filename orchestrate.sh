#!/usr/bin/env bash

# Hard stop on any error
set -e

# Configuration
AGENT_DIR=".agent"
RULES_DIR="$AGENT_DIR/rules"
WORKFLOWS_DIR="$AGENT_DIR/workflows"
REPORTS_DIR="docs/reports"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$AGENT_DIR/backups/plan_migration_$TIMESTAMP"

echo "🚀 Starting Path Logic Orchestrator Setup..."

# 1. PERMISSION & FS CHECK
if [ ! -w "." ]; then
    echo "❌ ERROR: Current directory is not writable. Are you in a Windows-mounted folder without metadata enabled?"
    exit 1
fi

# 2. CREATE DIRECTORIES
echo "📂 Creating directory structure..."
mkdir -p "$RULES_DIR" "$WORKFLOWS_DIR" "$REPORTS_DIR"

# 3. BACKUP EXISTING PLANS
if [ -d "plans" ] || [ -f "system-architecture.md" ]; then
    echo "🔍 Found existing plans. Moving to $BACKUP_DIR..."
    mkdir -p "$BACKUP_DIR"
    [ -f "system-architecture.md" ] && mv "system-architecture.md" "$BACKUP_DIR/" || true
    [ -d "plans" ] && mv plans/* "$BACKUP_DIR/" 2>/dev/null || true
fi

# 4. GENERATE FILES (Using Here-Docs for clean LF formatting)
echo "📝 Generating Rule: persona.md..."
cat << 'EOF' > "$RULES_DIR/persona.md"
# Path Logic: Principal Architect Persona
## Role
You are a Principal Architect at **Path Logic Finance**. You specialize in Hexagonal Architecture within Next.js 15+ and maintain a strict Local-First, encrypted-at-rest philosophy.
## Constraints
- **Hexagonal Boundary:** @pathlogic/core is pure TypeScript. No Next/React imports.
- **Privacy:** All persistence MUST pass through the EncryptionService Port.
EOF

echo "📝 Generating Rule: dod.md..."
cat << 'EOF' > "$RULES_DIR/dod.md"
# Path Logic: Definition of Done (DoD)
- [ ] No framework-specific imports in @pathlogic/core.
- [ ] Every storage write is wrapped in the EncryptionPort.
- [ ] Every modified UI component has a Storybook story.
- [ ] Vitest suite passes for the core domain.
EOF

echo "📝 Generating Workflow: audit-reality.md..."
cat << 'EOF' > "$WORKFLOWS_DIR/audit-reality.md"
# Workflow: System Reality Audit (/audit)
1. **Analyze Boundaries:** Check for Next.js leakage into packages/core.
2. **Review Persistence:** Verify storage adapters use the EncryptionPort.
3. **Check Storybook:** List UI components missing Stories.
4. **Report:** Generate docs/reports/AUDIT_RESULTS.md with Mermaid diagrams.
EOF

echo "📝 Generating Workflow: redzone-fix.md..."
cat << 'EOF' > "$WORKFLOWS_DIR/redzone-fix.md"
# Workflow: Red Zone Remediation (/fix)
1. **Reference Audit:** Load docs/reports/AUDIT_RESULTS.md.
2. **Isolate Logic:** Move leaked UI logic from Core to App/Adapter layer.
3. **Secure I/O:** Enforce EncryptionService on all raw writes.
4. **Verify:** Run Vitest; do not commit unless tests pass.
EOF

echo "✅ DONE! Structure verified."
ls -R .agent