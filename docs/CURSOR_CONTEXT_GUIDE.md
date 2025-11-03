# Cursor Context Configuration Guide

## Overview

This guide explains how Cursor AI maintains architectural context across the three-domain system (Frontend, Broker, Salesforce) when building features.

## Context Files Hierarchy

### 1. `.cursorrules` (Primary Rules File)
**Purpose**: Primary rules and standards that Cursor reads automatically
**Location**: Root directory
**Priority**: HIGH - Always loaded
**Content**:
- Project structure
- Code standards
- Deployment rules
- Critical patterns (Context ID, Session Management)
- Security rules

### 2. `CONTEXT.md` (Essential Architecture Patterns)
**Purpose**: Critical architectural decisions and patterns - condensed version
**Location**: Root directory
**Priority**: CRITICAL - Referenced by `.cursorrules`
**Content**:
- Context ID pattern (MOST IMPORTANT)
- Session management flow
- Three-domain responsibilities
- API endpoint patterns
- Security critical rules
- Common pitfalls

**When to Update**: When core architecture patterns change

### 3. Blueprint Documents (Reference)
**Purpose**: Detailed implementation guides
**Location**: `docs/`
**Priority**: MEDIUM - Referenced when needed
**Content**:
- `FORM_MANAGEMENT_BLUEPRINT.md` - Session-based forms
- `UI_AGENT_BLUEPRINT.md` - UI control system
- `AUTHENTICATION_BLUEPRINT.md` - Auth flows
- `ARCHITECTURE_RECOMMENDATIONS.md` - Overall design

**When to Reference**: When implementing specific features

### 4. `.cursorignore` (Exclusion List)
**Purpose**: Files to exclude from context indexing
**Location**: Root directory
**Priority**: PERFORMANCE - Reduces noise
**Content**:
- node_modules
- Build artifacts
- Logs
- Cache files

## How Cursor Uses Context

### Automatic Loading
Cursor automatically:
1. ✅ Reads `.cursorrules` on every session
2. ✅ Indexes files in workspace (except `.cursorignore`)
3. ✅ Uses semantic search for relevant context
4. ✅ Maintains conversation context

### Manual Context Loading
When you mention:
- "Context ID" → Cursor references `CONTEXT.md`
- "Form submission" → Cursor references form blueprint
- "UI agent" → Cursor references UI blueprint
- "Authentication" → Cursor references auth blueprint

### Best Practices for Maintaining Context

#### 1. Keep CONTEXT.md Focused
```markdown
✅ DO: Core patterns only (Context ID, Session, Domain boundaries)
❌ DON'T: Detailed implementation code, long examples
```

#### 2. Update When Architecture Changes
```bash
# After major architectural changes:
1. Update CONTEXT.md with new patterns
2. Update .cursorrules if pattern affects rules
3. Update relevant blueprint if detailed
4. Commit with message: "Update architecture context"
```

#### 3. Reference Blueprints Explicitly
```markdown
When asking Cursor to implement:
"Implement authentication per AUTHENTICATION_BLUEPRINT.md"
"Add form field per FORM_MANAGEMENT_BLUEPRINT.md"
```

## Context File Structure

```
CONTEXT BROKER/
├── .cursorrules          ← PRIMARY: Rules, standards, patterns
├── CONTEXT.md             ← CRITICAL: Essential architecture patterns
├── .cursorignore          ← PERFORMANCE: Exclude files from indexing
└── docs/
    ├── FORM_MANAGEMENT_BLUEPRINT.md      ← Reference: Form patterns
    ├── UI_AGENT_BLUEPRINT.md             ← Reference: UI control
    ├── AUTHENTICATION_BLUEPRINT.md       ← Reference: Auth flows
    ├── ARCHITECTURE_RECOMMENDATIONS.md   ← Reference: Overall design
    └── SWOT_ANALYSIS.md                  ← Reference: Assessment
```

## What Cursor Maintains in Context

### Always Available (Auto-loaded)
- ✅ `.cursorrules` content
- ✅ `CONTEXT.md` patterns
- ✅ Current file being edited
- ✅ Recently viewed files
- ✅ Conversation history

### Contextually Loaded (On-demand)
- 📄 Blueprint documents (when referenced)
- 📄 Related code files (semantic search)
- 📄 Similar implementations (pattern matching)

## Optimizing Context for Three Domains

### Strategy: Domain-Specific Context

