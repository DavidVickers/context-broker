/**
 * Agent-Aware UI Service
 * Design-agnostic system for agent observation and control
 */

export type AssistType = 'route' | 'view' | 'modal' | 'panel';
export type AssistId = string; // e.g., "route:product", "view:cart", "modal:login"
export type InstanceId = string; // e.g., "ri_8KcH2z", "mi_NQ4pLb"

export interface ActiveContext {
  route: { typeId?: AssistId; instanceId?: InstanceId } | null;
  view: { typeId?: AssistId; instanceId?: InstanceId } | null;
  modal: { typeId?: AssistId; instanceId?: InstanceId } | null;
  focus: { selector?: string; element?: Element } | null;
  panels: Array<{ typeId: AssistId; instanceId: InstanceId }>;
}

export interface StateSnapshot {
  type: 'state.snapshot';
  version: number;
  ts: number;
  url: string;
  route: AssistId | null;
  view: AssistId | null;
  modal: AssistId | null;
  focus: string | null;
  panels: Array<{ panelId: AssistId; panelInstanceId: InstanceId }>;
}

export interface Command {
  rid: string; // Request ID for idempotency
  cmd: string;
  ctx_ref?: string;
  params: Record<string, any>;
}

class AgentUIService {
  private stateVersion = 0;
  private ctxRef: string;
  private apiBaseUrl: string;
  private mutationObserver: MutationObserver | null = null;
  private focusedElement: Element | null = null;
  private commandHandlers: Map<string, (cmd: Command) => Promise<any>> = new Map();
  private snapshots: Map<number, StateSnapshot> = new Map();
  private fieldValues: Map<string, string | null> = new Map(); // Track previous field values
  private isInitialized = false;

  constructor(apiBaseUrl: string) {
    this.apiBaseUrl = apiBaseUrl;
    this.ctxRef = this.generateContextRef();
    this.setupCommandHandlers();
  }

