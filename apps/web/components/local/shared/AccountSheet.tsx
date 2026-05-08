"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useUpdateProfile, useChangePassword } from "@/lib/api/hooks/useAuth";
import { useSessionStore } from "@/lib/store/session";
import { toast } from "sonner";
import { User, Lock, Mail, Building2, Calendar } from "lucide-react";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  department: z.string().optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

interface AccountSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function AccountSheet({ open, onOpenChange }: AccountSheetProps) {
  const user = useSessionStore((s) => s.user);
  const setWhoami = useSessionStore((s) => s.setWhoami);
  const whoami = useSessionStore((s) => s.whoami);

  const updateProfile = useUpdateProfile({
    onSuccess: (data) => {
      // Optimistically update session store
      if (whoami) {
        setWhoami({
          ...whoami,
          user: { ...whoami.user, ...data },
        });
      }
      toast.success("Profile updated successfully");
    },
    onError: (err: any) => {
      toast.error(err?.data?.message || "Failed to update profile");
    },
  });

  const changePassword = useChangePassword({
    onSuccess: () => {
      toast.success("Password changed successfully");
      passwordForm.reset();
    },
    onError: (err: any) => {
      toast.error(err?.data?.message || "Failed to change password");
    },
  });

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    values: {
      firstName: user?.firstName ?? "",
      lastName: user?.lastName ?? "",
      department: user?.department ?? "",
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = (data: ProfileForm) => {
    updateProfile.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordForm) => {
    changePassword.mutate({
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  };

  const avatarUrl = user?.image?.secureUrl
    ? user.image.secureUrl
    : `https://api.dicebear.com/7.x/initials/png?seed=${encodeURIComponent(
        `${user?.firstName ?? ""} ${user?.lastName ?? ""}`.trim() || "user"
      )}`;

  const roleLabel =
    user?.systemRole === "superadmin"
      ? "Super Admin"
      : user?.systemRole === "admin"
        ? "Admin"
        : "User";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto p-3">
        <SheetHeader className="pb-4">
          <SheetTitle>My Account</SheetTitle>
        </SheetHeader>

        {/* Profile summary */}
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="size-16 rounded-full">
            <AvatarImage src={avatarUrl} alt={user?.firstName ?? "User"} />
          </Avatar>
          <div className="min-w-0">
            <p className="font-semibold text-base truncate">
              {[user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Anonymous"}
            </p>
            <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
            <Badge variant="secondary" className="mt-1 text-xs capitalize">
              {roleLabel}
            </Badge>
          </div>
        </div>

        <Separator className="mb-6" />

        <Tabs defaultValue="profile">
          <TabsList className="w-full mb-6">
            <TabsTrigger value="profile" className="flex-1 gap-2">
              <User className="size-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="security" className="flex-1 gap-2">
              <Lock className="size-4" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* ── Profile tab ── */}
          <TabsContent value="profile">
            <Form {...profileForm}>
              <form
                onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={profileForm.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input placeholder="First name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Last name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={profileForm.control}
                  name="department"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Department</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Finance" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Read-only info */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="size-4 shrink-0" />
                    <span className="truncate">{user?.email}</span>
                  </div>
                  {user?.lastLogin && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="size-4 shrink-0" />
                      <span>
                        Last login:{" "}
                        {new Date(user.lastLogin).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={updateProfile.isPending}
                >
                  {updateProfile.isPending ? "Saving…" : "Save Changes"}
                </Button>
              </form>
            </Form>
          </TabsContent>

          {/* ── Security tab ── */}
          <TabsContent value="security">
            {user?.requirePasswordChange && (
              <div className="mb-4 rounded-lg border border-yellow-200 bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
                Please change your temporary password to secure your account.
              </div>
            )}

            <Form {...passwordForm}>
              <form
                onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
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
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full mt-2"
                  disabled={changePassword.isPending}
                >
                  {changePassword.isPending ? "Updating…" : "Change Password"}
                </Button>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
