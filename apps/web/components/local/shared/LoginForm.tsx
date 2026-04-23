"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { loginSchema, LoginCredentials } from "@/lib/schema";
import Logo from "./Logo";
import { useLogin } from "@/lib/api/hooks/useAuth";
import { GroupCustomization } from "@/lib/utils/colorUtils";

export default function LoginForm({
  customization,
}: {
  customization?: GroupCustomization;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  // Use the custom login hook
  const {
    mutate: login,
    isPending,
    // error,
  } = useLogin({
    onSuccess: () => {
      // On successful login, redirect the user
      // SessionProvider will fetch whoami and store it automatically
      toast.success("Login successful!");
      router.push(redirectUrl);
    },
    onError: (error) => {
      toast.error(`Login failed: ${error.message}`);
      console.log("Login error:", error);
    },
  });

  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginCredentials>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(values: LoginCredentials) {
    login(values);
  }

  const loginBgSrc = customization?.loginBgUrl || "/images/auth.jpg";
  const logoSrc = customization?.logoUrl || "/images/logo.png";

  return (
    // <div className="h-screen p-4 md:p-6 gap-6 md:gap-10 bg-muted flex items-center justify-center">
    //   {/* Left section (Illustration / login background) */}
    // <div className="hidden md:flex flex-col bg-background rounded-2xl h-full w-1/2 relative overflow-hidden border">
    //   {/* Background image wrapper */}
    //   <div className="flex justify-center h-full items-center relative">
    //     <Image
    //       src={loginBgSrc} // ✅ Use this when tenant uploads image
    //       alt="Login illustration"
    //       fill
    //       priority
    //       className="object-cover"
    //     />

    //     {/* Overlay for better text readability */}
    //     <div className="absolute inset-0 bg-black/30 " />

    //     {/* Optional branding content */}
    //     <div className="absolute z-10 bottom-10 left-6 right-6 text-white">
    //       <h2 className="text-xl font-semibold mb-2">
    //         {/* You can inject company name dynamically */}
    //         Welcome back 👋
    //       </h2>
    //       <p className="text-sm opacity-90">
    //         Manage your business, finances, and operations in one place.
    //       </p>
    //     </div>
    //   </div>

    //   {/* Footer */}
    //   <p className="absolute bottom-4 text-xs text-white/80 left-6 z-10">
    //     © {new Date().getFullYear()} XFinance. All rights reserved.
    //   </p>
    // </div>

    //   {/* Right section (Form) */}
    //   <div className="h-full w-full md:w-1/2 mx-auto p-6 md:p-8 border rounded-2xl bg-background flex flex-col justify-center shadow-sm">
    //     {/* Logo */}
    //     <div className="mb-6 w-full flex items-center justify-start">
    //       <div className="flex-shrink-0">
    //         <Logo logoUrl={logoSrc} />
    //       </div>
    //     </div>

    //     <h2 className="text-xl md:text-2xl font-semibold text-foreground mb-1">
    //       Sign in to your account
    //     </h2>

    //     <p className="mb-6 text-sm text-muted-foreground">
    //       Enter your credentials to access your dashboard
    //     </p>

    //     <Form {...form}>
    //       <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
    //         {/* Email Field */}
    //         <FormField
    //           control={form.control}
    //           name="email"
    //           render={({ field }) => (
    //             <FormItem>
    //               <FormLabel>Email address</FormLabel>
    //               <div className="relative">
    //                 <FormControl>
    //                   <Input
    //                     placeholder="example@gmail.com"
    //                     {...field}
    //                     className="pl-10"
    //                   />
    //                 </FormControl>
    //                 <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
    //               </div>
    //               <FormMessage />
    //             </FormItem>
    //           )}
    //         />

    //         {/* Password Field */}
    //         <FormField
    //           control={form.control}
    //           name="password"
    //           render={({ field }) => (
    //             <FormItem>
    //               <FormLabel>Password</FormLabel>
    //               <div className="relative">
    //                 <FormControl>
    //                   <Input
    //                     type={showPassword ? "text" : "password"}
    //                     placeholder="********"
    //                     {...field}
    //                     className="pl-10"
    //                   />
    //                 </FormControl>

    //                 <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />

    //                 <button
    //                   type="button"
    //                   onClick={() => setShowPassword(!showPassword)}
    //                   className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
    //                   aria-label={
    //                     showPassword ? "Hide password" : "Show password"
    //                   }
    //                 >
    //                   {showPassword ? (
    //                     <EyeOff className="h-5 w-5" />
    //                   ) : (
    //                     <Eye className="h-5 w-5" />
    //                   )}
    //                 </button>
    //               </div>
    //               <FormMessage />
    //             </FormItem>
    //           )}
    //         />

    //         {/* Remember Me and Forgot Password */}
    //         <div className="flex items-center justify-end">
    //           {/* Future feature */}
    //           {/*
    //       <div className="flex items-center gap-2">
    //         <Checkbox id="remember" />
    //         <label htmlFor="remember" className="text-sm">
    //           Remember me
    //         </label>
    //       </div>
    //       */}

    //           <Link href="#" className="text-sm text-primary hover:underline">
    //             Forgot password?
    //           </Link>
    //         </div>

    //         {/* Submit Button */}
    //         <Button
    //           type="submit"
    //           disabled={isPending}
    //           className="w-full flex items-center justify-center gap-2"
    //         >
    //           {isPending ? (
    //             <>
    //               <Loader2 className="h-5 w-5 animate-spin" />
    //               <span>Please wait</span>
    //             </>
    //           ) : (
    //             <>
    //               <span>Sign In</span>
    //               <ArrowRight className="w-4 h-4" />
    //             </>
    //           )}
    //         </Button>
    //       </form>
    //     </Form>

    //     {/* Optional footer */}
    //     <p className="text-xs text-muted-foreground mt-6 text-center">
    //       Secure login powered by your organization
    //     </p>
    //   </div>
    // </div>

    <div className="flex h-screen p-4 gap-10 bg-[#f2f5fc]">
      {/* Left section (Illustration) */}
      <div className="hidden md:flex flex-col bg-background rounded-2xl h-full w-1/2 relative overflow-hidden border">
        {/* Background image wrapper */}
        <div className="flex justify-center h-full items-center relative">
          <Image
            src={loginBgSrc} // ✅ Use this when tenant uploads image
            alt="Login illustration"
            fill
            priority
            className="object-cover"
          />

          {/* Overlay for better text readability */}
          <div className="absolute inset-0 bg-black/30 " />

          {/* Optional branding content */}
          <div className="absolute z-10 bottom-10 left-6 right-6 text-white">
            <h2 className="text-xl font-semibold mb-2">
              {/* You can inject company name dynamically */}
              Welcome back 👋
            </h2>
            <p className="text-sm opacity-90">
              Manage your business, finances, and operations in one place.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="absolute bottom-4 text-xs text-white/80 left-6 z-10">
          © {new Date().getFullYear()} XFinance. All rights reserved.
        </p>
      </div>

      {/* Right section (Form) */}
      <div className="h-full  w-full md:w-1/2  mx-auto p-4 justify-center flex flex-col">
        <Logo logoUrl={logoSrc} classNames="w-[142px] h-[48px]" />
        <h2 className="text-2xl md:text-3xl font-bold text-[#4A4A4A] text-center mt-6 mb-4 font-lato">
          Welcome Back!
        </h2>
        <p className="text-center mb-4 text-[#4A4A4A]">
          Enter your login details below
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">
                    Email address/Username
                  </FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        placeholder="example@gmail.com/user123"
                        {...field}
                        className="pl-10 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                      />
                    </FormControl>
                    <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" />
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-700">Password</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="********"
                        {...field}
                        className="pl-10 border-gray-300 focus:border-teal-500 focus:ring-teal-500"
                      />
                    </FormControl>
                    <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Remember Me and Forgot Password */}
            <div className="flex items-center justify-end">
              {/* <FormField
                control={form.control}
                name='remember_me'
                render={({ field }) => (
                  <FormItem className='flex items-center space-x-2'>
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        className='border-primary data-[state=checked]:bg-primary'
                      />
                    </FormControl>
                    <FormLabel className='text-sm text-gray-700'>
                      Remember me
                    </FormLabel>
                  </FormItem>
                )}
              /> */}
              <Link href="#" className="text-sm text-primary hover:underline">
                Forgot password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2"
              
            >
              {isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>Please wait</span>
                </>
              ) : (
                <>
                  <span>Login</span>
                </>
              )}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
