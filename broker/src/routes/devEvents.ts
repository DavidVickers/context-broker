import express, { Request, Response } from 'express';
import { EventStore } from '../services/eventStore';

const router = express.Router();

/**
 * Development-only: Stream UI Agent events via Server-Sent Events
 */
router.get('/stream', (req: Request, res: Response) => {
  console.log('🌐 SSE /stream endpoint hit - setting up connection...');
  console.log('📋 Request headers:', {
    origin: req.get('origin'),
    userAgent: req.get('user-agent'),
    connection: req.get('connection'),
  });
  
  // Set headers for SSE
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  // Important: Prevent Express from closing the connection
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  
  // Don't let Express timeout or close the connection
  req.setTimeout(0); // No timeout
  res.setTimeout(0); // No timeout

  console.log('📡 Dev client connected to event stream');

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Event stream connected', timestamp: new Date().toISOString() })}\n\n`);

  // Subscribe to new events
  console.log(`📡 Setting up EventStore subscription for SSE client`);
  const unsubscribe = EventStore.subscribe((event) => {
    try {
      // Check if response is still writable
      if (res.destroyed || res.closed) {
        console.warn('⚠️ SSE response closed, unsubscribing');
        unsubscribe();
        return;
      }
      
      // Log event being sent to client
      console.log(`📤 Sending event to SSE client: ${event.type} (${event.id})`);
      const message = `data: ${JSON.stringify(event)}\n\n`;
      const success = res.write(message);
      
      if (!success) {
        console.warn('⚠️ SSE write buffer full, pausing');
        res.once('drain', () => {
          console.log('✅ SSE write buffer drained');
        });
      }
      
      // Force flush to ensure message is sent immediately
      if (typeof (res as any).flush === 'function') {
        (res as any).flush();
      }
    } catch (error: any) {
      console.error('❌ Error writing to SSE stream:', error);
      if (error.code === 'EPIPE' || error.code === 'ECONNRESET') {
        console.log('🔌 Client disconnected, unsubscribing');
      }
      unsubscribe();
    }
  });
  
  const stats = EventStore.getStats();
  console.log(`✅ EventStore subscription active, ${stats.totalEvents} existing events in store`);
  console.log(`👥 Active subscribers: ${EventStore.getSubscriberCount()}`);

  // Keep connection alive - send periodic heartbeat
  const heartbeatInterval = setInterval(() => {
    try {
      if (!res.destroyed && !res.closed) {
        res.write(`: heartbeat\n\n`);
      } else {
        clearInterval(heartbeatInterval);
      }
    } catch (error) {
      console.error('❌ Error sending heartbeat:', error);
      clearInterval(heartbeatInterval);
    }
  }, 30000); // Every 30 seconds

  // Cleanup on client disconnect
  req.on('close', () => {
    console.log('📡 Dev client disconnected from event stream');
    clearInterval(heartbeatInterval);
    unsubscribe();
    res.end();
  });
  
  // Handle errors
  req.on('error', (error) => {
    console.error('❌ Request error in SSE stream:', error);
    clearInterval(heartbeatInterval);
    unsubscribe();
    res.end();
  });
});

/**
 * Development-only: Get recent events (last 100)
 * 
 * This endpoint loads events that occurred before the SSE connection was established.
 * Combined with the SSE stream, this ensures all events are displayed.
 */
router.get('/recent', (req: Request, res: Response) => {
  try {
    const events = EventStore.getRecentEvents(100);
    console.log(`📋 Returning ${events.length} recent events to client`);
    res.json({
      total: events.length,
      events,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('❌ Error getting recent events:', error);
    res.status(500).json({
      error: 'Failed to get recent events',
      message: error.message,
    });
  }
});

/**
 * Development-only: Get stats
 */
router.get('/stats', (req: Request, res: Response) => {
  const stats = EventStore.getStats();
  res.json(stats);
});

export default router;

