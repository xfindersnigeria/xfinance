"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
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
import { Loader2, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import Logo from "./Logo";
import { useForgotPassword } from "@/lib/api/hooks/useAuth";
import { GroupCustomization } from "@/lib/utils/colorUtils";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordForm({
  customization,
}: {
  customization?: GroupCustomization;
}) {
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const { mutate: sendOtp, isPending } = useForgotPassword({
    onSuccess: (_, variables) => {
      setSubmittedEmail(variables.email);
      setSubmitted(true);
      toast.success("OTP sent! Check your inbox.");
      router.push(`/auth/otp?email=${encodeURIComponent(variables.email)}`);
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  function onSubmit(values: FormValues) {
    sendOtp({ email: values.email });
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
            Forgot Password?
          </h2>
          <p className="text-[#4A4A4A] mt-2 text-sm">
            Enter your registered email address and we&apos;ll send you a 6-digit OTP to reset your password.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Email address</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        placeholder="example@gmail.com"
                        {...field}
                        className="pl-10 border-gray-300"
                      />
                    </FormControl>
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
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
                  <span>Sending OTP...</span>
                </>
              ) : (
                <span>Send OTP</span>
              )}
            </Button>

            <Link
              href="/auth/login"
              className="flex items-center gap-2 text-sm text-primary hover:underline justify-center mt-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to login
            </Link>
          </form>
        </Form>

        <p className="text-xs text-muted-foreground text-center mt-8">
          &copy; {new Date().getFullYear()} XFinance. All rights reserved.
        </p>
      </div>
    </div>
  );
}
