"use client";

import { useModal } from "@/components/providers/ModalProvider";
import { CustomTable } from "@/components/local/custom/custom-table";
import { CustomModal } from "@/components/local/custom/modal";
import { MODULES } from "@/lib/types/enums";
import { useDeleteEntity, useEntities } from "@/lib/api/hooks/useEntity";
import { useDebounce } from "use-debounce";
import EntitiesHeader from "./EntitiesHeader";
import { entitiesColumns, Entity } from "./EntitiesColumn";
import { EntityForm } from "./EntityForm";
import EntitiesActions from "./EntitiesActions";
import { useState } from "react";
import { MODAL } from "@/lib/data/modal-data";
import ConfirmationForm from "@/components/local/shared/ConfirmationForm";

export default function Entities() {
  const { isOpen, openModal, closeModal } = useModal();
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [debouncedSearchTerm] = useDebounce(searchTerm, 300);

  // const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  // const [selectedEntityToDelete, setSelectedEntityToDelete] =
  //   useState<Entity | null>(null);

  // Pass this to EntitiesActions
  // const handleEdit = (entity: Entity) => {
  //   setSelectedEntity(entity);
  //   openModal(MODAL.ENTITY_EDIT);
  // };

  // const handleDelete = (entity: Entity) => {
  //   setSelectedEntityToDelete(entity);
  //   openModal(MODAL.ENTITY_DELETE);
  // };

  const deleteEntity = useDeleteEntity({});
  // Fetch entities with search and pagination
  const { data = { entities: [], totalCount: 0 }, isLoading } = useEntities({
    search: debouncedSearchTerm,
    page: currentPage,
    limit: rowsPerPage,
  });

  const entities = data.entities || [];

  // Add actions column to columns array
  // const columnsWithActions = [
  //   ...entitiesColumns.slice(0, -1),
  //   {
  //     key: "id",
  //     title: "",
  //     className: "w-8 text-sm",
  //     render: (_: any, row: Entity) => (
  //       <EntitiesActions
  //         row={row}
  //         onEdit={handleEdit}
  //         onDelete={handleDelete}
  //       />
  //     ),
  //     searchable: false,
  //   },
  // ];

  return (
    <div className="space-y-4">
      <EntitiesHeader  />

      <CustomTable
        columns={entitiesColumns}
        data={entities}
        pageSize={rowsPerPage}
        searchPlaceholder="Search entities..."
        tableTitle="All Entities"
        onSearchChange={setSearchTerm}
        display={{
          searchComponent: true,
        }}
        loading={isLoading}
      />

      {/* <CustomModal
        open={isOpen(MODAL.ENTITY_EDIT)}
        onOpenChange={(open) =>
          open ? openModal(MODAL.ENTITY_EDIT) : closeModal(MODAL.ENTITY_EDIT)
        }
        title={selectedEntity ? "Edit Entity" : "Add New Entity"}
        description={
          selectedEntity
            ? "Update entity details"
            : "Create a new entity within your group"
        }
        module={MODULES.ENTITY}
      >
        <EntityForm
          entity={selectedEntity as any}
          isEditMode={!!selectedEntity}
        />
      </CustomModal>

      <CustomModal
        open={isOpen(MODAL.ENTITY_DELETE)}
        onOpenChange={(open) =>
          open
            ? openModal(MODAL.ENTITY_DELETE)
            : closeModal(MODAL.ENTITY_DELETE)
        }
        title="Confirm Deletion"
        module={MODULES.ENTITY}
      >
        <ConfirmationForm
          title={`Are you sure you want to delete "${selectedEntityToDelete?.name}"? This action cannot be undone.`}
          onResult={(confirmed) => {
            if (confirmed && selectedEntityToDelete) {
              deleteEntity.mutate(selectedEntityToDelete.id);
            }
            closeModal(MODAL.ENTITY_DELETE);
          }}
          loading={deleteEntity.isPending}
        />
      </CustomModal> */}
    </div>
  );
}
