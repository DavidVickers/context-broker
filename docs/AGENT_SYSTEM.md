# Agent System Configuration

## Overview

This project uses a specialized agent routing system that allows calling dedicated agents for specific tasks (code commenting, memory auditing, performance optimization, etc.).

## Available Agents

### 1. `@comment-code` - Code Commenting Agent
**Purpose**: Add comprehensive JSDoc comments and inline documentation

**Usage**:
```
@comment-code Please add JSDoc comments to all functions in broker/src/services/session.ts
```

**Behavior**:
- Analyzes code structure
- Identifies undocumented functions/classes
- Adds JSDoc comments following Code Standards
- Documents edge cases and performance considerations
- Adds inline comments for complex logic

### 2. `@audit-memory` - Memory Leak Audit Agent
**Purpose**: Find and fix memory leaks and unbounded growth

**Usage**:
```
@audit-memory Review all files for memory leaks (intervals, observers, Maps)
```

**Behavior**:
- Scans for setInterval/setTimeout without cleanup
- Checks for unbounded Map/Set growth
- Identifies missing event listener cleanup
- Finds MutationObserver/Observer leaks
- Verifies cleanup in destroy/unmount methods

### 3. `@optimize-performance` - Performance Optimization Agent
**Purpose**: Optimize code for performance and reduce network traffic

**Usage**:
```
@optimize-performance Optimize agentUI.ts to reduce CPU usage
```

**Behavior**:
- Identifies excessive event firing
- Optimizes MutationObserver scope
- Adds throttling/debouncing where needed
- Reviews network call frequency
- Optimizes loops and iterations

### 4. `@verify-security` - Security Audit Agent
**Purpose**: Verify security practices and validate inputs

**Usage**:
```
@verify-security Check all API routes for proper input validation
```

**Behavior**:
- Verifies contextId validation
- Checks for SQL injection risks
- Validates OAuth state parameters
- Reviews token storage practices
- Checks CORS configuration

### 5. `@ensure-timeouts` - Timeout Verification Agent
**Purpose**: Ensure all async operations have timeouts

**Usage**:
```
@ensure-timeouts Verify all API calls have proper timeouts configured
```

**Behavior**:
- Checks fetch calls for AbortController
- Verifies axios timeout configuration
- Reviews Promise chains for timeout handling
- Checks Express request timeouts
- Validates Salesforce API timeouts

## How Agent Routing Works

### Command Format
```
@agent-name [optional context] [task description]
```

### Examples

**Simple call**:
```
@comment-code Add JSDoc to all functions in session.ts
```

**With context**:
```
@comment-code Following the Code Standards in .cursorrules, document all methods in agentUI.ts
```

**Complex task**:
```
@audit-memory Review the entire broker/src/services directory for memory leaks, 
focusing on intervals, observers, and Map growth
```

## Agent Implementation Details

### Agent Selection Logic
When you use `@agent-name`, Cursor will:
1. Read `.cursorrules` to find agent definitions
2. Load agent-specific context and rules
3. Apply specialized behavior for that agent type
4. Return results following the agent's guidelines

### Agent Context Stacking
Agents can be chained or combined:
```
1. @audit-memory Find memory leaks
2. @comment-code Document the fixes
3. @optimize-performance Optimize the solutions
```

## Adding New Agents

To add a new agent:
1. Define it in `.cursorrules` under "Agent Routes"
2. Document its purpose in this file
3. Specify its behavior and rules
4. Provide usage examples

## Best Practices

1. **Be specific**: Include file paths and scope
2. **Provide context**: Reference relevant sections of `.cursorrules`
3. **Chain agents**: Use multiple agents for complex tasks
4. **Verify output**: Review agent results before committing




