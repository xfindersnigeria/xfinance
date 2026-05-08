"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useChangePassword } from "@/lib/api/hooks/useAuth";
import { useSessionStore } from "@/lib/store/session";
import { toast } from "sonner";
import { ShieldAlert } from "lucide-react";

const schema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

interface PasswordChangePromptProps {
  open: boolean;
  onDismiss: () => void;
}

export default function PasswordChangePrompt({
  open,
  onDismiss,
}: PasswordChangePromptProps) {
  const whoami = useSessionStore((s) => s.whoami);
  const setWhoami = useSessionStore((s) => s.setWhoami);

  const changePassword = useChangePassword({
    onSuccess: () => {
      toast.success("Password changed successfully. Stay secure!");
      // Optimistically clear the flag in session so the prompt disappears
      if (whoami) {
        setWhoami({
          ...whoami,
          user: { ...whoami.user, requirePasswordChange: false },
        });
      }
    },
    onError: (err: any) => {
      toast.error(err?.data?.message || "Failed to change password");
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onSubmit = (data: FormValues) => {
    changePassword.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onDismiss(); }}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center justify-center size-10 rounded-full bg-yellow-100">
              <ShieldAlert className="size-5 text-yellow-600" />
            </div>
            <DialogTitle>Change Your Password</DialogTitle>
          </div>
          <DialogDescription>
            You&apos;re using a temporary password. Please set a new password to
            secure your account. You can dismiss this and do it later from your
            profile.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <FormField
              control={form.control}
              name="currentPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Current (Temporary) Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Min. 8 characters"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm New Password</FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={onDismiss}
              >
                Remind Me Later
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={changePassword.isPending}
              >
                {changePassword.isPending ? "Saving…" : "Change Password"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
