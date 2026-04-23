"use client";

// import { ReactNode } from 'react';
// import { useSessionStore } from '@/lib/store/session';
// import { PermissionKey } from '@/lib/utils/permissions';

// interface CanProps {
//   do: PermissionKey;
//   children: ReactNode;
//   fallback?: ReactNode;
// }

// export const Can = ({ do: key, children, fallback = null }: CanProps) => {
//   const hasPermission = useSessionStore((s) => s.hasPermission(key));
//   return hasPermission ? <>{children}</> : fallback;
// };

{/* <Can do="SALES_CUSTOMERS_CREATE"><Button>Create</Button></Can>
<Can do={PERMISSIONS.SALES_CUSTOMERS_CREATE}><Button>Create</Button></Can>
<Can do="sales:customers:create"><Button>Create</Button></Can> */}


// components/Can.tsx

import { ReactNode } from 'react';
import { useSessionStore } from '@/lib/store/session';
import { PermissionKey, PERMISSIONS } from '@/lib/utils/permissions';

type PermissionInput = PermissionKey | keyof typeof PERMISSIONS | string;

interface CanProps {
  do: PermissionInput;
  children: ReactNode;
  fallback?: ReactNode;
}

export const Can = ({ do: input, children, fallback = null }: CanProps) => {
  const hasPermissionSelector = useSessionStore((state) => state.hasPermission);

  let permissionString: string;

  if (typeof input === 'string') {
    // Case 1: Raw string "sales:customers:create"
    // Case 2: Constant key as string "SALES_CUSTOMERS_CREATE"
    permissionString = (PERMISSIONS as any)[input] ?? input;
  } else {
    // Should not reach here due to type, but safety
    permissionString = input as string;
  }

  const hasPermission = hasPermissionSelector(permissionString as PermissionKey);

  return hasPermission ? <>{children}</> : fallback;
};