import { getAllPermissions, getRoles } from "@/lib/services/roles";
import { PlusIcon, UserGroupIcon, ShieldCheckIcon, PencilIcon } from "@heroicons/react/24/outline";
import RolesPageClient from "./RolesPageClient";

export default async function RolesPage() {
    // Parallel data fetching
    const [roles, permissions] = await Promise.all([
        getRoles(),
        getAllPermissions(),
    ]);

    return (
        <RolesPageClient roles={roles} permissions={permissions} />
    );
}
