/**
 * Event Store - Development tool for tracking UI Agent events
 * Stores events in memory for debugging/visualization
 */

export interface StoredEvent {
  id: string;
  type: string;
  ctx_ref?: string;
  timestamp: string;
  data: any;
}

type EventCallback = (event: StoredEvent) => void;

class EventStoreService {
  private events: StoredEvent[] = [];
  private subscribers: Set<EventCallback> = new Set();
  private maxEvents = 500; // Keep last 500 events

  /**
   * Add a new event
   */
  addEvent(event: Omit<StoredEvent, 'id' | 'timestamp'>): void {
    const storedEvent: StoredEvent = {
      id: `evt_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      timestamp: new Date().toISOString(),
      ...event,
    };

    this.events.push(storedEvent);

    // Keep only last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Notify subscribers
    console.log(`🔔 Notifying ${this.subscribers.size} subscribers of event: ${storedEvent.type}`);
    if (this.subscribers.size === 0) {
      console.warn(`⚠️ No subscribers to notify! Event will be stored but not streamed.`);
    }
    
    // Convert Set to Array to get index for logging
    const subscribersArray = Array.from(this.subscribers);
    subscribersArray.forEach((callback, index) => {
      try {
        console.log(`📢 Calling subscriber ${index + 1}/${subscribersArray.length}`);
        callback(storedEvent);
        console.log(`✅ Subscriber ${index + 1} notified successfully`);
      } catch (error) {
        console.error(`❌ Error in subscriber ${index + 1}:`, error);
      }
    });
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 100): StoredEvent[] {
    return this.events.slice(-limit).reverse(); // Most recent first
  }

  /**
   * Subscribe to new events
   * 
   * Returns unsubscribe function that removes the callback from subscribers
   */
  subscribe(callback: EventCallback): () => void {
    console.log(`➕ Adding subscriber, total subscribers: ${this.subscribers.size + 1}`);
    this.subscribers.add(callback);
    return () => {
      console.log(`➖ Removing subscriber, remaining: ${this.subscribers.size - 1}`);
      this.subscribers.delete(callback);
    };
  }
  
  /**
   * Get subscriber count (for debugging)
   */
  getSubscriberCount(): number {
    return this.subscribers.size;
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEvents: number;
    eventsByType: Record<string, number>;
    contexts: string[];
    lastEventTime: string | null;
  } {
    const eventsByType: Record<string, number> = {};
    const contexts = new Set<string>();

    this.events.forEach((event) => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      if (event.ctx_ref) {
        contexts.add(event.ctx_ref);
      }
    });

    return {
      totalEvents: this.events.length,
      eventsByType,
      contexts: Array.from(contexts),
      lastEventTime: this.events.length > 0 ? this.events[this.events.length - 1].timestamp : null,
    };
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }
}

// Singleton instance
export const EventStore = new EventStoreService();