**When working on Frontend:**
```
Cursor will reference:
- Frontend patterns from CONTEXT.md
- React/TypeScript standards from .cursorrules
- UI Agent patterns from UI_AGENT_BLUEPRINT.md
- Session management patterns
```

**When working on Broker:**
```
Cursor will reference:
- API patterns from CONTEXT.md
- Express/TypeScript standards
- Context ID validation patterns
- Session service patterns
```

**When working on Salesforce:**
```
Cursor will reference:
- Salesforce patterns from CONTEXT.md
- Apex standards
- Custom Object patterns
- Form definition patterns
```

## Example: Context in Action

### Scenario: Adding Authentication Feature

**Step 1: You Ask**
```
"Add authentication endpoint per AUTHENTICATION_BLUEPRINT.md"
```

**Step 2: Cursor Loads**
- ✅ `.cursorrules` (API patterns, security rules)
- ✅ `CONTEXT.md` (Context ID preservation, domain boundaries)
- ✅ `AUTHENTICATION_BLUEPRINT.md` (OAuth flow details)
- ✅ Related files: `broker/src/routes/`, `broker/src/services/`

**Step 3: Cursor Generates Code**
- ✅ Follows `.cursorrules` standards
- ✅ Includes `contextId` in requests (from CONTEXT.md)
- ✅ Validates contextId server-side (security rule)
- ✅ Preserves context through OAuth (CONTEXT.md pattern)

**Step 4: Code Review**
```typescript
// ✅ Good: Follows patterns
POST /api/agent/auth/initiate
{
  contextId: "formId:sessionId",  // From CONTEXT.md
  provider: "salesforce"
}

// ❌ Bad: Would trigger context reminder
POST /api/agent/auth/initiate
{
  sessionId: "..."  // Missing contextId format
}
```

## Tips for Maximum Context Retention

### 1. Use Consistent Terminology
```
✅ Use: "contextId", "formId", "sessionId"
❌ Avoid: "context_id", "form_id", "session_id" (inconsistent)
```

### 2. Reference Patterns Explicitly
```
✅ "Following the Context ID pattern from CONTEXT.md"
✅ "Using the form submission pattern"
❌ "Add this endpoint" (too vague)
```

### 3. Update Context When Patterns Change
```
After implementing new pattern:
1. Add to CONTEXT.md
2. Update .cursorrules if it's a rule
3. Document in relevant blueprint
```

### 4. File Placement Matters
```
Critical patterns → CONTEXT.md (root, always loaded)
Detailed guides → docs/*.md (referenced when needed)
Rules & standards → .cursorrules (auto-loaded)
```

## Context Validation Checklist

Before starting new features, verify:

- [ ] `.cursorrules` has relevant rules
- [ ] `CONTEXT.md` has the pattern documented
- [ ] Blueprint exists for complex features
- [ ] Context ID pattern is followed
- [ ] Domain boundaries are respected
- [ ] Security rules are followed

## Troubleshooting Context Issues

### Problem: Cursor doesn't follow Context ID pattern
**Solution**: 
1. Check `.cursorrules` mentions Context ID
2. Check `CONTEXT.md` has the pattern
3. Explicitly mention: "Use Context ID pattern from CONTEXT.md"

### Problem: Cursor suggests wrong domain pattern
**Solution**:
1. Reference correct domain in request
2. Reference correct blueprint document
3. Update CONTEXT.md with domain boundaries

### Problem: Too much context (slow responses)
**Solution**:
1. Update `.cursorignore` to exclude more files
2. Keep `CONTEXT.md` concise
3. Use specific file references instead of whole directories

## Summary

### Critical Files for Cursor Context

1. **`.cursorrules`** ← Always loaded, rules & standards
2. **`CONTEXT.md`** ← Always referenced, essential patterns
3. **`.cursorignore`** ← Performance optimization
4. **`docs/*.md`** ← Detailed guides, referenced as needed

### Key Patterns to Always Maintain

1. **Context ID Format**: `{formId}:{sessionId}` - MUST be in CONTEXT.md
2. **Domain Boundaries**: Frontend/Broker/Salesforce separation
3. **Session Flow**: localStorage → Broker → Salesforce
4. **Security Rules**: Validation, encryption, no client trust

### Update Workflow

```
Architecture Change →
  Update CONTEXT.md →
    Update .cursorrules (if rule) →
      Update blueprint (if detailed) →
        Commit with context update message
```

---

**Last Updated**: 2024
**Maintenance**: Update when architecture evolves






