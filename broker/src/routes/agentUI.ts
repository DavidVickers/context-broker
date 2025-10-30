import express, { Request, Response } from 'express';
import { EventStore } from '../services/eventStore';

const router = express.Router();

// In-memory state (use Redis in production)
interface UIState {
  [ctx_ref: string]: {
    snapshot: any;
    focus: any;
    registry: any;
    lastUpdate: number;
  };
}

const uiState: UIState = {};
const TTL = 900000; // 15 minutes

// Cleanup expired state
setInterval(() => {
  const now = Date.now();
  for (const ctx_ref in uiState) {
    if (now - uiState[ctx_ref].lastUpdate > TTL) {
      delete uiState[ctx_ref];
    }
  }
}, 60000); // Run every minute

// POST /api/agent/ui/event - Receive UI events from shim
router.post('/event', async (req: Request, res: Response) => {
  try {
    const { ctx_ref, ...event } = req.body;

    if (!ctx_ref) {
      return res.status(400).json({ error: 'ctx_ref is required' });
    }

    // Initialize state if needed
    if (!uiState[ctx_ref]) {
      uiState[ctx_ref] = {
        snapshot: null,
        focus: null,
        registry: { routes: [], views: [], panels: [], modals: [] },
        lastUpdate: Date.now(),
      };
    }

    const state = uiState[ctx_ref];
    state.lastUpdate = Date.now();

    // Store event for dev visualization
    EventStore.addEvent({
      type: event.type,
      ctx_ref,
      data: event,
    });

    // Handle different event types
    switch (event.type) {
      case 'state.snapshot':
        state.snapshot = event;
        break;
      case 'focus.changed':
        state.focus = {
          focus: event.focus,
          modal: event.modal,
          view: event.view,
          ts: event.ts,
        };
        break;
      case 'route.changed':
        // Update snapshot if exists
        if (state.snapshot) {
          state.snapshot.route = event.routeId;
          state.snapshot.url = event.url || state.snapshot.url;
        }
        break;
      case 'modal.opened':
      case 'modal.closed':
        // Registry update handled by snapshot
        break;
      case 'field.changed':
      case 'click':
        // Track user interactions for analytics
        // Could store in database or analytics service
        break;
      default:
        console.log('Unhandled UI event:', event.type);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error handling UI event:', error);
    res.status(500).json({
      error: 'Failed to process UI event',
      message: error.message,
    });
  }
});

// POST /api/agent/ui/command - Send command to UI shim
router.post('/command', async (req: Request, res: Response) => {
  try {
    const { ctx_ref, cmd, rid, params } = req.body;

    if (!ctx_ref || !cmd || !rid) {
      return res.status(400).json({
        error: 'ctx_ref, cmd, and rid are required',
      });
    }

    // Check idempotency (simple in-memory check)
    // In production, use Redis with TTL
    const ridKey = `rid:${rid}`;
    // For now, we'll just validate the command format
    
    // Commands are sent via polling or WebSocket from frontend
    // This endpoint stores the command, and frontend polls for it
    // OR use WebSocket for real-time communication
    
    // For simplicity, we'll return the command to be executed
    // In production, queue this and have frontend poll or use WebSocket
    res.json({
      success: true,
      command: {
        rid,
        cmd,
        params,
      },
    });
  } catch (error: any) {
    console.error('Error processing command:', error);
    res.status(500).json({
      error: 'Failed to process command',
      message: error.message,
    });
  }
});

// POST /api/agent/ui/state - Get current UI state
router.post('/state', async (req: Request, res: Response) => {
  try {
    const { ctx_ref } = req.body;

    if (!ctx_ref) {
      return res.status(400).json({ error: 'ctx_ref is required' });
    }

    const state = uiState[ctx_ref];
    if (!state) {
      return res.status(404).json({ error: 'State not found for ctx_ref' });
    }

    res.json({
      snapshot: state.snapshot,
      focus: state.focus,
      registry: state.registry,
    });
  } catch (error: any) {
    console.error('Error fetching UI state:', error);
    res.status(500).json({
      error: 'Failed to fetch UI state',
      message: error.message,
    });
  }
});

// POST /api/agent/ui/capabilities - Get available routes/views/panels/modals
router.post('/capabilities', async (req: Request, res: Response) => {
  try {
    const { ctx_ref } = req.body;

    if (!ctx_ref) {
      return res.status(400).json({ error: 'ctx_ref is required' });
    }

    const state = uiState[ctx_ref];
    if (!state || !state.snapshot) {
      return res.json({
        routes: [],
        views: [],
        panels: [],
        modals: [],
      });
    }

    res.json({
      routes: state.snapshot.route ? [state.snapshot.route] : [],
      views: state.snapshot.view ? [state.snapshot.view] : [],
      panels: state.snapshot.panels || [],
      modals: state.snapshot.modal ? [state.snapshot.modal] : [],
    });
  } catch (error: any) {
    console.error('Error fetching capabilities:', error);
    res.status(500).json({
      error: 'Failed to fetch capabilities',
      message: error.message,
    });
  }
});

export default router;


