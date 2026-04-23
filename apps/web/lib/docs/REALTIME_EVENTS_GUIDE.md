/**
 * 🚀 HOW TO ADD NEW REALTIME EVENTS
 * 
 * When backend team adds a new pubsub event, follow these 3 simple steps:
 */

// ============================================================================
// STEP 1: Add Event Type Definition
// ============================================================================
// File: lib/types/realtimeEvents.ts

// 1a. Add event name to RealtimeEventType union
export type RealtimeEventType = 
  | 'whoami-invalidated'
  | 'permissions-changed'
  | 'menus-invalidated'
  | 'entity-added'
  | 'entity-removed'
  | 'entity-updated'
  | 'user-role-changed'
  | 'invoice-created';  // ← NEW EVENT

// 1b. Add event payload interface
export interface RealtimeEventPayload {
  // ... existing events ...

  'invoice-created': {
    type: 'invoice-created';
    groupId: string;
    entityId: string;
    invoiceId: string;
    invoiceNumber: string;
    createdBy: string;
    timestamp: string;
  };
}

// ============================================================================
// STEP 2: Add Socket Listener
// ============================================================================
// File: lib/api/websocket.ts

// In setupEventListeners() function, add:

socket.on('invoice-created', (data: RealtimeEventPayload['invoice-created']) => {
  console.log('[Event] invoice-created:', data.invoiceNumber);
  
  window.dispatchEvent(
    new CustomEvent('realtime-event', {
      detail: { type: 'invoice-created', payload: data },
    })
  );
});

// ============================================================================
// STEP 3: Add Event Handler
// ============================================================================
// File: lib/hooks/useRealtimeSync.ts

// In handleRealtimeEvent() callback, add:

else if (type === 'invoice-created') {
  console.log('[Handler] invoice-created:', payload.invoiceNumber);
  // Decide what to do:
  // - Show toast notification
  // - Refetch invoices list
  // - Update UI cache
  // - Redirect to invoice
  
  // Example: If you have TanStack Query, invalidate the cache:
  // queryClient.invalidateQueries({ queryKey: ['invoices', payload.entityId] });
  
  // Or show a toast:
  // toast.success(`Invoice ${payload.invoiceNumber} created by ${payload.createdBy}`);
}

// ============================================================================
// THAT'S IT! ✨
// ============================================================================
// 
// The event will now:
// 1. Be received from WebSocket
// 2. Be dispatched as a custom event
// 3. Be caught by useRealtimeSync hook
// 4. Trigger your handler function
// 5. Update UI in real-time with NO page reload
//

// ============================================================================
// EXAMPLE: TESTING THE NEW EVENT
// ============================================================================
// In browser console:

window.dispatchEvent(
  new CustomEvent('realtime-event', {
    detail: {
      type: 'invoice-created',
      payload: {
        type: 'invoice-created',
        groupId: 'test-group',
        entityId: 'test-entity',
        invoiceId: 'inv-123',
        invoiceNumber: 'INV-001',
        createdBy: 'john@company.com',
        timestamp: new Date().toISOString(),
      },
    },
  })
);

// Check console for "[Handler] invoice-created: INV-001" ✓

// ============================================================================
// COMMON EVENT PATTERNS
// ============================================================================

/**
 * 1. INVALIDATION EVENT
 * Backend says "something changed" but doesn't say what
 * Solution: Refetch affected data
 * 
 * Examples:
 * - 'whoami-invalidated' → refetch whoami
 * - 'menus-invalidated' → refetch whoami
 * - 'permissions-changed' → refetch whoami
 */

/**
 * 2. RESOURCE CREATED/UPDATED/DELETED
 * Backend says "a specific resource changed"
 * Solution: Invalidate related query cache or refetch that resource
 * 
 * Examples:
 * - 'invoice-created' → invalidate invoices cache
 * - 'entity-updated' → refetch whoami (entity is in context)
 * - 'user-added' → invalidate users list cache
 */

/**
 * 3. CONTEXT CHANGE
 * User's access/role has changed
 * Solution: Usually refetch whoami (everything changes)
 * 
 * Examples:
 * - 'user-role-changed' → refetch whoami
 * - 'entity-removed' → refetch whoami + maybe redirect
 */

/**
 * 4. SIMPLE NOTIFICATION
 * Just tell user something happened
 * Solution: Show toast, update UI, no data refetch needed
 * 
 * Examples:
 * - 'user-mentioned' → show toast
 * - 'task-completed' → show notification
 */

// ============================================================================
// DEBUGGING
// ============================================================================

// Monitor all realtime events in console:
window.addEventListener('realtime-event', (e: any) => {
  console.log('📡 Event:', e.detail.type, e.detail.payload);
});

// Check WebSocket connection:
// In SessionProvider console or mounted component:
// const { isConnected } = useRealtimeSync();
// console.log('WebSocket:', isConnected ? '✓' : '✗');

// View stored whoami:
// const whoami = useSessionStore((state) => state.whoami);
// console.log('Whoami:', whoami);
