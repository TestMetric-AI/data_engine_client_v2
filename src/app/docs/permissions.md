# Dynamic Permission System

This system allows for role-based access control (RBAC) where permissions are assigned to roles in the database, while the code only enforces the *requirement* of a permission.

## How it Works

1.  **Code (Locks)**: Developers protect routes or actions using `requirePermission("CODE")`.
    ```typescript
    // in layout.tsx or server action
    await requirePermission("VIEW_MANAGEMENT");
    ```

2.  **Database (Keys)**: Administrators assign the `VIEW_MANAGEMENT` permission to Roles (e.g., "Admin", "Manager") via the database.
    *   This means you can grant access to new roles *without deploying code*.

3.  **Authentication**:
    *   When a user logs in, their permissions (flattened from all their roles) are loaded into the Session/JWT.
    *   This ensures checking permissions is fast (no DB call on every page load).

## Adding a New Permission

### 1. Register the Permission
Add the permission to `prisma/seed.ts` (or use a UI manager if available) to ensure it exists in the Database.

```typescript
const PERMISSIONS = [
    // ... existing
    { name: "NEW_FEATURE_ACCESS", description: "Access to new feature" },
];
```

Run `npx prisma db seed` to update the DB.

### 2. Protect the Route
In your Page, Layout, or Action:

```typescript
import { requirePermission } from "@/lib/auth-guards";

export default async function MyPage() {
    await requirePermission("NEW_FEATURE_ACCESS");
    // ...
}
```

## Assigning Permissions

Currently, permissions are assigned via `prisma/seed.ts` or direct DB manipulation.
To give a role access:
1.  Find the Role ID.
2.  Find the Permission ID.
3.  Connect them in Prisma:
    ```typescript
    await prisma.role.update({
        where: { name: "manager" },
        data: {
            permissions: {
                connect: { name: "NEW_FEATURE_ACCESS" }
            }
        }
    });
    ```
