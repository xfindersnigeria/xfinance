import { Button } from "@/components/ui/button";
import { useModal } from "@/components/providers/ModalProvider";
import { MODAL } from "@/lib/data/modal-data";
import UsersStatCardSmall from "./UsersStatCardSmall";
import { useUserStats } from "@/lib/api/hooks/useUsers";

export default function UsersHeader() {
  const { openModal } = useModal();

  const handleInviteUser = () => {
    openModal(MODAL.ADMIN_USER_CREATE);
  };

  const { data: stats, isLoading } = useUserStats();

  return (
    <div className="space-y-4">
      {/* Header section */}
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-lg font-semibold">Users</h3>
          <p className="text-sm text-gray-600">
            Manage user access and permissions
          </p>
        </div>
        <Button
          onClick={handleInviteUser}
          className="bg-primary hover:bg-primary/80"
        >
          Invite User
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UsersStatCardSmall
          title="Total Users"
          value={isLoading ? '...' : stats?.totalUsers ?? 0}
          subtitle="Across all roles"
        />
        <UsersStatCardSmall
          title="Active Users"
          value={isLoading ? '...' : stats?.activeUsers ?? 0}
          subtitle={`${isLoading ? '...' : stats?.activeUsers ?? 0} users active`}
        />
        <UsersStatCardSmall
          title="Roles"
          value={isLoading ? '...' : stats?.roles ?? 0}
          subtitle={`${isLoading ? '...' : stats?.roles ?? 0} unique roles`}
        />
        <UsersStatCardSmall
          title="Pending"
          value={isLoading ? '...' : stats?.pendingInvites ?? 0}
          subtitle={`${isLoading ? '...' : stats?.pendingInvites ?? 0} pending invites`}
        />
      </div>
    </div>
  );
}
