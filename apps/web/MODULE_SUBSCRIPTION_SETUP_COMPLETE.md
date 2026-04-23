# Module & Subscription Tier Management - Complete Setup

## ✅ New Files Created

### Services
1. **`lib/api/services/moduleService.ts`** - Complete Module CRUD
2. **Updated `lib/api/services/subscriptionService.ts`** - Added Tier + Group Subscription CRUD

### Hooks
1. **`lib/api/hooks/useModules.ts`** - Complete Module hooks
2. **Updated `lib/api/hooks/useSubscription.ts`** - Added Tier + Group Subscription hooks

---

## 📊 Module Service & Hooks

### Module Service Functions

```typescript
// Query Functions
getModulesAll(moduleVersion?: number) → Module[]
getModulesByScope(scope, moduleVersion?) → Module[]
getModuleByKey(moduleKey, moduleVersion?) → Module

// CRUD Operations
createModule(payload) → Module
updateModule(moduleId, payload) → Module
deleteModule(moduleId) → Module
```

### Module Hooks

```typescript
// Queries
useModulesAll(moduleVersion?, options?) → { data, isLoading, error }
useModulesByScope(scope, moduleVersion?, options?) → { data, isLoading, error }
useModuleByKey(moduleKey, moduleVersion?, options?) → { data, isLoading, error }

// Mutations
useCreateModule(options?) → { mutateAsync, isPending, error }
useUpdateModule(options?) → { mutateAsync, isPending, error }
useDeleteModule(options?) → { mutateAsync, isPending, error }
```

### Module Types

```typescript
interface Module {
  id: string;
  moduleKey: string;
  displayName: string;
  description?: string;
  scope: 'SUPERADMIN' | 'GROUP' | 'ENTITY';
  menu: string;
  isMenuVisible?: boolean;
  actions: ModuleAction[];
  createdAt: string;
  updatedAt: string;
}

interface ModuleAction {
  id: string;
  actionName: string;
  permissionId: string;
}

interface CreateModulePayload {
  moduleKey: string;
  displayName: string;
  description?: string;
  scope?: 'SUPERADMIN' | 'GROUP' | 'ENTITY';
  menu: string;
  isMenuVisible?: boolean;
}

interface UpdateModulePayload {
  displayName?: string;
  description?: string;
  scope?: string;
  menu?: string;
  isMenuVisible?: boolean;
}
```

---

## 💳 Subscription Tier Service & Hooks

### New Subscription Service Functions

```typescript
// Tier CRUD (Superadmin)
getSubscriptionTierById(tierId) → SubscriptionTierDetail
createSubscriptionTier(payload) → SubscriptionTierDetail
updateSubscriptionTier(tierId, payload) → SubscriptionTierDetail
deleteSubscriptionTier(tierId) → { id, name, message }

// Group Subscription CRUD (Admin/Superadmin)
getGroupSubscription(groupId) → GroupSubscription
createGroupSubscription(groupId, payload) → GroupSubscription
updateGroupSubscription(groupId, payload) → GroupSubscription
deleteGroupSubscription(groupId) → { id, groupId, message }
```

### New Subscription Hooks

```typescript
// Tier Hooks
useSubscriptionTierById(tierId, options?) → { data, isLoading, error }
useCreateSubscriptionTier(options?) → { mutateAsync, isPending, error }
useUpdateSubscriptionTier(options?) → { mutateAsync, isPending, error }
useDeleteSubscriptionTier(options?) → { mutateAsync, isPending, error }

// Group Subscription Hooks
useGroupSubscription(groupId, options?) → { data, isLoading, error }
useCreateGroupSubscription(options?) → { mutateAsync, isPending, error }
useUpdateGroupSubscription(options?) → { mutateAsync, isPending, error }
useDeleteGroupSubscription(options?) → { mutateAsync, isPending, error }
```

### New Subscription Types

```typescript
interface SubscriptionTierDetail {
  id: string;
  name: string;
  description?: string;
  maxUsers: number;
  maxEntities: number;
  maxTransactionsMonth: number;
  maxStorageGB: number;
  maxApiRatePerHour: number;
  apiAccess: boolean;
  webhooks: boolean;
  sso: boolean;
  customBranding: boolean;
  prioritySupport: boolean;
  createdAt: string;
  updatedAt: string;
}

interface GroupSubscription {
  id: string;
  groupId: string;
  subscriptionTierId: string;
  tier?: SubscriptionTierDetail;
  tierName: string;
  maxUsers: number;
  maxEntities: number;
  maxTransactionsMonth: number;
  maxStorageGB: number;
  maxApiRatePerHour: number;
  startDate: string;
  billingStartDate: string;
  billingEndDate?: string;
  renewalDate?: string;
  isActive: boolean;
  usedUsers: number;
  usedEntities: number;
  usedTransactionsMonth: number;
  usedStorageGB: number;
  history?: Array<{
    id: string;
    previousTierName: string;
    newTierName: string;
    changeReason: string;
    createdAt: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface CreateSubscriptionTierPayload {
  name: string;
  description?: string;
  maxUsers: number;
  maxEntities: number;
  maxTransactionsMonth: number;
  maxStorageGB: number;
  maxApiRatePerHour: number;
  apiAccess?: boolean;
  webhooks?: boolean;
  sso?: boolean;
  customBranding?: boolean;
  prioritySupport?: boolean;
}

interface UpdateSubscriptionTierPayload {
  // All fields optional
  name?: string;
  description?: string;
  maxUsers?: number;
  maxEntities?: number;
  maxTransactionsMonth?: number;
  maxStorageGB?: number;
  maxApiRatePerHour?: number;
  apiAccess?: boolean;
  webhooks?: boolean;
  sso?: boolean;
  customBranding?: boolean;
  prioritySupport?: boolean;
}

interface CreateGroupSubscriptionPayload {
  subscriptionTierId: string;
  reason?: string;
}

interface UpdateGroupSubscriptionPayload {
  subscriptionTierId?: string;
  isActive?: boolean;
  reason?: string;
}
```

