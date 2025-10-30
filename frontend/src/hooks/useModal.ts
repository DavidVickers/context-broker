import { useState, useRef, useEffect } from 'react';
import { useAssistId } from './useAssistId';

export interface UseModalOptions {
  modalId: string; // e.g., "modal:login"
  autoFocus?: boolean; // Auto-focus first focusable element on open
  restoreFocus?: boolean; // Restore focus to previous element on close
}

/**
 * Hook for managing modals with agent awareness
 * 
 * @example
 * ```tsx
 * function LoginModal() {
 *   const { isOpen, open, close, modalRef } = useModal({ 
 *     modalId: 'modal:login',
 *     autoFocus: true 
 *   });
 *   
 *   return (
 *     <div ref={modalRef} hidden={!isOpen} role="dialog" aria-modal="true">
 *       <h2>Login</h2>
 *       <button onClick={close}>Close</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useModal(options: UseModalOptions) {
  const { modalId, autoFocus = true, restoreFocus = true } = options;
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useAssistId('modal', modalId);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  const open = () => {
    previousActiveElement.current = document.activeElement as HTMLElement;
    setIsOpen(true);
  };

  const close = () => {
    setIsOpen(false);
    if (restoreFocus && previousActiveElement.current) {
      previousActiveElement.current.focus();
    }
  };

  const toggle = () => {
    if (isOpen) {
      close();
    } else {
      open();
    }
  };

  // Auto-focus first focusable element when opened
  useEffect(() => {
    if (isOpen && autoFocus && modalRef.current) {
      const modal = modalRef.current;
      const focusable = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        (focusable[0] as HTMLElement).focus();
      }
    }
  }, [isOpen, autoFocus, modalRef]);

  // Update hidden attribute based on isOpen state
  useEffect(() => {
    if (modalRef.current) {
      modalRef.current.hidden = !isOpen;
    }
  }, [isOpen, modalRef]);

  return {
    isOpen,
    open,
    close,
    toggle,
    modalRef,
  };
}

export default useModal;


