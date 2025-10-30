# Agent-Aware UI Blueprint

Design-agnostic blueprint for making any web application observable and controllable by an agent, without coupling to CSS or specific design systems.

## Overview

This blueprint enables agents to:
- **Discover**: Enumerate pages, views, panels, and modals with stable IDs
- **Address**: Target specific UI elements using composite addresses
- **Observe**: Track focus, visibility, and state changes
- **Control**: Execute commands (navigate, focus, click, type, etc.)
- **Work across frameworks**: React, Vue, Next.js, vanilla JS

## Core Concepts

### Identity Model

Three-layer addressing system:

1. **Type ID (Stable)**: Policy & catalog anchor
   - Examples: `route:product`, `view:cart`, `modal:login`, `panel:filters`
   - Defined in code, never changes

2. **Instance ID (Dynamic)**: Disambiguates multiple copies
   - Examples: `ri_8KcH2z`, `mi_NQ4pLb`
   - Generated per render, unique per element instance

3. **Context**: Browser tab/session binding
   - `ctx_ref`: Unique per browser tab
   - `siteKey`: Site identifier

**Composite Address Format**:
```
{ siteKey, ctx_ref, routeId?, viewId?, modalId?, instanceId }
```

### DOM Annotations

Use semantic `data-assist-*` attributes:

```html
<!-- Route container (one per page view) -->
<main data-assist-route="route:product" data-assist-title="Product Detail">
  
  <!-- Primary view (content region) -->
  <section data-assist-view="view:productDetails">
    <!-- Optional panel within view -->
    <aside data-assist-panel="panel:filters"></aside>
  </section>
  
  <!-- Modal/dialog -->
  <div role="dialog"
       data-assist-modal="modal:login"
       aria-modal="true"
       aria-labelledby="loginTitle"
       hidden>
    <h2 id="loginTitle">Sign in</h2>
  </div>
</main>
```

### Visibility & Focus Model

**Priority Order**:
1. **Active Modal**: Topmost visible `[data-assist-modal]` with `aria-modal="true"`
2. **Focused Element**: `document.activeElement` within active modal/view
3. **Active View**: Visible `[data-assist-view]` (greatest z-index)
4. **Active Route**: Visible `[data-assist-route]`

**Edge Cases Handled**:
- Multiple modals: Choose topmost by z-index
- Hidden/off-screen: Elements with `hidden`, `display:none`, zero area, or `aria-hidden`
- Portals: Support Shadow DOM and React portals via `isConnected` and `getBoundingClientRect()`

## Implementation

### Frontend Components

#### 1. Agent UI Service (`services/agentUI.ts`)

Core service that:
- Observes DOM changes via MutationObserver
- Tracks element visibility and focus
- Computes active context
- Publishes state snapshots
- Handles agent commands

**Initialization**:
```typescript
import { initAgentUI } from './services/agentUI';

// In your app entry point
initAgentUI(API_BASE_URL);
```

#### 2. React Hooks

**`useAssistId`**: Assigns assist IDs to elements
```tsx
import { useAssistId } from './hooks/useAssistId';

function ProductView() {
  const viewRef = useAssistId('view', 'view:productDetails');
  return <section ref={viewRef}>...</section>;
}
```

**`useAssistField`**: For form fields
```tsx
import { useAssistField } from './hooks/useAssistId';

function EmailField() {
  return (
    <input
      type="email"
      {...useAssistField('email')}
    />
  );
}
```

**`useModal`**: Modal management with focus trap
```tsx
import { useModal } from './hooks/useModal';

function LoginModal() {
  const { isOpen, open, close, modalRef } = useModal({
    modalId: 'modal:login',
    autoFocus: true
  });
  
  return (
    <div ref={modalRef} hidden={!isOpen} role="dialog">
      ...
    </div>
  );
}
```

### State Snapshots

The service automatically publishes state snapshots:

```typescript
{
  type: 'state.snapshot',
  version: 1,
  ts: 1234567890,
  url: 'https://example.com/products/123',
  route: 'route:product',
  view: 'view:productDetails',
  modal: null,
  focus: 'input[name="quantity"]',
  panels: [
    { panelId: 'panel:filters', panelInstanceId: 'pi_abc123' }
  ]
}
```

### Agent Commands

Commands are sent via broker and executed by the shim:

#### Navigation
```json
{
  "rid": "req_123",
  "cmd": "navigate",
  "params": {
    "routeId": "route:cart",
    "url": "/cart",
    "mode": "push"
  }
}
```

#### Focus
```json
{
  "rid": "req_124",
  "cmd": "focus",
  "params": {
    "modalId": "modal:login",
    "selector": "[name=email]"
  }
}
```

#### Modal Control
```json
{
  "rid": "req_125",
  "cmd": "modal.open",
  "params": {
    "modalId": "modal:login"
  }
}
```

#### Click/Type
```json
{
  "rid": "req_126",
  "cmd": "click",
  "params": {
    "fieldId": "f:submitButton"
  }
}

{
  "rid": "req_127",
  "cmd": "type",
  "params": {
    "fieldId": "f:email",
    "value": "user@example.com"
  }
}
```

#### Wait For
```json
{
  "rid": "req_128",
  "cmd": "waitFor",
  "params": {
    "modalId": "modal:confirmation",
    "visible": true,
    "timeoutMs": 5000
  }
}
```

### Broker API Endpoints