---

## 🎛️ Cache Strategy

### Module Caching
- **Key**: `['modules', 'all', moduleVersion]` or scope variant
- **TTL**: 30 minutes
- **Version-based**: Invalidated when module version increments
- **Invalidation**: All module queries on CREATE/UPDATE/DELETE

### Subscription Tier Caching
- **Key**: `['subscription', 'tiers']` or `['subscription', 'tier', tierId]`
- **TTL**: 1 hour
- **Invalidation**: All tier queries on CREATE/UPDATE/DELETE

### Group Subscription Caching
- **Key**: `['subscription', 'group', groupId]`
- **TTL**: 5 minutes
- **Invalidation**: On UPDATE/DELETE + whoami refresh

---

## 🔗 Usage Examples

### Create a Module

```typescript
import { useCreateModule } from '@/lib/api/hooks/useModules';

export function CreateModuleForm() {
  const createModule = useCreateModule();
  const [form, setForm] = useState({
    moduleKey: '',
    displayName: '',
    description: '',
    menu: '',
    scope: 'ENTITY',
    isMenuVisible: true
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createModule.mutateAsync(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={createModule.isPending}>
        Create Module
      </button>
    </form>
  );
}
```

### Fetch All Modules

```typescript
import { useModulesAll } from '@/lib/api/hooks/useModules';

export function ModuleListPage() {
  const { data: modules, isLoading } = useModulesAll();

  if (isLoading) return <div>Loading modules...</div>;

  return (
    <div>
      {modules?.map(module => (
        <div key={module.id}>{module.displayName}</div>
      ))}
    </div>
  );
}
```

### Create Subscription Tier (Superadmin)

```typescript
import { useCreateSubscriptionTier } from '@/lib/api/hooks/useSubscription';

export function CreateTierForm() {
  const createTier = useCreateSubscriptionTier();
  const [form, setForm] = useState({
    name: '',
    description: '',
    maxUsers: 10,
    maxEntities: 20,
    maxTransactionsMonth: 10000,
    maxStorageGB: 50,
    maxApiRatePerHour: 100,
    apiAccess: false,
    webhooks: false,
    sso: false,
    customBranding: false,
    prioritySupport: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    await createTier.mutateAsync(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      <button type="submit" disabled={createTier.isPending}>
        Create Tier
      </button>
    </form>
  );
}
```

### Assign Subscription to Group

```typescript
import { useCreateGroupSubscription } from '@/lib/api/hooks/useSubscription';

export function AssignSubscriptionForm({ groupId }) {
  const assignSub = useCreateGroupSubscription();
  const [tierId, setTierId] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    await assignSub.mutateAsync({
      groupId,
      payload: {
        subscriptionTierId: tierId,
        reason: 'Onboarding'
      }
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <select value={tierId} onChange={(e) => setTierId(e.target.value)}>
        <option value="">Select tier...</option>
        {/* Tier options */}
      </select>
      <button type="submit" disabled={assignSub.isPending}>
        Assign Subscription
      </button>
    </form>
  );
}
```

---

## 🔐 Authorization Requirements

### Module Operations
- **GET** endpoints: Requires authentication
- **POST/PATCH/DELETE**: Requires admin/superadmin role
- Cache invalidation: Automatic on mutations

### Subscription Tier Operations
- **GET** by ID: Requires authentication
- **POST/PATCH/DELETE**: Requires **superadmin** role only
- Cannot delete if has active subscriptions

### Group Subscription Operations
- **GET**: Requires group admin or superadmin
- **POST**: Requires group admin or superadmin
- **PATCH**: Requires group admin or superadmin
- **DELETE**: Requires **superadmin** role only
- Cascades invalidation to whoami on updates

---

## ✨ Key Features

✅ **Version-based caching** - Modules auto-invalidate on version change  
✅ **Cascading invalidation** - Related queries updated automatically  
✅ **Toast notifications** - Success/error feedback on all operations  
✅ **Modal integration** - Pre-configured for your modal system  
✅ **Full TypeScript** - All types exported and documented  
✅ **Permission checking** - Authorization handled by backend  
✅ **Error handling** - Standard error responses for all scenarios  
✅ **Query parameters** - Version support for cache control  

---

## 📁 File Structure

```
lib/api/
├── services/
│   ├── moduleService.ts               ✅ NEW
│   ├── subscriptionService.ts         ✅ UPDATED
│   └── ... (others)
└── hooks/
    ├── useModules.ts                  ✅ NEW
    ├── useSubscription.ts             ✅ UPDATED
    └── ... (others)
```

---

## 🎯 Next Steps

All services and hooks are ready for component development:

1. **Module Management Page**
   - List modules by scope
   - Create/edit/delete modules
   - Display module actions and permissions

2. **Subscription Tier Admin**
   - List all tiers
   - Create new tiers
   - Update tier features
   - Delete old tiers (if no subscriptions)

3. **Group Subscription Manager**
   - View current subscription
   - Assign tier to group
   - Change tier
   - Deactivate/reactivate subscription

All hooks auto-integrate with your modal system and toast notifications. Ready to build! 🚀
