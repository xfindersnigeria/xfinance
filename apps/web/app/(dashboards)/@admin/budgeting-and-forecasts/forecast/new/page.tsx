"use client";
import { CreateForecastForm } from "@/components/features/admin/budgeting";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export default function NewForecastPage() {
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
        <h1 className="text-2xl font-bold text-gray-900">
          Create Group Forecast
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Project consolidated financial performance across all entities
        </p>
      </div>
      <CreateForecastForm />
    </div>
  );
}
