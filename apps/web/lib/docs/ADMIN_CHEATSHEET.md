# Admin System - Quick Reference Cheat Sheet

## 🎯 Most Common Operations

### Fetch Subscriptions
```typescript
import { useSubscriptionTiers, useCurrentSubscription } from '@/lib/api/hooks/useSubscription';

// Get all tiers
const { data: tiers } = useSubscriptionTiers();

// Get current subscription
const { data: current, isLoading } = useCurrentSubscription();
```

### Fetch All Roles
```typescript
import { useRoles, useAllPermissions } from '@/lib/api/hooks/useRoles';

// List all roles
const { data: roles } = useRoles();

// Get all available permissions (for form)
const { data: modules } = useAllPermissions();
```

### Fetch All Users
```typescript
import { useUsers } from '@/lib/api/hooks/useUsers';

// All users
const { data: users } = useUsers();

// Only active users
const { data: activeUsers } = useUsers(true);
```

---

## ✏️ Most Common Forms

### Create Role Form
```typescript
const { data: modules } = useAllPermissions();
const createRole = useCreateRole();

const [form, setForm] = useState({
  name: '',
  description: '',
  permissionIds: [] as string[]
});

const handleSubmit = async (e) => {
  e.preventDefault();
  await createRole.mutateAsync(form);
};

return (
  <form onSubmit={handleSubmit}>
    <input 
      value={form.name}
      onChange={(e) => setForm({...form, name: e.target.value})}
      placeholder="Role name"
    />
    <textarea
      value={form.description}
      onChange={(e) => setForm({...form, description: e.target.value})}
      placeholder="Description"
    />
    
    {/* Permission checkboxes */}
    {modules?.map(mod => (
      <div key={mod.moduleId}>
        <h4>{mod.moduleName}</h4>
        {mod.actions.map(action => (
          <label key={action.id}>
            <input
              type="checkbox"
              checked={form.permissionIds.includes(action.id)}
              onChange={(e) => {
                if (e.target.checked) {
                  form.permissionIds.push(action.id);
                } else {
                  form.permissionIds = form.permissionIds.filter(p => p !== action.id);
                }
                setForm({...form});
              }}
            />
            {action.actionName}
          </label>
        ))}
      </div>
    ))}
    
    <button type="submit" disabled={createRole.isPending}>
      Create Role
    </button>
  </form>
);
```

### Create User Form (Single)
```typescript
const { data: roles } = useRoles();
const createUser = useCreateUser();

const [form, setForm] = useState({
  email: '',
  firstName: '',
  lastName: '',
  department: '',
  roleId: '',
  requirePasswordChange: true,
  sendWelcomeEmail: true
});

const handleSubmit = async (e) => {
  e.preventDefault();
  await createUser.mutateAsync(form);
};

return (
  <form onSubmit={handleSubmit}>
    <input
      type="email"
      value={form.email}
      onChange={(e) => setForm({...form, email: e.target.value})}
      placeholder="Email"
      required
    />
    <input
      value={form.firstName}
      onChange={(e) => setForm({...form, firstName: e.target.value})}
      placeholder="First Name"
    />
    <input
      value={form.lastName}
      onChange={(e) => setForm({...form, lastName: e.target.value})}
      placeholder="Last Name"
    />
    <input
      value={form.department}
      onChange={(e) => setForm({...form, department: e.target.value})}
      placeholder="Department"
    />
    
    <select
      value={form.roleId}
      onChange={(e) => setForm({...form, roleId: e.target.value})}
      required
    >
      <option value="">Select Role</option>
      {roles?.map(role => (
        <option key={role.id} value={role.id}>
          {role.name}
        </option>
      ))}
    </select>
    
    <label>
      <input
        type="checkbox"
        checked={form.requirePasswordChange}
        onChange={(e) => setForm({...form, requirePasswordChange: e.target.checked})}
      />
      Require password change on login
    </label>
    
    <label>
      <input
        type="checkbox"
        checked={form.sendWelcomeEmail}
        onChange={(e) => setForm({...form, sendWelcomeEmail: e.target.checked})}
      />
      Send welcome email
    </label>
    
    <button type="submit" disabled={createUser.isPending}>
      Create User
    </button>
  </form>
);
```

