# Admin System Architecture

## Service Layer Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND COMPONENTS                           │
│  (Subscription, Roles & Users Management Pages)                  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    HOOKS LAYER                                    │
│  ┌────────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ useSubscription    │  │ useRoles         │  │ useUsers     │ │
│  ├────────────────────┤  ├──────────────────┤  ├──────────────┤ │
│  │ - Tiers Query      │  │ - AllPermissions │  │ - List Query │ │
│  │ - Current Query    │  │ - List Query     │  │ - Get Query  │ │
│  │ - Upgrade Mutation │  │ - Create Mutate  │  │ - Create Mut │ │
│  │ - History Query    │  │ - Update Mutate  │  │ - Update Mut │ │
│  │ - Check Mutations  │  │ - Delete Mutate  │  │ - Delete Mut │ │
│  └────────────────────┘  └──────────────────┘  └──────────────┘ │
│                    (TanStack React Query)                         │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICES LAYER                                 │
│  ┌──────────────────────────┐  ┌─────────────────────────────┐  │
│  │ subscriptionService      │  │ roleService                 │  │
│  ├──────────────────────────┤  ├─────────────────────────────┤  │
│  │ getSubscriptionTiers()   │  │ getAllPermissions()         │  │
│  │ getCurrentSubscription() │  │ createRole()                │  │
│  │ upgradeSubscription()    │  │ getRoles()                  │  │
│  │ getSubscriptionHistory() │  │ getRole()                   │  │
│  │ checkUserLimit()         │  │ updateRole()                │  │
│  │ checkEntityLimit()       │  │ deleteRole()                │  │
│  │ checkTransactionLimit()  │  └─────────────────────────────┘  │
│  │ checkStorageLimit()      │           ┌──────────────────┐    │
│  └──────────────────────────┘           │ userService      │    │
│                                          ├──────────────────┤    │
│                                          │ createUser()     │    │
│                                          │ getUsers()       │    │
│                                          │ getUser()        │    │
│                                          │ updateUser()     │    │
│                                          │ deleteUser()     │    │
│                                          └──────────────────┘    │
│                    (API Client Wrapper)                           │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API CLIENTS & ENDPOINTS                        │
│  ┌──────────────────────────┐  ┌─────────────────────────────┐  │
│  │ Subscription Endpoints   │  │ Role Endpoints              │  │
│  ├──────────────────────────┤  ├─────────────────────────────┤  │
│  │ GET /subscription/tiers  │  │ GET /roles/permissions/all  │  │
│  │ GET /subscription/current│  │ POST /roles                 │  │
│  │ POST /subscription/upgrade
│  │ GET /subscription/history│  │ GET /roles                  │  │
│  │ POST /subscription/check/*│  │ GET /roles/:id              │  │
│  └──────────────────────────┘  │ PUT /roles/:id              │  │
│                                 │ DELETE /roles/:id           │  │
│  ┌──────────────────────────┐  └─────────────────────────────┘  │
│  │ User Endpoints           │                                    │
│  ├──────────────────────────┤                                    │
│  │ POST /users (single bulk)│                                    │
│  │ GET /users               │                                    │
│  │ GET /users/:id           │                                    │
│  │ PUT /users/:id           │                                    │
│  │ DELETE /users/:id        │                                    │
│  └──────────────────────────┘                                    │
│                    (HTTP REST API)                                │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            ▼
                    ┌───────────────┐
                    │  BACKEND API  │
                    └───────────────┘
```

---

## Data Flow Example: Creating a Role

```
Component: RoleForm
    │
    ├─ useAllPermissions()
    │  └─ Query ──→ getAllPermissions() ──→ GET /roles/permissions/all
    │              └─ PermissionModule[] (cached 1 hour)
    │
    └─ useCreateRole()
       ├─ Form Submission ──→ mutation.mutateAsync(payload)
       │
       ├─ createRole(payload) ──→ POST /roles
       │  └─ payload: { name, description, permissionIds }
       │
       ├─ Success:
       │  ├─ Invalidate: roles/list
       │  ├─ Close Modal: ADMIN_ROLE_CREATE
       │  └─ Toast: "Role created successfully"
       │
       └─ Error:
          └─ Toast: error message
```

---

## Query Key Strategy

```
Subscription:
├─ ['subscription', 'tiers']
├─ ['subscription', 'current']
├─ ['subscription', 'history', page, limit]

Roles:
├─ ['roles', 'permissions', 'all']
├─ ['roles', 'list']
└─ ['roles', 'detail', roleId]

Users:
├─ ['users', 'list', isActive]
└─ ['users', 'detail', userId]
```

Invalidation triggers:
- POST /roles → invalidate roles/list
- PUT /roles/:id → invalidate roles/list + roles/detail/:id
- POST /users → invalidate users/list
- PUT /subscription/upgrade → invalidate subscription/current + whoami

---

## Component Integration Map

### Subscription Management Page
```typescript
Components:
├─ SubscriptionTierSelector
│  ├─ useSubscriptionTiers() → Display available packages
│  └─ useCurrentSubscription() → Show current plan + usage
│
├─ CurrentUsageStats
│  └─ useCurrentSubscription() → Display progress bars
│
├─ UpgradeButton
│  └─ useUpgradeSubscription() → Handle tier change
│
└─ SubscriptionHistory
   └─ useSubscriptionHistory() → Audit trail table
```

### Roles Management Page
```typescript
Components:
├─ RolesHeader
│  └─ useRoles() → Count total roles
│
├─ RolesList
│  └─ useRoles() → Map roles with Edit/Delete buttons
│
├─ RoleForm (Create/Edit Modal)
│  ├─ useAllPermissions() → Build permission selector
│  ├─ useCreateRole() → On form submit
│  └─ useUpdateRole() → On form submit (edit mode)
│
├─ DeleteRoleButton
│  └─ useDeleteRole() → Confirmation dialog
│
└─ PermissionMatrix
   └─ useAllPermissions() → Organize permissions by module
```

### Users Management Page
```typescript
Components:
├─ UsersHeader
│  └─ useUsers() → Count total/active users
│
├─ UsersList
│  ├─ useUsers() → Map users with Edit/Delete buttons
│  └─ useCheckUserLimit() → Pre-check before create
│
├─ UserForm (Create/Edit Modal)
│  ├─ useRoles() → Populate role dropdown
│  ├─ useCreateUser() → On form submit (single)
│  ├─ useCreateUser() → On form submit (bulk)
│  └─ useUpdateUser() → On form submit (edit mode)
│
└─ DeleteUserButton
   └─ useDeleteUser() → Deactivation
```

---

## Mutation Patterns

### Pattern 1: Simple Mutation
```typescript
const mutation = useCreateRole();

const handleSubmit = async (formData) => {
  await mutation.mutateAsync(formData);
  // Toast auto-shown on success/error
  // Modal auto-closed on success
};
```

### Pattern 2: Mutation with Custom Handler
```typescript
const mutation = useCreateUser({
  onSuccess: (data) => {
    // Custom logic after success
    // + default success handler still runs
  },
  onError: (error) => {
    // Custom error handling
  }
});
```

### Pattern 3: Pre-flight Check
```typescript
// Check before mutation
const checkLimit = useCheckUserLimit();
const createUser = useCreateUser();

const handleSubmit = async (count) => {
  const { allowed } = await checkLimit.mutateAsync(count);
  if (!allowed) return;
  
  await createUser.mutateAsync(payload);
};
```

---

## Cache Strategy

### Subscription
- Tiers: 1 hour (static reference data)
- Current: 5 min (usage changes frequently)
- History: 5 min (audit log)

### Roles
- Permissions: 1 hour (permissions rarely change)
- List: 5 min (roles may be created/updated)
- Detail: 5 min (role details)

### Users
- List: 5 min (users may be created/updated)
- Detail: 5 min (user profile)

### Invalidation
- Any CREATE → invalidate list
- Any UPDATE → invalidate list + detail
- UPGRADE → invalidate subscription + whoami (auto-refresh menu)

---

## Error Scenarios

```
User Creates New User:
├─ Has admin role? → 403 Forbidden
├─ Hit user limit? → 400 Bad Request (checked before with useCheckUserLimit)
├─ Duplicate email? → 409 Conflict
└─ Success → 201 Created (auto-toast + modal close)

Admin Changes Role:
├─ Is system role? → 400 Bad Request
├─ Has users assigned? → 409 Conflict (on delete)
└─ Success → 200 OK

Admin Upgrades Subscription:
├─ Invalid tier ID? → 400 Bad Request
└─ Success → 200 OK + whoami refresh
```

---

## State Binding Summary

| Feature | Hook | Query Key | Stale Time | Invalidates |
|---------|------|-----------|-----------|-------------|
| Subscription Tiers | useSubscriptionTiers | ['subscription','tiers'] | 1h | - |
| Current Subscription | useCurrentSubscription | ['subscription','current'] | 5m | On upgrade |
| Subscription History | useSubscriptionHistory | ['subscription','history',...] | 5m | - |
| All Permissions | useAllPermissions | ['roles','permissions','all'] | 1h | - |
| Roles List | useRoles | ['roles','list'] | 5m | On CRUD |
| Single Role | useRole | ['roles','detail',id] | 5m | On CRUD |
| Users List | useUsers | ['users','list',isActive] | 5m | On CRUD |
| Single User | useUser | ['users','detail',id] | 5m | On CRUD |

Ready to build components! 🚀
