import { Info } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function AlertInfo({ message }: { message: string }) {
  return (
    <Alert variant="default">
      <Info className="h-4 w-4" />
      <AlertTitle>Info</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