### Bulk Create Users Form
```typescript
const createUser = useCreateUser();

const [emails, setEmails] = useState('');
const [roleId, setRoleId] = useState('');

const handleSubmit = async (e) => {
  e.preventDefault();
  await createUser.mutateAsync({
    emails,
    roleId,
    sendWelcomeEmail: true
  });
};

return (
  <form onSubmit={handleSubmit}>
    <textarea
      value={emails}
      onChange={(e) => setEmails(e.target.value)}
      placeholder="john@a.com, jane@a.com, bob@a.com"
      rows={5}
    />
    <select value={roleId} onChange={(e) => setRoleId(e.target.value)} required>
      <option value="">Select Role</option>
      {/* roles dropdown */}
    </select>
    <button type="submit" disabled={createUser.isPending}>
      Create Users
    </button>
  </form>
);
```

### Upgrade Subscription
```typescript
const { data: tiers } = useSubscriptionTiers();
const { data: current } = useCurrentSubscription();
const upgrade = useUpgradeSubscription();

const handleUpgrade = async (tierId: string) => {
  await upgrade.mutateAsync(tierId);
};

return (
  <div>
    <p>Current: {current?.tierName}</p>
    {tiers?.map(tier => (
      <div key={tier.id}>
        <h3>{tier.name}</h3>
        <button
          onClick={() => handleUpgrade(tier.id)}
          disabled={upgrade.isPending || current?.subscriptionTierId === tier.id}
        >
          {current?.subscriptionTierId === tier.id ? 'Current Plan' : 'Switch'}
        </button>
      </div>
    ))}
  </div>
);
```

---

## 🗑️ Common Delete Operations

### Delete Role
```typescript
const deleteRole = useDeleteRole();

const handleDelete = async (roleId: string) => {
  if (confirm('Delete this role?')) {
    await deleteRole.mutateAsync(roleId);
  }
};
```

### Delete User
```typescript
const deleteUser = useDeleteUser();

const handleDelete = async (userId: string) => {
  if (confirm('Deactivate this user?')) {
    await deleteUser.mutateAsync(userId);
  }
};
```

---

## ✏️ Common Update Operations

### Update Role
```typescript
const updateRole = useUpdateRole();

const handleUpdate = async (roleId: string, name: string, permissionIds: string[]) => {
  await updateRole.mutateAsync({
    roleId,
    payload: {
      name,
      permissionIds
    }
  });
};
```

### Update User
```typescript
const updateUser = useUpdateUser();

const handleUpdate = async (userId: string, roleId: string) => {
  await updateUser.mutateAsync({
    userId,
    payload: { roleId }
  });
};
```

---

## 🛡️ Subscription Limits

### Check Before Creating User
```typescript
const checkLimit = useCheckUserLimit();
const create = useCreateUser();

const handleSubmit = async (count: number, formData) => {
  try {
    const result = await checkLimit.mutateAsync(count);
    if (!result.allowed) {
      alert(result.message);
      return;
    }
    await create.mutateAsync(formData);
  } catch (error) {
    console.error(error);
  }
};
```

### Check Before Creating Entity
```typescript
import { useCheckEntityLimit } from '@/lib/api/hooks/useSubscription';

const checkLimit = useCheckEntityLimit();

const canCreateEntity = await checkLimit.mutateAsync(1);
```

---

## 📊 Common Display Patterns

### Usage Progress Bar
```typescript
const { data: subscription } = useCurrentSubscription();

const progress = subscription?.usage?.usersPercentage || 0;
const color = progress > 80 ? 'red' : progress > 50 ? 'yellow' : 'green';

return (
  <div>
    <p>{subscription?.usedUsers} / {subscription?.maxUsers} users</p>
    <progress value={progress} max={100} style={{color}} />
  </div>
);
```