#### Event Receiving
```
POST /api/agent/ui/event
Body: { ctx_ref, type, ...eventData }
```
Receives UI events from shim (snapshots, focus changes, route changes, etc.)

#### Command Sending
```
POST /api/agent/ui/command
Body: { ctx_ref, cmd, rid, params }
```
Sends commands to UI shim (queue for polling or WebSocket)

#### State Queries
```
POST /api/agent/ui/state
Body: { ctx_ref }
Response: { snapshot, focus, registry }
```
Gets current UI state for a context

#### Capabilities
```
POST /api/agent/ui/capabilities
Body: { ctx_ref }
Response: { routes, views, panels, modals }
```
Lists available routes, views, panels, and modals

## Security & Policy

### Allow-List Catalog

Define allowed routes/views/panels/modals and their policies:

```typescript
const catalog = {
  modals: [
    {
      modalId: 'modal:deleteAccount',
      policy: {
        requiresUserConfirm: true,
        allowedActions: ['modal.open', 'modal.close']
      }
    }
  ],
  routes: [
    {
      routeId: 'route:checkout',
      allowedActions: ['navigate']
    }
  ]
};
```

### Rate Limiting
- Max 2 in-flight commands per tab
- Reject beyond limit with 429 status

### Privacy
- No PII in IDs
- Snapshots contain structure, not sensitive values
- Short TTL cache (300-900 seconds)

## Best Practices

### ✅ DO

1. **Stable Type IDs**: Use descriptive, versioned IDs
   - Format: `{domain}-{purpose}-{version}`
   - Examples: `route:product-v1`, `view:cart-v2`

2. **Instance IDs per Render**: Generate unique IDs for each element instance
   - Automatic via `useAssistId` hook or service

3. **Deterministic Visibility**: Use consistent algorithm for active context
   - Modal > View > Route priority
   - Z-index and DOM order as tiebreakers

4. **Focus Trap in Modals**: Trap Tab/Shift+Tab within modals
   - Implemented automatically by `useModal` hook

5. **ARIA Alignment**: Use proper ARIA roles and attributes
   - `role="dialog"` for modals
   - `aria-modal="true"` for active modals
   - `aria-hidden="true"` for background content

6. **Event-Based Updates**: Send deltas, not full snapshots
   - Snapshot on significant changes
   - Delta events for focus/visibility changes

### ❌ DON'T

1. **Don't use CSS selectors**: Use `data-assist-*` attributes
2. **Don't hardcode IDs**: Generate instance IDs dynamically
3. **Don't trust client data**: Validate all commands server-side
4. **Don't store sensitive data**: Keep IDs policy-only, no PII
5. **Don't skip validation**: Validate Context ID format before processing

## Example: Complete Flow

### 1. Open Login Modal and Focus Email

```
Agent → Broker: POST /api/agent/ui/command
{
  "ctx_ref": "ctx_123",
  "cmd": "modal.open",
  "rid": "req_1",
  "params": { "modalId": "modal:login" }
}

Broker → Shim: Delivers command
Shim: Opens modal, traps focus, backgrounds content
Shim → Broker: POST /api/agent/ui/event
{ "type": "modal.opened", "modalId": "modal:login" }

Agent → Broker: POST /api/agent/ui/command
{
  "cmd": "focus",
  "rid": "req_2",
  "params": {
    "modalId": "modal:login",
    "selector": "[name=email]"
  }
}

Shim: Focuses email field
Shim → Broker: { "type": "focus.changed", "focus": "[name=email]" }
```

### 2. Navigate to Cart

```
Agent → Broker: POST /api/agent/ui/command
{
  "cmd": "navigate",
  "rid": "req_3",
  "params": {
    "routeId": "route:cart",
    "url": "/cart"
  }
}

Shim: Updates URL, triggers router
Shim → Broker: { "type": "route.changed", "routeId": "route:cart" }
```

## Framework Integration

### React

```tsx
import { useAssistId } from './hooks/useAssistId';

function ProductPage() {
  const routeRef = useAssistId('route', 'route:product');
  const viewRef = useAssistId('view', 'view:productDetails');
  
  return (
    <main ref={routeRef}>
      <section ref={viewRef}>
        {/* Content */}
      </section>
    </main>
  );
}
```

### Vue

```vue
<template>
  <main :data-assist-route="'route:product'">
    <section :data-assist-view="'view:productDetails'">
      <!-- Content -->
    </section>
  </main>
</template>

<script setup>
import { onMounted } from 'vue';
import { initAgentUI } from './services/agentUI';

onMounted(() => {
  initAgentUI(API_BASE_URL);
});
</script>
```

### Vanilla JS

```javascript
// Initialize service
initAgentUI(API_BASE_URL);

// Add attributes to HTML
<main data-assist-route="route:product">
  <section data-assist-view="view:productDetails">
    <!-- Content -->
  </section>
</main>
```

## Monitoring & Analytics

Track:
- UI state changes per context
- Command execution success/failure
- Focus changes and user interactions
- Route/view transitions
- Modal open/close events

## See Also

- `FORM_MANAGEMENT_BLUEPRINT.md` - Form identification and session management
- `ARCHITECTURE_RECOMMENDATIONS.md` - Overall system architecture
- Implementation files:
  - `frontend/src/services/agentUI.ts` - Core UI service
  - `frontend/src/hooks/useAssistId.ts` - React hooks
  - `broker/src/routes/agentUI.ts` - Broker endpoints


