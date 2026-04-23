"use client";

import React, { useState, useMemo } from "react";
import { useDebounce } from "use-debounce";
import { CustomTable } from "@/components/local/custom/custom-table";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CustomModal } from "@/components/local/custom/modal";
import { useModal } from "@/components/providers/ModalProvider";
import RolesHeader from "../RolesHeader";
import { rolesColumns } from "../RolesColumn";
import RolesForm from "./RolesForm";
import RolesActions from "./RolesActions";
import { MODAL } from "@/lib/data/modal-data";
import { MODULES } from "@/lib/types/enums";
import { ChevronDown, AlertCircle } from "lucide-react";
import { useCreateRole, useDeleteRole, useRoles, useUpdateRole } from "@/lib/api/hooks/useRoles";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Roles list component
 * Displays all system and custom roles with filtering and pagination
 * Integrated with useRoles API hook for real-time data fetching
 */
export default function Roles() {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);
  const [page, setPage] = useState(1);
  const [isOpen, setIsOpen] = useState(true);
  const [selectedRole, setSelectedRole] = useState<any>(null);
  const [roleToDelete, setRoleToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { isOpen: isModalOpen, openModal, closeModal } = useModal();

  const createRoleMutation = useCreateRole();
  const updateRoleMutation = useUpdateRole()
  const deleteRoleMutation = useDeleteRole()
  const pageSize = 10;

  const { data: rolesData, isLoading: isLoadingRoles } = useRoles({
    search: debouncedSearchTerm,
    page,
    limit: pageSize,
  });

  // Transform API response to match Role interface
  const data = (rolesData?.data || []).map((role: any) => ({
    id: role.id,
    name: role.name,
    description: role.description,
    type: (role.isSystemRole ? "System" : "Custom") as "System" | "Custom",
    moduleCount: role.permissions?.length || 0,
    permissionCount: role.permissionIds?.length || 0,
    usersCount: role.usersCount || 0,
    modules: role.permissions?.map((p: any) => p.moduleName) || [],
    permissions: role.permissionIds || [],
    isSystem: role.isSystemRole,
    scope: role.scope,
  }));

  const isLoading = isLoadingRoles;

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(1); // Reset to first page on search
  };

  const handleViewRole = (role: any) => {
    setSelectedRole(role);
    openModal(MODAL.ADMIN_ROLE_VIEW + "-" + role.id);
  };

  const handleEditRole = (role: any) => {
    setSelectedRole(role);
    openModal(MODAL.ADMIN_ROLE_EDIT + "-" + role.id);
  };

  const handleDeleteRole = (role: any) => {
    setRoleToDelete(role);
    openModal(MODAL.ADMIN_ROLE_DELETE + "-" + role.id);
  };

  const confirmDeleteRole = () => {
    if (!roleToDelete) return;
    deleteRoleMutation.mutate(roleToDelete.id);
  };

  // Create columns with callbacks
  const columns = useMemo(
    () => [
      ...rolesColumns.slice(0, -1), // All columns except actions
      {
        key: "actions",
        title: "Actions",
        render: (_: any, row: any) => (
          <RolesActions
            role={row}
            onView={handleViewRole}
            onEdit={handleEditRole}
            onDelete={handleDeleteRole}
          />
        ),
        searchable: false,
      },
    ],
    []
  );

  const handleCreateRole = async (formData: any) => {
    createRoleMutation.mutate(formData);
  };

  const handleUpdateRole = async (formData: any) => {
    if (!selectedRole) return;
    updateRoleMutation.mutate({ roleId: selectedRole.id, payload: formData });
  };

  return (
    <div className="space-y-4">
      <RolesHeader />

      {/* All Roles Collapsible Section */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="bg-white rounded-lg border">
        <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500 flex items-center justify-center">
              <span className="text-white text-sm font-semibold">O</span>
            </div>
            <div className="text-left">
              <h4 className="font-semibold">All Roles</h4>
              <p className="text-sm text-gray-600">Manage roles and their permissions</p>
            </div>
          </div>
          <ChevronDown
            className={`h-5 w-5 text-gray-600 transition-transform duration-200 ${
              isOpen ? "transform rotate-180" : ""
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t">
          <div className="p-4">
            <CustomTable
              searchPlaceholder="Search roles..."
              tableTitle="All Roles"
              columns={columns}
              data={data}
              pageSize={pageSize}
              loading={isLoading}
              onSearchChange={handleSearchChange}
              display={{
                searchComponent: true,
              }}
              pagination={{
                page: rolesData?.page || 1,
                totalPages: rolesData?.totalPages || 1,
                total: rolesData?.total || 0,
                onPageChange: setPage,
              }}
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Create Role Modal */}
      <CustomModal
        title="Create New Role"
        description="Configure role details and granular permissions for modules and actions"
        module={MODULES.ADMIN}
        open={isModalOpen(MODAL.ADMIN_ROLE_CREATE)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.ADMIN_ROLE_CREATE) : closeModal(MODAL.ADMIN_ROLE_CREATE)
        }
      >
        <RolesForm
          onSubmit={handleCreateRole}
          isLoading={createRoleMutation.isPending}
          onClose={() => closeModal(MODAL.ADMIN_ROLE_CREATE)}
        />
      </CustomModal>

      {/* Edit Role Modal */}
      {selectedRole && (
        <CustomModal
          title="Edit Role"
          description="Configure role details and granular permissions for modules and actions"
          module={MODULES.ADMIN}
          open={isModalOpen(MODAL.ADMIN_ROLE_EDIT + "-" + selectedRole.id)}
          onOpenChange={(open) =>
            open
              ? openModal(MODAL.ADMIN_ROLE_EDIT + "-" + selectedRole.id)
              : closeModal(MODAL.ADMIN_ROLE_EDIT + "-" + selectedRole.id)
          }
        >
          <RolesForm
            role={selectedRole}
            onSubmit={handleUpdateRole}
            isLoading={updateRoleMutation.isPending}
            onClose={() => closeModal(MODAL.ADMIN_ROLE_EDIT + "-" + selectedRole.id)}
          />
        </CustomModal>
      )}

      {/* View Role Modal */}
      {selectedRole && (
        <CustomModal
          title="View Role"
          description="Role details and assigned permissions"
          module={MODULES.ADMIN}
          open={isModalOpen(MODAL.ADMIN_ROLE_VIEW + "-" + selectedRole.id)}
          onOpenChange={(open) =>
            open
              ? openModal(MODAL.ADMIN_ROLE_VIEW + "-" + selectedRole.id)
              : closeModal(MODAL.ADMIN_ROLE_VIEW + "-" + selectedRole.id)
          }
        >
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Role Name</label>
              <p className="text-sm text-gray-600 mt-1">{selectedRole.name}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Description</label>
              <p className="text-sm text-gray-600 mt-1">{selectedRole.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Modules</label>
                <p className="text-sm font-semibold text-blue-600 mt-1">{selectedRole.moduleCount}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Permissions</label>
                <p className="text-sm font-semibold text-green-600 mt-1">{selectedRole.permissionCount}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Users</label>
                <p className="text-sm font-semibold text-orange-600 mt-1">{selectedRole.usersCount}</p>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Type</label>
              <p className="text-sm text-gray-600 mt-1">{selectedRole.type}</p>
            </div>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => closeModal(MODAL.ADMIN_ROLE_VIEW + "-" + selectedRole.id)}
              >
                Close
              </Button>
            </div>
          </div>
        </CustomModal>
      )}

      {/* Delete Role Confirmation Modal */}
      {roleToDelete && (
        <CustomModal
          title="Delete Role"
          description={roleToDelete.usersCount > 0 ? "Cannot delete this role" : "Are you sure you want to delete this role?"}
          module={MODULES.ADMIN}
          open={isModalOpen(MODAL.ADMIN_ROLE_DELETE + "-" + roleToDelete.id)}
          onOpenChange={(open) =>
            open
              ? openModal(MODAL.ADMIN_ROLE_DELETE + "-" + roleToDelete.id)
              : (() => {
                  closeModal(MODAL.ADMIN_ROLE_DELETE + "-" + roleToDelete.id);
                  setRoleToDelete(null);
                })()
          }
        >
          <div className="space-y-4">
            {roleToDelete.usersCount > 0 ? (
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-amber-900">Cannot Delete</h4>
                  <p className="text-sm text-amber-800 mt-1">
                    This role is currently assigned to {roleToDelete.usersCount} user{roleToDelete.usersCount !== 1 ? "s" : ""}.
                    You must unassign this role from all users before it can be deleted.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900">Warning</h4>
                  <p className="text-sm text-red-800 mt-1">
                    You are about to permanently delete this role. This action cannot be undone.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">Role to {roleToDelete.usersCount > 0 ? "view" : "delete"}:</p>
              <div className="p-3 bg-gray-50 rounded border border-gray-200">
                <p className="font-medium text-gray-900">{roleToDelete.name}</p>
                <p className="text-xs text-gray-600">{roleToDelete.description}</p>
                {roleToDelete.usersCount > 0 && (
                  <p className="text-xs text-amber-600 font-medium mt-2">
                    Assigned to: {roleToDelete.usersCount} user{roleToDelete.usersCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  closeModal(MODAL.ADMIN_ROLE_DELETE + "-" + roleToDelete.id);
                  setRoleToDelete(null);
                }}
                disabled={isDeleting}
              >
                {roleToDelete.usersCount > 0 ? "Close" : "Cancel"}
              </Button>
              {roleToDelete.usersCount === 0 && (
                <Button
                  variant="destructive"
                  onClick={confirmDeleteRole}
                  disabled={isDeleting}
                  className={isDeleting ? "opacity-50" : ""}
                >
                  {isDeleting ? "Deleting..." : "Delete Role"}
                </Button>
              )}
            </div>
          </div>
        </CustomModal>
      )}
    </div>
  );
}
