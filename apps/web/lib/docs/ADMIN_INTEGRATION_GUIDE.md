<!-- lib/docs/ADMIN_INTEGRATION_GUIDE.md -->

# Admin Management System - Integration Guide

Complete reference for using subscription, role, and user management services and hooks.

---

## Table of Contents

1. [Services Overview](#services-overview)
2. [Hooks Overview](#hooks-overview)
3. [Component Integration Patterns](#component-integration-patterns)
4. [Common Workflows](#common-workflows)
5. [Error Handling](#error-handling)

---

## Services Overview

### Subscription Service (`lib/api/services/subscriptionService.ts`)

Handles all subscription-related API calls.

#### Functions

**`getSubscriptionTiers(): Promise<SubscriptionTier[]>`**
- Fetch all available subscription packages
- Public endpoint (no auth required)
- Returns: Array of tier objects with features and limits

```typescript
import { getSubscriptionTiers } from '@/lib/api/services/subscriptionService';

const tiers = await getSubscriptionTiers();
```

**`getCurrentSubscription(): Promise<CurrentSubscription>`**
- Fetch current group's active subscription with usage stats
- Requires authentication
- Returns: Current subscription with usage breakdown

```typescript
import { getCurrentSubscription } from '@/lib/api/services/subscriptionService';

const subscription = await getCurrentSubscription();
console.log(subscription.usedUsers, subscription.maxUsers);
```

**`upgradeSubscription(tierId: string): Promise<CurrentSubscription>`**
- Upgrade or downgrade to a new tier
- Requires admin role
- Invalidates whoami automatically
- Returns: Updated subscription

**`getSubscriptionHistory(page, limit): Promise<SubscriptionHistoryResponse>`**
- Get audit trail of subscription changes
- Requires admin role
- Returns: Paginated history with user who made change

**`checkUserLimit(count: number): Promise<{ allowed: boolean; message?: string }>`**
- Pre-check if new users can be added
- Use before creating users
- Returns: `{ allowed: true }` or `{ allowed: false, message: "reason" }`

**Similar check functions:**
- `checkEntityLimit(count)` - Check entity creation limit
- `checkTransactionLimit(count)` - Check monthly transaction limit
- `checkStorageLimit(sizeGB)` - Check storage limit

---

### Role Service (`lib/api/services/roleService.ts`)

Handles all role-related API calls.

#### Functions

**`getAllPermissions(): Promise<PermissionModule[]>`**
- Fetch all available permissions organized by module
- Requires admin role
- Use to build permission selector UI
- Returns: Array of modules with actions

```typescript
import { getAllPermissions } from '@/lib/api/services/roleService';

const modules = await getAllPermissions();
// modules[0] = {
//   moduleId: "mod_1",
//   moduleKey: "items",
//   moduleName: "Inventory Items",
//   actions: [ { id, actionName } ]
// }
```

**`createRole(payload): Promise<Role>`**
- Create new role
- Requires admin role
- Validation: name (3-100), description (3-500), at least 1 permission
- Returns: Created role object

**`getRoles(): Promise<Role[]>`**
- Fetch all roles in the group
- Requires admin role
- Returns: Array of role objects

**`getRole(roleId): Promise<Role>`**
- Fetch single role by ID
- Requires admin role
- Returns: Role object with all permissions

**`updateRole(roleId, payload): Promise<Role>`**
- Update role details and permissions
- Requires admin role
- Cannot modify system roles
- Returns: Updated role

**`deleteRole(roleId): Promise<{ message: string }>`**
- Delete role
- Requires admin role
- Cannot delete if users assigned or if system role
- Returns: Confirmation message

---

### User Service (`lib/api/services/userService.ts`)

Handles all user-related API calls.

#### Functions

**`createUser(payload): Promise<User[]>`**
- Create single or bulk users
- Requires admin role
- Supports individual user creation with full details
- Supports bulk creation from comma-separated emails
- Returns: Array of created user objects

```typescript
// Single user
import { createUser } from '@/lib/api/services/userService';

const users = await createUser({
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  roleId: 'role_1',
  requirePasswordChange: true,
  sendWelcomeEmail: true
});

// Bulk users
const users = await createUser({
  emails: 'john@a.com, jane@a.com, bob@a.com',
  roleId: 'role_1',
  sendWelcomeEmail: true
});
```

**`getUsers(isActive?: boolean): Promise<User[]>`**
- Fetch all users in the group
- Requires admin role
- Optional: filter by active status
- Returns: Array of user objects

**`getUser(userId): Promise<User>`**
- Fetch single user by ID
- Admins can view anyone, users can view only themselves
- Returns: User object

**`updateUser(userId, payload): Promise<User>`**
- Update user details
- Admin can change: firstName, lastName, department, roleId, isActive, entityAccessIds
- User can change: firstName, lastName, department (own profile only)
- Returns: Updated user

**`deleteUser(userId): Promise<{ message: string }>`**
- Deactivate user (soft delete)
- Requires admin role
- User is marked inactive, not permanently deleted
- Returns: Confirmation message

---

## Hooks Overview

### Subscription Hooks (`lib/api/hooks/useSubscription.ts`)

**`useSubscriptionTiers(options?)`**
- Query hook for subscription tiers
- Caching: 1 hour stale time
- Use: Display available packages
- Enabled by default

```typescript
import { useSubscriptionTiers } from '@/lib/api/hooks/useSubscription';

const { data: tiers, isLoading, error } = useSubscriptionTiers();
```

**`useCurrentSubscription(options?)`**
- Query hook for current subscription
- Caching: 5 minute stale time
- Use: Display current plan and usage
- Requires authentication

**`useUpgradeSubscription(options?)`**
- Mutation hook for subscription upgrade
- Auto-invalidates: subscription/current, whoami
- Shows success/error toast
- Use: Handle tier change

```typescript
const mutation = useUpgradeSubscription();

const handleUpgrade = async (tierId: string) => {
  await mutation.mutateAsync(tierId);
};
```

**`useSubscriptionHistory(page, limit, options?)`**
- Query hook for subscription changes audit trail
- Caching: 5 minute stale time
- Paginated results
- Requires admin role

**Check Limit Hooks:**
- `useCheckUserLimit(options?)` - Mutation to check user limit
- `useCheckEntityLimit(options?)` - Mutation to check entity limit
- `useCheckTransactionLimit(options?)` - Mutation to check transaction limit
- `useCheckStorageLimit(options?)` - Mutation to check storage limit

---

### Role Hooks (`lib/api/hooks/useRoles.ts`)

**`useAllPermissions(options?)`**
- Query hook for all available permissions
- Caching: 1 hour (permissions rarely change)
- Use: Build permission selector UI
- Requires admin role

```typescript
import { useAllPermissions } from '@/lib/api/hooks/useRoles';

const { data: modules } = useAllPermissions();
```

**`useCreateRole(options?)`**
- Mutation hook for creating roles
- Auto-invalidates: roles/list
- Closes MODAL.ADMIN_ROLE_CREATE on success
- Shows success/error toast

```typescript
const createRoleMutation = useCreateRole();

const handleCreate = async (formData) => {
  await createRoleMutation.mutateAsync(formData);
};
```

**`useRoles(options?)`**
- Query hook for all roles in group
- Caching: 5 minute stale time
- Requires admin role

**`useRole(roleId, options?)`**
- Query hook for single role
- Only fetches if roleId is provided
- Requires admin role

**`useUpdateRole(options?)`**
- Mutation hook for updating role
- Takes: `{ roleId: string; payload: UpdateRolePayload }`
- Auto-invalidates: roles/list, roles/detail/{id}
- Closes MODAL.ADMIN_ROLE_EDIT on success

**`useDeleteRole(options?)`**
- Mutation hook for deleting role
- Takes: roleId string
- Auto-invalidates: roles/list
- Requires confirmation before deletion
- Closes MODAL.ADMIN_ROLE_DELETE on success

---

### User Hooks (`lib/api/hooks/useUsers.ts`)

**`useCreateUser(options?)`**
- Mutation hook for creating single or bulk users
- Auto-invalidates: users/list
- Closes MODAL.ADMIN_USER_CREATE on success
- Shows success/error toast with count

```typescript
import { useCreateUser } from '@/lib/api/hooks/useUsers';

const createUserMutation = useCreateUser();

// Single user
await createUserMutation.mutateAsync({
  email: 'john@example.com',
  firstName: 'John',
  lastName: 'Doe',
  roleId: 'role_1',
  requirePasswordChange: true,
  sendWelcomeEmail: true
});

// Bulk users
await createUserMutation.mutateAsync({
  emails: 'john@a.com, jane@a.com',
  roleId: 'role_1',
  sendWelcomeEmail: true
});
```

**`useUsers(isActive?, options?)`**
- Query hook for all users
- Caching: 5 minute stale time
- Optional: filter by active status

```typescript
const { data: users, isLoading } = useUsers(); // All users
const { data: activeUsers } = useUsers(true);  // Active only
const { data: inactiveUsers } = useUsers(false); // Inactive only
```

**`useUser(userId, options?)`**
- Query hook for single user
- Only fetches if userId is provided

**`useUpdateUser(options?)`**
- Mutation hook for updating user
- Takes: `{ userId: string; payload: UpdateUserPayload }`
- Auto-invalidates: users/list, users/detail/{id}
- Closes MODAL.ADMIN_USER_EDIT on success

**`useDeleteUser(options?)`**
- Mutation hook for deactivating user
- Takes: userId string
- Auto-invalidates: users/list
- Closes MODAL.ADMIN_USER_DELETE on success

---

## Component Integration Patterns

### Pattern 1: List with Fetch

```typescript
import { useRoles } from '@/lib/api/hooks/useRoles';

export function RolesList() {
  const { data: roles, isLoading, error } = useRoles();

  if (isLoading) return <div>Loading roles...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {roles?.map(role => (
        <div key={role.id}>{role.name}</div>
      ))}
    </div>
  );
}
```

### Pattern 2: Create with Mutation

```typescript
import { useCreateRole, useAllPermissions } from '@/lib/api/hooks/useRoles';

export function CreateRoleForm() {
  const { data: modules } = useAllPermissions();
  const createMutation = useCreateRole();
  const [formData, setFormData] = useState({ ... });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMutation.mutateAsync({
      ...formData,
      permissionIds: Array.from(selectedPermissions),
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
      {modules?.map(module => (
        <div key={module.moduleId}>
          <h3>{module.moduleName}</h3>
          {module.actions.map(action => (
            <label key={action.id}>
              <input
                type="checkbox"
                onChange={(e) => {
                  if (e.target.checked) {
                    selectedPermissions.add(action.id);
                  } else {
                    selectedPermissions.delete(action.id);
                  }
                  setSelectedPermissions(new Set(selectedPermissions));
                }}
              />
              {action.actionName}
            </label>
          ))}
        </div>
      ))}
      <button type="submit" disabled={createMutation.isPending}>
        Create Role
      </button>
    </form>
  );
}
```

### Pattern 3: Pre-flight Check

```typescript
import { useCheckUserLimit } from '@/lib/api/hooks/useSubscription';

export function InviteUsersForm() {
  const checkUserLimit = useCheckUserLimit();
  const createUser = useCreateUser();
  const [emails, setEmails] = useState('');

  const handleSubmit = async () => {
    const emailCount = emails.split(',').length;
    
    // Check limit first
    const { allowed, message } = await checkUserLimit.mutateAsync(emailCount);
    
    if (!allowed) {
      toast.error(message);
      return;
    }

    // Proceed with creation
    await createUser.mutateAsync({
      emails,
      roleId: 'role_1',
      sendWelcomeEmail: true
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <textarea value={emails} onChange={(e) => setEmails(e.target.value)} />
      <button type="submit">Invite Users</button>
    </form>
  );
}
```

---

## Common Workflows

### Workflow 1: User Onboarding Flow

```typescript
// 1. Check if can add new user
const canAdd = await checkUserLimit(1);
if (!canAdd) { /* show error */ }

// 2. Get all roles
const roles = await getRoles();

// 3. Create user with selected role
const user = await createUser({
  email, firstName, lastName, roleId,
  requirePasswordChange: true,
  sendWelcomeEmail: true
});

// 4. Optional: Show confirmation toast
toast.success(`User ${user[0].email} invited successfully`);
```

### Workflow 2: Role Setup Flow

```typescript
// 1. Fetch available permissions
const modules = await getAllPermissions();

// 2. Display permission matrix to admin
// (organize permissions by module)

// 3. Create role with selected permissions
const role = await createRole({
  name: 'Sales Manager',
  description: 'Can manage sales documents',
  permissionIds: selectedPermissionIds
});

// 4. Assign role to users
await updateUser(userId, { roleId: role.id });
```

### Workflow 3: Subscription Management Flow

```typescript
// 1. Fetch current subscription and available tiers
const [current, tiers] = await Promise.all([
  getCurrentSubscription(),
  getSubscriptionTiers()
]);

// 2. Display current usage in progress bars
// 3. Display available tiers
// 4. On upgrade selection:
const upgraded = await upgradeSubscription(selectedTierId);

// 5. Auto-refresh menu/permissions via whoami invalidation
// (handled by hook automatically)
```

---

## Error Handling

All hooks provide error state automatically:

```typescript
const { data, isPending, error } = useRoles();

if (error) {
  // Error object from fetch
  console.log(error.message);
  // Toast automatically shown by hook
}
```

For mutations with custom error handling:

```typescript
const mutation = useCreateRole({
  onError: (error) => {
    // Custom error handling
    if (error.message.includes('unique')) {
      // Handle uniqueness error
    }
  }
});
```

Common error scenarios:
- **403 Forbidden**: User lacks admin role
- **400 Bad Request**: Validation failed (check payload)
- **404 Not Found**: Resource deleted or inaccessible
- **409 Conflict**: Duplicate name or permission constraint

---

## Next Steps

1. **Build Subscription Management Page**
   - Use `useSubscriptionTiers` and `useCurrentSubscription`
   - Implement with your design system

2. **Build Role Manager**
   - Use `useAllPermissions`, `useRoles`, `useCreateRole`, `useUpdateRole`, `useDeleteRole`
   - Build permission matrix UI

3. **Build User Manager**
   - Use `useUsers`, `useCreateUser`, `useUpdateUser`, `useDeleteUser`
   - Add pre-flight check with `useCheckUserLimit`

All hooks are fully typed with TypeScript and ready for component implementation.
