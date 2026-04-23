"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";

export default function EmployeeDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { id } = params;
  return (
    <div>
        <Button variant={"ghost"} className="cursor-pointer" onClick={() => router.back()}><ArrowLeft /> Back</Button>
        EmployeeDetailsPage {id}</div>
  )
}
