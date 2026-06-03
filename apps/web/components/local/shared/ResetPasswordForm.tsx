"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter, useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Lock, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Logo from "./Logo";
import { useResetPassword, useForgotPassword } from "@/lib/api/hooks/useAuth";
import { GroupCustomization } from "@/lib/utils/colorUtils";

const schema = z
  .object({
    otp: z
      .string()
      .length(6, "OTP must be exactly 6 digits")
      .regex(/^\d+$/, "OTP must contain only numbers"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function ResetPasswordForm({
  customization,
}: {
  customization?: GroupCustomization;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const { mutate: resetPassword, isPending } = useResetPassword({
    onSuccess: () => {
      toast.success("Password reset successfully! Please log in.");
      router.push("/auth/login");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const { mutate: resendOtp, isPending: isResending } = useForgotPassword({
    onSuccess: () => {
      toast.success("A new OTP has been sent to your email.");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { otp: "", newPassword: "", confirmPassword: "" },
  });

  function onSubmit(values: FormValues) {
    if (!email) {
      toast.error("Email not found. Please restart the forgot password flow.");
      return;
    }
    resetPassword({ email, otp: values.otp, newPassword: values.newPassword });
  }

  const loginBgSrc = customization?.loginBgUrl || "/images/auth.jpg";
  const logoSrc = customization?.logoUrl || "/images/logo.png";

  return (
    <div className="flex h-screen p-4 gap-10 bg-[#f2f5fc]">
      {/* Left section */}
      <div className="hidden md:flex flex-col bg-background rounded-2xl h-full w-1/2 relative overflow-hidden border">
        <Image
          src={loginBgSrc}
          alt="Illustration"
          fill
          priority
          className="object-cover"
        />
      </div>

      {/* Right section */}
      <div className="h-full max-w-md w-full md:w-1/2 mx-auto p-4 justify-center flex flex-col">
        <Logo logoUrl={logoSrc} classNames="w-[142px] h-[48px]" />

        <div className="mt-8 mb-6">
          <h2 className="text-2xl md:text-3xl font-bold text-[#4A4A4A] font-lato">
            Reset Password
          </h2>
          <p className="text-[#4A4A4A] mt-2 text-sm">
            Enter the 6-digit OTP sent to{" "}
            <span className="font-medium text-primary">{email || "your email"}</span> and choose a new password.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* OTP Field */}
            <FormField
              control={form.control}
              name="otp"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">OTP Code</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      inputMode="numeric"
                      className="tracking-widest text-center text-lg font-mono border-gray-300"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* New Password */}
            <FormField
              control={form.control}
              name="newPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">New Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Min. 8 characters"
                        className="pl-10 border-gray-300"
                        {...field}
                      />
                    </FormControl>
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Confirm Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showConfirm ? "text" : "password"}
                        placeholder="Re-enter new password"
                        className="pl-10 border-gray-300"
                        {...field}
                      />
                    </FormControl>
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label={showConfirm ? "Hide password" : "Show password"}
                    >
                      {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Resetting...</span>
                </>
              ) : (
                <span>Reset Password</span>
              )}
            </Button>

            <div className="flex items-center justify-between text-sm">
              <Link
                href="/auth/login"
                className="flex items-center gap-1 text-primary hover:underline"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to login
              </Link>

              {email && (
                <button
                  type="button"
                  disabled={isResending}
                  onClick={() => resendOtp({ email })}
                  className="flex items-center gap-1 text-muted-foreground hover:text-primary disabled:opacity-50"
                >
                  {isResending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Resend OTP
                </button>
              )}
            </div>
          </form>
        </Form>

        <p className="text-xs text-muted-foreground text-center mt-8">
          &copy; {new Date().getFullYear()} XFinance. All rights reserved.
        </p>
      </div>
    </div>
  );
}
