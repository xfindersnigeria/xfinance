import { Button } from "@/components/ui/button";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import RolesStatCardSmall from "./RolesStatCardSmall";
import { useRoleStats } from "@/lib/api/hooks/useRoleStats";

export default function RolesHeader() {
  const { openModal } = useModal();

  const handleCreateRole = () => {
    openModal(MODAL.ADMIN_ROLE_CREATE);
  };

  const { data: stats, isLoading } = useRoleStats();

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">Role Management</h3>
          <p className="text-sm text-gray-600">
            Create and manage roles with granular permissions
          </p>
        </div>
        <Button
          onClick={handleCreateRole}
          className="bg-primary hover:bg-primary/80"
        >
          Create Role
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <RolesStatCardSmall
          title="System Roles"
          value={isLoading ? '...' : stats?.systemRoles ?? 0}
          subtitle="Predefined roles"
        />
        <RolesStatCardSmall
          title="Custom Roles"
          value={isLoading ? '...' : stats?.customRoles ?? 0}
          subtitle="User-created roles"
        />
        <RolesStatCardSmall
          title="Total Roles"
          value={isLoading ? '...' : stats?.totalRoles ?? 0}
          subtitle="All roles"
        />
      </div>
    </div>
  );
}