  private generateContextRef(): string {
    return `ctx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  /**
   * Generate instance ID for an element
   */
  private ensureInstanceId(el: Element, key: AssistType): InstanceId {
    const attr = `data-assist-${key}-instance`;
    let instanceId = el.getAttribute(attr);
    
    if (!instanceId) {
      const prefix = key === 'route' ? 'ri_' : key === 'view' ? 'vi_' : key === 'modal' ? 'mi_' : 'pi_';
      instanceId = prefix + this.cryptoRandom(10);
      el.setAttribute(attr, instanceId);
    }
    
    return instanceId;
  }

  private cryptoRandom(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    for (let i = 0; i < length; i++) {
      result += chars[array[i] % chars.length];
    }
    return result;
  }

  /**
   * Check if element is visible
   */
  private isVisible(el: Element): boolean {
    if (!el || !el.isConnected) return false;
    
    const style = window.getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
      return false;
    }

    if (el.hasAttribute('hidden')) return false;
    if (el.getAttribute('aria-hidden') === 'true') return false;

    const rect = el.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;

    return true;
  }

  /**
   * Get z-index of element
   */
  private getZIndex(el: Element): number {
    const style = window.getComputedStyle(el);
    const zIndex = parseInt(style.zIndex, 10);
    return isNaN(zIndex) ? 0 : zIndex;
  }

  /**
   * Find topmost element by z-index
   */
  private topmost(elements: Element[]): Element | null {
    if (elements.length === 0) return null;
    if (elements.length === 1) return elements[0];

    return elements.reduce((top, current) => {
      const topZ = this.getZIndex(top);
      const currentZ = this.getZIndex(current);
      if (currentZ > topZ) return current;
      if (currentZ === topZ) {
        // If z-index equal, prefer last in DOM
        return top.compareDocumentPosition(current) & Node.DOCUMENT_POSITION_FOLLOWING
          ? current
          : top;
      }
      return top;
    });
  }

  /**
   * Compute active context
   */
  private computeActiveContext(): ActiveContext {
    // Find all visible modals
    const modals = Array.from(
      document.querySelectorAll('[data-assist-modal]')
    ).filter(el => this.isVisible(el)) as Element[];

    const activeModal = this.topmost(modals);

    // Find active route (should be one, but take first visible)
    const routes = Array.from(
      document.querySelectorAll('[data-assist-route]')
    ).filter(el => this.isVisible(el));
    const route = routes[0] || null;

    // Find all visible views
    // Exclude agent panels from being considered as views (they're always visible sidebars)
    const views = Array.from(
      document.querySelectorAll('[data-assist-view]')
    ).filter(el => {
      if (!this.isVisible(el)) return false;
      if (activeModal?.contains(el)) return false;
      // Exclude agent sidebars - they should be panels, not views
      const viewId = el.getAttribute('data-assist-view');
      if (viewId?.startsWith('view:agent:')) return false;
      return true;
    }) as Element[];

    const activeView = activeModal ? null : this.topmost(views);

    // Determine focused element
    const activeEl = document.activeElement as Element | null;
    let focusElement: Element | null = null;
    
    if (activeEl) {
      if (activeModal && activeModal.contains(activeEl)) {
        focusElement = activeEl;
      } else if (activeView && activeView.contains(activeEl)) {
        focusElement = activeEl;
      }
    }

    // Find all visible panels
    const panels = Array.from(
      document.querySelectorAll('[data-assist-panel]')
    ).filter(el => this.isVisible(el));

    const context: ActiveContext = {
      route: route ? {
        typeId: route.getAttribute('data-assist-route') || undefined,
        instanceId: this.ensureInstanceId(route, 'route'),
      } : null,
      view: activeView ? {
        typeId: activeView.getAttribute('data-assist-view') || undefined,
        instanceId: this.ensureInstanceId(activeView, 'view'),
      } : null,
      modal: activeModal ? {
        typeId: activeModal.getAttribute('data-assist-modal') || undefined,
        instanceId: this.ensureInstanceId(activeModal, 'modal'),
      } : null,
      focus: focusElement ? {
        selector: this.selectorFor(focusElement),
        element: focusElement,
      } : null,
      panels: panels.map(p => ({
        typeId: p.getAttribute('data-assist-panel')!,
        instanceId: this.ensureInstanceId(p, 'panel'),
      })),
    };

    return context;
  }

  /**
   * Generate CSS selector for element
   */
  private selectorFor(el: Element): string {
    if (el.id) return `#${el.id}`;
    if (el.className) {
      const classes = el.className.split(' ').filter(c => c).join('.');
      if (classes) {
        const tag = el.tagName.toLowerCase();
        return `${tag}.${classes}`;
      }
    }
    return el.tagName.toLowerCase();
  }

  /**
   * Register all assist elements and assign instance IDs
   */
  private registerAll(): void {
    const selectors: Array<{ selector: string; type: AssistType }> = [
      { selector: '[data-assist-route]', type: 'route' },
      { selector: '[data-assist-view]', type: 'view' },
      { selector: '[data-assist-panel]', type: 'panel' },
      { selector: '[data-assist-modal]', type: 'modal' },
    ];

    selectors.forEach(({ selector, type }) => {
      document.querySelectorAll(selector).forEach(el => {
        this.ensureInstanceId(el, type);
      });
    });

    this.publishSnapshot();
  }

  /**
   * Publish state snapshot
   */
  private publishSnapshot(): void {
    const ctx = this.computeActiveContext();
    const snapshot: StateSnapshot = {
      type: 'state.snapshot',
      version: ++this.stateVersion,
      ts: Date.now(),
      url: window.location.href,
      route: ctx.route?.typeId || null,
      view: ctx.view?.typeId || null,
      modal: ctx.modal?.typeId || null,
      focus: ctx.focus?.selector || null,
      panels: ctx.panels.map(p => ({
        panelId: p.typeId,
        panelInstanceId: p.instanceId,
      })),
    };

    this.snapshots.set(snapshot.version, snapshot);
    this.sendToBroker(snapshot);

    // Keep only last 10 snapshots
    if (this.snapshots.size > 10) {
      const oldest = Math.min(...Array.from(this.snapshots.keys()));
      this.snapshots.delete(oldest);
    }
  }

