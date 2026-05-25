"use client";
import { SetGroupBudgetForm } from "@/components/features/admin/budgeting";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewBudgetPage() {
  const router = useRouter();
  return (
    <div className="space-y-2">
      <Button
        variant={"ghost"}
        className="cursor-pointer gap-2"
        onClick={() => router.back()}
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </Button>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Set Group Budget</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create consolidated budget targets across all entities in the group
        </p>
      </div>
      <SetGroupBudgetForm />
    </div>
  );
}
