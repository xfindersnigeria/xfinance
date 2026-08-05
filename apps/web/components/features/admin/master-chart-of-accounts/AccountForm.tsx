"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccountTypes } from "@/lib/api/hooks/useAccountTypes";
import { useAccountCategories } from "@/lib/api/hooks/useAccountCategories";
import { useCreateAccountCategory } from "@/lib/api/hooks/useAccountCategories";
import {
  useCreateSubCategory,
  useSubCategoriesByCategory,
} from "@/lib/api/hooks/useAccountSubCategories";
import { useCreateAccountForEntities } from "@/lib/api/hooks/useAccounts";
import { useGroups } from "@/lib/api/hooks/useGroup";
import { useEntities, useEntitiesByGroup } from "@/lib/api/hooks/useEntity";
import { useSessionStore } from "@/lib/store/session";
import { ENUM_ROLE } from "@/lib/types/enums";


export function AccountForm() {
  const [mode, setMode] = useState<"category" | "subcategory" | "account">("category");
  const [typeId, setTypeId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [subCategoryId, setSubCategoryId] = useState<string>("");
  const [groupId, setGroupId] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedEntityIds, setSelectedEntityIds] = useState<string[]>([]);

  const whoami = useSessionStore((s) => s.whoami);
  const isSuperAdmin = whoami?.user?.systemRole === ENUM_ROLE.SUPERADMIN;

  // Hooks
  const { data: accountTypes, isLoading: loadingTypes } = useAccountTypes();
  const { data: categories, isLoading: loadingCategories } =
    useAccountCategories();
  const { data: groupsData, isLoading: loadingGroups } = useGroups({ limit: 100 });
  const groups = groupsData?.groups ?? [];
  const createCategory = useCreateAccountCategory();
  const createSubCategory = useCreateSubCategory();
  const createAccountForEntities = useCreateAccountForEntities();

  // For "account" mode: cascading category -> subcategory
  const { data: subCategoriesForAccount, isLoading: loadingSubCategoriesForAccount } =
    useSubCategoriesByCategory(categoryId);

  // Entities to offer for selection: superadmin picks an explicit group above,
  // so fetch that group's entities directly; a group admin already has an
  // effective group context, so the normal entities-for-my-group hook applies.
  const { data: entitiesByGroupData, isLoading: loadingEntitiesByGroup } =
    useEntitiesByGroup(isSuperAdmin ? groupId : "");
  const { data: myEntitiesData, isLoading: loadingMyEntities } = useEntities();
  const entities = isSuperAdmin
    ? (entitiesByGroupData?.entities ?? [])
    : (myEntitiesData?.entities ?? []);
  const loadingEntities = isSuperAdmin ? loadingEntitiesByGroup : loadingMyEntities;

  useEffect(() => {
    // Reset entity selection whenever the group changes
    setSelectedEntityIds([]);
  }, [groupId]);

  const allEntitiesSelected =
    entities.length > 0 && selectedEntityIds.length === entities.length;

  const toggleSelectAllEntities = () => {
    setSelectedEntityIds(allEntitiesSelected ? [] : entities.map((e) => e.id));
  };

  const toggleEntity = (entityId: string) => {
    setSelectedEntityIds((prev) =>
      prev.includes(entityId)
        ? prev.filter((id) => id !== entityId)
        : [...prev, entityId],
    );
  };

  // Use correct loading state for submit
  const loading =
    createCategory.isPending ||
    createSubCategory.isPending ||
    createAccountForEntities.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "category") {
      if (!typeId || !name) return;
      if (isSuperAdmin && !groupId) return;
      createCategory.mutate({ name, typeId, description, ...(isSuperAdmin ? { groupId } : {}) });
    } else if (mode === "subcategory") {
      if (!categoryId || !name) return;
      createSubCategory.mutate({ name, categoryId, description });
    } else {
      if (!subCategoryId || !name) return;
      if (selectedEntityIds.length === 0) return;
      if (isSuperAdmin && !groupId) return;
      createAccountForEntities.mutate({
        name,
        description,
        subCategoryId,
        entityIds: selectedEntityIds,
        ...(isSuperAdmin ? { groupId } : {}),
      });
    }
  };

  // Filter categories by selected type for subcategory mode
  const filteredCategories = typeId
    ? categories?.filter((cat) => cat.typeId === typeId)
    : [];

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      {/* Group selector — superadmin only */}
      {isSuperAdmin && (
        <div className="bg-orange-50 p-4 rounded-xl space-y-2">
          <h6 className="font-medium text-sm mb-2">Group <span className="text-red-500">*</span></h6>
          <Select value={groupId} onValueChange={setGroupId} disabled={loadingGroups}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={loadingGroups ? "Loading..." : "Select group"} />
            </SelectTrigger>
            <SelectContent>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Section: Select Account Type (Top Most) */}
      <div className="bg-purple-50 p-4 rounded-xl space-y-2">
        <h6 className="font-medium text-sm mb-2">Account Type</h6>
        <Select
          value={typeId}
          onValueChange={setTypeId}
          disabled={loadingTypes}
        >
          <SelectTrigger className="w-full">
            <SelectValue
              placeholder={loadingTypes ? "Loading..." : "Select account type"}
            />
          </SelectTrigger>
          <SelectContent>
            {accountTypes?.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.code} - {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Section: Select Mode */}
      <div className="bg-blue-50 p-4 rounded-xl space-y-2">
        <h6 className="font-medium text-sm mb-2">
          What do you want to create?
        </h6>
        <Select value={mode} onValueChange={(v) => setMode(v as any)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select mode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="category">Category</SelectItem>
            <SelectItem value="subcategory">Subcategory</SelectItem>
            <SelectItem value="account">Account</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Section: Category Fields */}
      {mode === "category" && (
        <div className="bg-green-50 p-4 rounded-xl space-y-4">
          <h6 className="font-medium text-sm mb-2">Category Details</h6>
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Category description"
            />
          </div>
        </div>
      )}

      {/* Section: Subcategory Fields */}
      {mode === "subcategory" && (
        <div className="bg-yellow-50 p-4 rounded-xl space-y-4">
          <h6 className="font-medium text-sm mb-2">Subcategory Details</h6>
          <div className="space-y-2">
            <Label htmlFor="category" className="text-sm font-medium">
              Category
            </Label>
            <Select
              value={categoryId}
              onValueChange={setCategoryId}
              disabled={
                !typeId ||
                (filteredCategories && filteredCategories.length === 0)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !typeId
                      ? "Select a type first"
                      : filteredCategories && filteredCategories.length === 0
                        ? "No categories available"
                        : "Select category"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Subcategory description"
            />
          </div>
        </div>
      )}

      {/* Section: Account Fields */}
      {mode === "account" && (
        <div className="bg-cyan-50 p-4 rounded-xl space-y-4">
          <h6 className="font-medium text-sm mb-2">Account Details</h6>
          <div className="space-y-2">
            <Label htmlFor="account-category" className="text-sm font-medium">
              Category
            </Label>
            <Select
              value={categoryId}
              onValueChange={(v) => {
                setCategoryId(v);
                setSubCategoryId("");
              }}
              disabled={
                !typeId ||
                (filteredCategories && filteredCategories.length === 0)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !typeId
                      ? "Select a type first"
                      : filteredCategories && filteredCategories.length === 0
                        ? "No categories available"
                        : "Select category"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {filteredCategories?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.code} - {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-subcategory" className="text-sm font-medium">
              Subcategory
            </Label>
            <Select
              value={subCategoryId}
              onValueChange={setSubCategoryId}
              disabled={loadingSubCategoriesForAccount || !categoryId}
            >
              <SelectTrigger className="w-full">
                <SelectValue
                  placeholder={
                    !categoryId
                      ? "Select a category first"
                      : loadingSubCategoriesForAccount
                        ? "Loading..."
                        : "Select subcategory"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {subCategoriesForAccount?.map((sc) => (
                  <SelectItem key={sc.id} value={sc.id}>
                    {sc.code} - {sc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-name" className="text-sm font-medium">
              Name
            </Label>
            <Input
              id="account-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-description" className="text-sm font-medium">
              Description
            </Label>
            <Textarea
              id="account-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Account description"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">
                Entities <span className="text-red-500">*</span>
              </Label>
              {entities.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllEntities}
                  className="text-xs font-medium text-primary hover:underline"
                >
                  {allEntitiesSelected ? "Clear all" : "Select all"}
                </button>
              )}
            </div>
            <p className="text-xs text-gray-500">
              Choose which entities in the group this account should be created for.
            </p>
            <div className="max-h-48 overflow-y-auto space-y-1 bg-white border rounded-lg p-2">
              {isSuperAdmin && !groupId ? (
                <p className="text-xs text-gray-400 px-1 py-2">Select a group first</p>
              ) : loadingEntities ? (
                <p className="text-xs text-gray-400 px-1 py-2">Loading entities...</p>
              ) : entities.length === 0 ? (
                <p className="text-xs text-gray-400 px-1 py-2">No entities found</p>
              ) : (
                entities.map((entity) => (
                  <label
                    key={entity.id}
                    className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-gray-50 cursor-pointer text-sm"
                  >
                    <Checkbox
                      checked={selectedEntityIds.includes(entity.id)}
                      onCheckedChange={() => toggleEntity(entity.id)}
                    />
                    {entity.name}
                  </label>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="pt-4 space-y-3">
        <Button type="submit" disabled={loading} className="w-full ">
          {loading
            ? "Creating..."
            : mode === "category"
              ? "Create Category"
              : mode === "subcategory"
                ? "Create Subcategory"
                : "Create Account"}
        </Button>
      </div>
    </form>
  );
}