### Role Permission Display
```typescript
const { data: roles } = useRoles();

return (
  <ul>
    {roles?.map(role => (
      <li key={role.id}>
        <h3>{role.name}</h3>
        <p>{role.permissionIds.length} permissions</p>
        <div>
          {role.permissions.map(perm => (
            <span key={perm.moduleKey}>
              {perm.moduleName}
            </span>
          ))}
        </div>
      </li>
    ))}
  </ul>
);
```

### User Status Badge
```typescript
const { data: users } = useUsers();

return (
  <table>
    <tbody>
      {users?.map(user => (
        <tr key={user.id}>
          <td>{user.email}</td>
          <td>
            <span className={user.isActive ? 'text-green-600' : 'text-red-600'}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </td>
          {user.requirePasswordChange && (
            <td className="text-yellow-600">Password change required</td>
          )}
        </tr>
      ))}
    </tbody>
  </table>
);
```

---

## 🔄 Loading States

### Show Spinner While Loading
```typescript
const { data, isLoading } = useRoles();

if (isLoading) return <div className="spinner">Loading roles...</div>;

return <RolesList roles={data} />;
```

### Disable Button While Submitting
```typescript
const mutation = useCreateRole();

<button disabled={mutation.isPending}>
  {mutation.isPending ? 'Creating...' : 'Create Role'}
</button>
```

### Show Error Message
```typescript
const { data, error } = useUsers();

if (error) {
  return (
    <div className="error">
      Failed to load users: {error.message}
    </div>
  );
}
```

---

## 🎨 Component Skeleton

### Basic Roles Page
```typescript
'use client';
import { useRoles, useAllPermissions, useCreateRole } from '@/lib/api/hooks/useRoles';

export default function RolesPage() {
  const { data: roles, isLoading: rolesLoading } = useRoles();
  const { data: modules } = useAllPermissions();
  const createRole = useCreateRole();

  if (rolesLoading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Roles</h1>
      
      {/* Create form goes here */}
      {/* Roles list goes here */}
    </div>
  );
}
```

### Basic Users Page
```typescript
'use client';
import { useUsers, useRoles, useCreateUser } from '@/lib/api/hooks/useUsers';
import { useCheckUserLimit } from '@/lib/api/hooks/useSubscription';

export default function UsersPage() {
  const { data: users, isLoading } = useUsers();
  const { data: roles } = useRoles();
  const checkLimit = useCheckUserLimit();
  const createUser = useCreateUser();

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold">Users</h1>
      
      {/* Create form goes here */}
      {/* Users list goes here */}
    </div>
  );
}
```

---

## 📝 Common Error Messages

```typescript
// User not found
"User not found"

// Duplicate email
"User with this email already exists"

// Role not found
"Role not found"

// Cannot delete system role
"System roles cannot be deleted"

// Cannot delete role with users
"Cannot delete role. 5 users assigned to this role."

// User limit reached
"User limit (10) reached for Starter plan. Upgrade to add more users."

// Invalid subscription tier
"Subscription tier not found"
```

---

## 🚀 Performance Tips

1. **Minimize refetches**: Hooks cache automatically (5min for lists, 1h for static data)
2. **Use enabled option**: Only fetch when needed
   ```typescript
   const { data } = useRole(roleId, { enabled: !!roleId });
   ```
3. **Batch checks**: Check limits before bulk operations
4. **Pagination**: Use for large lists (subscription history)
5. **Debounce search**: Not built-in, add manually if needed

---

## 💡 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Data not updating after mutation | Check if invalidateQueries is set in hook options |
| Modal doesn't close | Ensure MODAL constant is correct in modal-data.ts |
| Toast not showing | Check if hook onSuccess/onError is being called |
| Button stays disabled | Check if mutation.isPending status is being used |
| Data loads but shows old | Check staleTime configuration for query |
| 403 Forbidden error | User doesn't have admin role for operation |
| 400 Bad Request | Check payload shape matches service interface |

---

Ready to build! Refer to ADMIN_INTEGRATION_GUIDE.md for detailed API docs. 🎉
