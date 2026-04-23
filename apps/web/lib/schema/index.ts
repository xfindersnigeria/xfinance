import { z } from "zod";

export const loginSchema = z.object({
    email: z.string().min(1, { message: "Email or username is required" }),
    password: z.string().min(6, { message: "Password must be at least 6 characters" }),
});

export const verifySchema = z.object({
    email: z.string().email(),
    code: z.string().length(6),
    type: z.enum(["register", "forgot-password"]),
});




export const sendOtpSchema = z.object({
    email: z.string().email(),
    type: z.enum(["register", "forgot-password"]), // Differentiate between flows
});

export const changePasswordSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    resetToken: z.string(),
    confirm_password: z.string().min(6),
}).refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
});


export type ChangePasswordCredentials = z.infer<typeof changePasswordSchema>;
export type SendOtpCredentials = z.infer<typeof sendOtpSchema>;
export type VerifyCredentials = z.infer<typeof verifySchema>;
export type LoginCredentials = z.infer<typeof loginSchema>;