import { useEffect, useRef, MutableRefObject } from 'react';

export type AssistType = 'route' | 'view' | 'modal' | 'panel';

/**
 * React hook to automatically assign assist IDs to elements
 * 
 * @param kind - Type of assist element (route, view, modal, panel)
 * @param typeId - Stable type ID (e.g., "route:product", "modal:login")
 * @returns Ref to attach to the element
 * 
 * @example
 * ```tsx
 * function ProductView() {
 *   const viewRef = useAssistId('view', 'view:productDetails');
 *   return <section ref={viewRef}>...</section>;
 * }
 * ```
 */
export function useAssistId(
  kind: AssistType,
  typeId: string
): MutableRefObject<HTMLElement | null> {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Set the type ID attribute
    const attributeName = `data-assist-${kind}`;
    el.setAttribute(attributeName, typeId);

    // Generate instance ID if not already set
    const instanceAttr = `${attributeName}-instance`;
    if (!el.getAttribute(instanceAttr)) {
      const prefix = kind === 'route' ? 'ri_' : 
                     kind === 'view' ? 'vi_' : 
                     kind === 'modal' ? 'mi_' : 'pi_';
      const instanceId = prefix + generateRandomId(10);
      el.setAttribute(instanceAttr, instanceId);
    }

    // Trigger service registration
    const event = new CustomEvent('assist:registered', {
      detail: { element: el, kind, typeId },
    });
    document.dispatchEvent(event);
  }, [kind, typeId]);

  return ref;
}

/**
 * Hook for form fields to get agent-aware field IDs
 * 
 * @param fieldName - Field name (e.g., "email", "firstName")
 * @returns Object with data attributes
 */
export function useAssistField(fieldName: string) {
  return {
    'data-assist-field': `f:${fieldName}`,
  };
}

/**
 * Generate random ID
 */
function generateRandomId(length: number): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  return result;
}

export default useAssistId;






