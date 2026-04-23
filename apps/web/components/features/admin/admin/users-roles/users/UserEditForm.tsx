"use client";

import { useEffect } from "react";
import { useUser } from "@/lib/api/hooks/useUsers";
import { Loader2 } from "lucide-react";

interface UserEditFormProps {
  userId: string;
}

export default function UserEditForm({ userId }: UserEditFormProps) {
  const { data: user, isLoading } = useUser(userId);

  useEffect(() => {
    // You can prefill form here when implementing
  }, [user]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="animate-spin w-6 h-6 mr-2" />
        Loading user details...
      </div>
    );
  }

  // For now, just show user JSON or a placeholder
  return (
    <div className="p-6 text-gray-700">
      <pre>{JSON.stringify(user, null, 2)}</pre>
      {/* TODO: Add form fields for editing user */}
    </div>
  );
}
