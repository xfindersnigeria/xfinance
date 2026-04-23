"use client";

import React, { useState } from "react";
import { useDebounce } from "use-debounce";
import { CustomTable } from "@/components/local/custom/custom-table";
import UsersHeader from "../UsersHeader";
import { usersColumns } from "../UsersColumn";
// import { mockUsersData } from "../utils/data";
import { useCreateUser, useUsers } from "@/lib/api/hooks/useUsers";
import { useModal } from "@/components/providers/ModalProvider";
import { CustomModal } from "@/components/local/custom/modal";
import UsersForm from "./UsersForm";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";
import UserEditForm from "./UserEditForm";
import { useDeleteUser } from "@/lib/api/hooks/useUsers";
import { MODAL } from "@/lib/data/modal-data";
import { MODULES } from "@/lib/types/enums";

/**
 * Users list component
 * Displays all users with search, filtering, and pagination
 * TODO: Replace mockUsersData with actual useUsers API hook
 */
export default function Users() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const { isOpen: isModalOpen, openModal, closeModal } = useModal();

  // Use actual API hook
  const { data: userData = { data: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } }, isLoading: isLoadingUsers } = useUsers({
    search: debouncedSearchTerm,
    page,
    limit: pageSize,
  });
  // Map API data to table format
  const data = ((userData as any).data || []).map((user: any) => ({
    id: user.id,
    name: `${user.firstName} ${user.lastName}`,
    email: user.email,
    role: user.role?.name || user.systemRole,
    status: user.isActive ? "Active" : "Inactive",
    entityCount: user.entityCount || 0,
    raw: user, // keep raw user for modals
  }));
  const isLoading = isLoadingUsers;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page on search
  };

  // Placeholder for create user logic
  // Create user logic using API
  // const { mutateAsync: createUser, isPending: isCreatingUser } = useCreateUser();
  // const handleCreateUser = async (formData: any) => {
  //   setIsCreating(true);
  //   try {
  //     await createUser(formData);
  //   } finally {
  //     setIsCreating(false);
  //   }
  // };

  // Delete user logic
  const { mutate: deleteUser, status: deleteStatus } = useDeleteUser();

  // Render modals for each user (edit/delete)
  const renderUserModals = () => {
    return data.map((user: any) => (
      <>
        {/* Delete Modal */}
        <CustomModal
          key={"delete-" + user.id}
          title="Deactivate User"
          description={`Are you sure you want to deactivate ${user.name}?`}
          module={MODULES.ADMIN}
          open={isModalOpen(MODAL.ADMIN_USER_DELETE + "-" + user.id)}
          onOpenChange={(open) =>
            open
              ? openModal(MODAL.ADMIN_USER_DELETE + "-" + user.id)
              : closeModal(MODAL.ADMIN_USER_DELETE + "-" + user.id)
          }
        >
          <ConfirmationForm
            title={`Are you sure you want to deactivate ${user.name}?`}
            loading={deleteStatus === "pending"}
            onResult={(confirmed) => {
              if (confirmed) {
                deleteUser(user.id);
              } else {
                closeModal(MODAL.ADMIN_USER_DELETE + "-" + user.id);
              }
            }}
            confirmText="Deactivate"
            cancelText="Cancel"
          />
        </CustomModal>

        {/* Edit Modal */}
        <CustomModal
          key={"edit-" + user.id}
          title="Edit User"
          description={`Edit details for ${user.name}`}
          module={MODULES.ADMIN}
          open={isModalOpen(MODAL.ADMIN_USER_EDIT + "-" + user.id)}
          onOpenChange={(open) =>
            open
              ? openModal(MODAL.ADMIN_USER_EDIT + "-" + user.id)
              : closeModal(MODAL.ADMIN_USER_EDIT + "-" + user.id)
          }
        >
          <UserEditForm userId={user.id} />
        </CustomModal>
      </>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="w-full">
        <UsersHeader />
      </div>
      <CustomTable
        searchPlaceholder="Search users by name or email..."
        tableTitle="All Users"
        columns={usersColumns}
        data={data}
        pageSize={pageSize}
        loading={isLoading}
        onSearchChange={handleSearchChange}
        display={{
          searchComponent: true,
          
        }}
        pagination={{
          page: (userData as any).pagination?.page || 1,
          totalPages: (userData as any).pagination?.pages || 1,
          total: (userData as any).pagination?.total || 0,
          onPageChange: setPage,
        }}
      />
      <CustomModal
        title="Invite User"
        description="Invite users to your entire group"
        module={MODULES.ADMIN}
        open={isModalOpen(MODAL.ADMIN_USER_CREATE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.ADMIN_USER_CREATE) : closeModal(MODAL.ADMIN_USER_CREATE)
        }
      >
        <UsersForm
          // onSubmit={handleCreateUser}
          // isLoading={isCreating}
          onClose={() => closeModal(MODAL.ADMIN_USER_CREATE)}
        />
      </CustomModal>
      {/* User-specific modals for edit/delete */}
      {renderUserModals()}
    </div>
  );
}
