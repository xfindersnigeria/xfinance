"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useCreateSubCategory } from "@/lib/api/hooks/useAccountSubCategories";
export function AccountForm() {
  const [mode, setMode] = useState<"category" | "subcategory">("category");
  const [typeId, setTypeId] = useState<string>("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Hooks
  const { data: accountTypes, isLoading: loadingTypes } = useAccountTypes();
  const { data: categories, isLoading: loadingCategories } =
    useAccountCategories();
  const createCategory = useCreateAccountCategory();
  const createSubCategory = useCreateSubCategory();
  console.log("AccountForm render", accountTypes, categories);
  // Use correct loading state for submit
  const loading = createCategory.isPending || createSubCategory.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "category") {
      if (!typeId || !name) return;
      createCategory.mutate({ name, typeId, description });
    } else {
      if (!categoryId || !name) return;
      createSubCategory.mutate({ name, categoryId, description });
    }
  };

  // Filter categories by selected type for subcategory mode
  const filteredCategories = typeId
    ? categories?.filter((cat) => cat.typeId === typeId)
    : [];

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
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

      <div className="pt-4 space-y-3">
        <Button type="submit" disabled={loading} className="w-full ">
          {loading
            ? "Creating..."
            : mode === "category"
              ? "Create Category"
              : "Create Subcategory"}
        </Button>
      </div>
    </form>
  );
}
