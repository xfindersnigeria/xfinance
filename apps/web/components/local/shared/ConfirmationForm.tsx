import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface ConfirmationFormProps {
  title: string;
  onResult: (confirmed: boolean) => void;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
}

const ConfirmationForm: React.FC<ConfirmationFormProps> = ({
  title,
  onResult,
  confirmText = "Yes",
  cancelText = "No",
  loading = false,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-6 rounded-xl shadow-lg bg-white border border-gray-200">
      <div className="mb-6 text-center font-semibold text-xl text-gray-800">
        {title}
      </div>
      <div className="flex gap-6 justify-center">
        <Button
          variant="destructive"
          onClick={() => onResult(true)}
          disabled={loading}
          className="flex items-center gap-2 px-6 py-2 text-base font-medium"
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin w-5 h-5" />
              Please wait...
            </>
          ) : (
            confirmText
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => onResult(false)}
          disabled={loading}
          className="px-6 py-2 text-base font-medium"
        >
          {cancelText}
        </Button>
      </div>
    </div>
  );
};

export default ConfirmationForm;
