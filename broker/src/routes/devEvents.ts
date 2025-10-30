import express, { Request, Response } from 'express';
import { EventStore } from '../services/eventStore';

const router = express.Router();

/**
 * Development-only: Stream UI Agent events via Server-Sent Events
 */
router.get('/stream', (req: Request, res: Response) => {
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  console.log('📡 Dev client connected to event stream');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Event stream connected', timestamp: new Date().toISOString() })}\n\n`);

  // Subscribe to new events
  const unsubscribe = EventStore.subscribe((event) => {
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch (error) {
      console.error('Error writing to SSE stream:', error);
      unsubscribe();
    }
  });

  // Cleanup on client disconnect
  req.on('close', () => {
    console.log('📡 Dev client disconnected from event stream');
    unsubscribe();
    res.end();
  });
});

/**
 * Development-only: Get recent events (last 100)
 */
router.get('/recent', (req: Request, res: Response) => {
  const events = EventStore.getRecentEvents(100);
  res.json({
    total: events.length,
    events,
    timestamp: new Date().toISOString(),
  });
});

/**
 * Development-only: Get stats
 */
router.get('/stats', (req: Request, res: Response) => {
  const stats = EventStore.getStats();
  res.json(stats);
});

export default router;