  /**
   * Send event to broker
   */
  private async sendToBroker(event: any): Promise<void> {
    try {
      await fetch(`${this.apiBaseUrl}/api/agent/ui/event`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ctx_ref: this.ctxRef,
          ...event,
        }),
      });
    } catch (error) {
      console.warn('Failed to send event to broker:', error);
    }
  }

  /**
   * Handle focus changes
   */
  private onFocusChange = (): void => {
    const ctx = this.computeActiveContext();
    this.sendToBroker({
      type: 'focus.changed',
      ts: Date.now(),
      focus: ctx.focus?.selector || null,
      modal: ctx.modal?.typeId || null,
      view: ctx.view?.typeId || null,
    });
  };

  /**
   * Handle field value changes (input, select, textarea)
   */
  private onFieldChange = (e: Event): void => {
    const target = e.target as HTMLElement;
    if (!target) return;

    const fieldId = target.getAttribute('data-assist-field');
    if (!fieldId) return; // Only track fields with data-assist-field

    const ctx = this.computeActiveContext();
    
    // Get field metadata
    const fieldType = this.getFieldType(target);
    const fieldLabel = this.getFieldLabel(target);
    const newValue = this.getFieldValue(target);
    const oldValue = this.fieldValues.get(fieldId) || null;

    // Only emit if value actually changed
    if (oldValue !== newValue) {
      this.fieldValues.set(fieldId, newValue);

      this.sendToBroker({
        type: 'field.changed',
        ts: Date.now(),
        fieldId,
        fieldType,
        fieldLabel: fieldLabel || null,
        oldValue,
        newValue,
        view: ctx.view?.typeId || null,
        modal: ctx.modal?.typeId || null,
      });
    }
  };

  /**
   * Get field type (select, input, textarea, etc.)
   */
  private getFieldType(element: HTMLElement): string {
    const tagName = element.tagName.toLowerCase();
    if (tagName === 'select') return 'select';
    if (tagName === 'textarea') return 'textarea';
    if (tagName === 'input') {
      const type = (element as HTMLInputElement).type || 'text';
      return `input:${type}`;
    }
    return 'unknown';
  }

  /**
   * Get field label (from associated label element or aria-label)
   */
  private getFieldLabel(element: HTMLElement): string | null {
    // Try aria-label first
    const ariaLabel = element.getAttribute('aria-label');
    if (ariaLabel) return ariaLabel;

    // Try associated label element
    const id = element.id;
    if (id) {
      const label = document.querySelector(`label[for="${id}"]`);
      if (label) return label.textContent?.trim() || null;
    }

    // Try parent label
    const parentLabel = element.closest('label');
    if (parentLabel) {
      return parentLabel.textContent?.replace(element.textContent || '', '').trim() || null;
    }

    // Try previous sibling label
    const prevSibling = element.previousElementSibling;
    if (prevSibling && prevSibling.tagName.toLowerCase() === 'label') {
      return prevSibling.textContent?.trim() || null;
    }

    return null;
  }

  /**
   * Get field value (supports input, select, textarea)
   */
  private getFieldValue(element: HTMLElement): string | null {
    if (element.tagName.toLowerCase() === 'select') {
      const select = element as HTMLSelectElement;
      const selectedOption = select.options[select.selectedIndex];
      return selectedOption ? selectedOption.text || selectedOption.value : null;
    }
    
    if (element.tagName.toLowerCase() === 'textarea') {
      return (element as HTMLTextAreaElement).value || null;
    }
    
    if (element.tagName.toLowerCase() === 'input') {
      const input = element as HTMLInputElement;
      // For checkboxes/radios, return checked status as text
      if (input.type === 'checkbox' || input.type === 'radio') {
        return input.checked ? 'checked' : 'unchecked';
      }
      return input.value || null;
    }
    
    return null;
  }

  /**
   * Handle click events (capture semantic context)
   */
  private onClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    if (!target) return;

    const ctx = this.computeActiveContext();

    // Extract semantic context from data attributes
    const fieldId = target.getAttribute('data-assist-field') || 
                   target.closest('[data-assist-field]')?.getAttribute('data-assist-field') || null;
    const actionId = target.getAttribute('data-assist-action') || 
                     target.closest('[data-assist-action]')?.getAttribute('data-assist-action') || null;
    const itemId = target.getAttribute('data-assist-item') || 
                   target.closest('[data-assist-item]')?.getAttribute('data-assist-item') || null;

    // Get button/link text or aria-label
    const buttonText = target.textContent?.trim() || 
                      target.getAttribute('aria-label') || 
                      target.closest('button')?.textContent?.trim() || null;

    // Extract item metadata (e.g., vehicle name from card)
    let itemMetadata: Record<string, any> | null = null;
    if (itemId) {
      const itemElement = target.closest('[data-assist-item]');
      if (itemElement) {
        // Extract common item properties
        const itemName = itemElement.querySelector('.vehicle-name')?.textContent?.trim() ||
                        itemElement.querySelector('[class*="name"]')?.textContent?.trim() || null;
        const itemPrice = itemElement.querySelector('.vehicle-price')?.textContent?.trim() ||
                         itemElement.querySelector('[class*="price"]')?.textContent?.trim() || null;
        
        if (itemName || itemPrice) {
          itemMetadata = {
            name: itemName,
            price: itemPrice,
          };
        }
      }
    }

    // Only emit click if there's semantic context (fieldId, actionId, or itemId)
    if (fieldId || actionId || itemId) {
      this.sendToBroker({
        type: 'click',
        ts: Date.now(),
        fieldId: fieldId || null,
        actionId: actionId || null,
        itemId: itemId || null,
        buttonText: buttonText || null,
        itemMetadata,
        selector: this.selectorFor(target),
        view: ctx.view?.typeId || null,
        modal: ctx.modal?.typeId || null,
      });
    }
  };

  /**
   * Setup command handlers
   */
  private setupCommandHandlers(): void {
    this.commandHandlers.set('navigate', this.handleNavigate);
    this.commandHandlers.set('focus', this.handleFocus);
    this.commandHandlers.set('modal.open', this.handleModalOpen);
    this.commandHandlers.set('modal.close', this.handleModalClose);
    this.commandHandlers.set('panel.toggle', this.handlePanelToggle);
    this.commandHandlers.set('click', this.handleClick);
    this.commandHandlers.set('type', this.handleType);
    this.commandHandlers.set('scroll', this.handleScroll);
    this.commandHandlers.set('waitFor', this.handleWaitFor);
  }

  /**
   * Process command from broker
   */
  async processCommand(cmd: Command): Promise<any> {
    const handler = this.commandHandlers.get(cmd.cmd);
    if (!handler) {
      throw new Error(`Unknown command: ${cmd.cmd}`);
    }

    try {
      const result = await handler.call(this, cmd);
      await this.sendToBroker({
        type: 'cmd.result',
        rid: cmd.rid,
        ok: true,
        stateVersion: this.stateVersion,
        result,
      });
      this.publishSnapshot();
      return result;
    } catch (error: any) {
      await this.sendToBroker({
        type: 'cmd.result',
        rid: cmd.rid,
        ok: false,
        stateVersion: this.stateVersion,
        error: error.message,
      });
      throw error;
    }
  }

  // Command handlers
  private handleNavigate = async (cmd: Command): Promise<void> => {
    const { routeId, url, mode = 'push' } = cmd.params;
    if (url) {
      window.history[mode === 'replace' ? 'replaceState' : 'pushState']({}, '', url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    } else if (routeId) {
      // Handle programmatic navigation if using a router
      console.warn('Router navigation not implemented, use URL instead');
    }
    this.publishSnapshot();
    this.sendToBroker({ type: 'route.changed', routeId, ts: Date.now() });
  };

  private handleFocus = async (cmd: Command): Promise<void> => {
    const target = this.resolveTarget(cmd.params);
    if (!target) {
      throw new Error('Target not found');
    }

    let selector = cmd.params.selector;
    let element: Element | null = null;

    if (selector) {
      element = target.querySelector(selector) || document.querySelector(selector);
    } else {
      // Focus first focusable element in target
      const focusable = target.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement;
      element = focusable || target as HTMLElement;
    }

    if (element && 'focus' in element) {
      (element as HTMLElement).focus();
    }
  };

  private handleModalOpen = async (cmd: Command): Promise<void> => {
    const { modalId, instanceId } = cmd.params;
    const modal = this.findModal(modalId, instanceId);
    if (!modal) {
      throw new Error(`Modal ${modalId} not found`);
    }

    this.openModal(modal as HTMLElement);
    this.sendToBroker({ type: 'modal.opened', modalId, ts: Date.now() });
  };

  private handleModalClose = async (cmd: Command): Promise<void> => {
    const ctx = this.computeActiveContext();
    if (!ctx.modal) {
      throw new Error('No active modal');
    }

    const modal = this.findModal(ctx.modal.typeId!, ctx.modal.instanceId);
    if (modal) {
      this.closeModal(modal as HTMLElement);
      this.sendToBroker({ type: 'modal.closed', modalId: ctx.modal.typeId, ts: Date.now() });
    }
  };

  private handlePanelToggle = async (cmd: Command): Promise<void> => {
    const { panelId, instanceId } = cmd.params;
    const panel = this.findPanel(panelId, instanceId);
    if (!panel) {
      throw new Error(`Panel ${panelId} not found`);
    }

    const isHidden = panel.hasAttribute('hidden');
    if (isHidden) {
      panel.removeAttribute('hidden');
    } else {
      panel.setAttribute('hidden', '');
    }
  };

  private handleClick = async (cmd: Command): Promise<void> => {
    const { selector, fieldId } = cmd.params;
    let element: Element | null = null;

    if (fieldId) {
      element = document.querySelector(`[data-assist-field="${fieldId}"]`);
    } else if (selector) {
      element = document.querySelector(selector);
    }

    if (element) {
      (element as HTMLElement).click();
    } else {
      throw new Error('Element not found');
    }
  };

  private handleType = async (cmd: Command): Promise<void> => {
    const { selector, fieldId, value } = cmd.params;
    let element: HTMLInputElement | HTMLTextAreaElement | null = null;

    if (fieldId) {
      element = document.querySelector(`[data-assist-field="${fieldId}"]`) as HTMLInputElement;
    } else if (selector) {
      element = document.querySelector(selector) as HTMLInputElement;
    }

    if (element && ('value' in element)) {
      element.value = value || '';
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    } else {
      throw new Error('Input element not found');
    }
  };

  private handleScroll = async (cmd: Command): Promise<void> => {
    const { to, selector } = cmd.params;
    
    if (to === 'top') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (to === 'bottom') {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
    } else if (to.x !== undefined || to.y !== undefined) {
      window.scrollTo({ top: to.y || 0, left: to.x || 0, behavior: 'smooth' });
    } else if (selector) {
      const el = document.querySelector(selector);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  private handleWaitFor = async (cmd: Command): Promise<void> => {
    const { modalId, viewId, selector, visible = true, timeoutMs = 5000 } = cmd.params;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const check = () => {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error('Timeout waiting for element'));
          return;
        }

        let found = false;
        if (modalId) {
          const modal = this.findModal(modalId);
          found = modal ? this.isVisible(modal) === visible : false;
        } else if (viewId) {
          const view = this.findView(viewId);
          found = view ? this.isVisible(view) === visible : false;
        } else if (selector) {
          const el = document.querySelector(selector);
          found = el ? this.isVisible(el) === visible : false;
        }

        if (found) {
          resolve(undefined);
        } else {
          setTimeout(check, 100);
        }
      };

      check();
    });
  };

  /**
   * Resolve target element from command params
   */
  private resolveTarget(params: {
    modalId?: string;
    viewId?: string;
    instanceId?: string;
  }): Element | null {
    if (params.modalId) {
      return this.findModal(params.modalId, params.instanceId);
    }
    if (params.viewId) {
      return this.findView(params.viewId, params.instanceId);
    }
    
    // Default to active modal or view
    const ctx = this.computeActiveContext();
    if (ctx.modal) {
      return this.findModal(ctx.modal.typeId!, ctx.modal.instanceId);
    }
    if (ctx.view) {
      return this.findView(ctx.view.typeId!, ctx.view.instanceId);
    }
    
    return null;
  }

  private findModal(modalId: string, instanceId?: string): Element | null {
    const modals = Array.from(document.querySelectorAll(`[data-assist-modal="${modalId}"]`));
    if (instanceId) {
      return modals.find(m => m.getAttribute('data-assist-modal-instance') === instanceId) || null;
    }
    const visible = modals.filter(m => this.isVisible(m));
    return this.topmost(visible);
  }

  private findView(viewId: string, instanceId?: string): Element | null {
    const views = Array.from(document.querySelectorAll(`[data-assist-view="${viewId}"]`));
    if (instanceId) {
      return views.find(v => v.getAttribute('data-assist-view-instance') === instanceId) || null;
    }
    const visible = views.filter(v => this.isVisible(v));
    return this.topmost(visible);
  }

  private findPanel(panelId: string, instanceId?: string): Element | null {
    const panels = Array.from(document.querySelectorAll(`[data-assist-panel="${panelId}"]`));
    if (instanceId) {
      return panels.find(p => p.getAttribute('data-assist-panel-instance') === instanceId) || null;
    }
    const visible = panels.filter(p => this.isVisible(p));
    return this.topmost(visible);
  }

  /**
   * Open modal with focus trap
   */
  private openModal(modal: HTMLElement): void {
    modal.hidden = false;
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('role', 'dialog');
    
    // Trap focus
    const focusable = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      (focusable[0] as HTMLElement).focus();
    }

    // Background non-modal content
    this.backgroundNonModalContent(modal, true);
  }

  /**
   * Close modal
   */
  private closeModal(modal: HTMLElement): void {
    this.backgroundNonModalContent(modal, false);
    modal.hidden = true;
    modal.removeAttribute('aria-modal');
    
    // Restore focus if possible
    if (this.focusedElement && 'focus' in this.focusedElement) {
      (this.focusedElement as HTMLElement).focus();
    }
  }

  /**
   * Background non-modal content when modal is open
   */
  private backgroundNonModalContent(modal: HTMLElement, hide: boolean): void {
    const siblings = Array.from(document.body.children).filter(
      child => child !== modal && !modal.contains(child)
    ) as HTMLElement[];

    siblings.forEach(sibling => {
      if (hide) {
        sibling.setAttribute('aria-hidden', 'true');
        sibling.setAttribute('inert', '');
      } else {
        sibling.removeAttribute('aria-hidden');
        sibling.removeAttribute('inert');
      }
    });
  }

  /**
   * Initialize the service
   */
  init(): void {
    if (this.isInitialized) return;
    
    this.registerAll();
    
    // Watch for DOM changes
    this.mutationObserver = new MutationObserver(() => {
      this.registerAll();
    });

    this.mutationObserver.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['hidden', 'open', 'style', 'class', 'aria-hidden'],
    });

    // Watch for focus changes
    window.addEventListener('focusin', this.onFocusChange);
    window.addEventListener('focusout', this.onFocusChange);

    // Watch for field value changes (input, select, textarea)
    document.addEventListener('input', this.onFieldChange);
    document.addEventListener('change', this.onFieldChange);

    // Watch for click events (capture semantic context)
    document.addEventListener('click', this.onClick, true); // Use capture phase

    // Watch for route changes
    window.addEventListener('popstate', () => {
      this.publishSnapshot();
      this.sendToBroker({ type: 'route.changed', ts: Date.now() });
    });

    // Watch for tab visibility
    document.addEventListener('visibilitychange', () => {
      this.sendToBroker({
        type: 'tab.visibility',
        hidden: document.hidden,
        ts: Date.now(),
      });
    });

    this.isInitialized = true;
    console.log('Agent UI Service initialized:', this.ctxRef);
  }

  /**
   * Get current state
   */
  getCurrentState(): StateSnapshot | null {
    const latest = Math.max(...Array.from(this.snapshots.keys()));
    return this.snapshots.get(latest) || null;
  }

  /**
   * Get context reference
   */
  getContextRef(): string {
    return this.ctxRef;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
    }
    window.removeEventListener('focusin', this.onFocusChange);
    window.removeEventListener('focusout', this.onFocusChange);
    document.removeEventListener('input', this.onFieldChange);
    document.removeEventListener('change', this.onFieldChange);
    document.removeEventListener('click', this.onClick, true);
    this.isInitialized = false;
  }
}

// Singleton instance
let agentUIService: AgentUIService | null = null;

export const initAgentUI = (apiBaseUrl: string): AgentUIService => {
  if (!agentUIService) {
    agentUIService = new AgentUIService(apiBaseUrl);
    agentUIService.init();
  }
  return agentUIService;
};

export const getAgentUI = (): AgentUIService | null => {
  return agentUIService;
};

export default AgentUIService;


