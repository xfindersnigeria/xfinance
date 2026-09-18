import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as emailService from "../services/emailSettingsService";

const OVERVIEW_KEY = ["email-settings"];
const templateKey = (type: emailService.EmailTemplateType) => ["email-template", type];

const onError = (error: Error) => toast.error(error.message || "Something went wrong");

export const useEmailSettings = () =>
  useQuery({
    queryKey: OVERVIEW_KEY,
    queryFn: async () => (await emailService.getEmailSettings()).data,
    staleTime: 60 * 1000,
  });

/** SMTP save/remove return the fresh overview — write it straight into the cache */
export const useSaveSmtp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: emailService.SmtpPayload) => emailService.saveSmtp(payload),
    onSuccess: (res) => {
      if (res?.data) queryClient.setQueryData(OVERVIEW_KEY, res.data);
      queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
      toast.success("SMTP settings saved");
    },
    onError,
  });
};

export const useRemoveSmtp = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => emailService.removeSmtp(),
    onSuccess: (res) => {
      if (res?.data) queryClient.setQueryData(OVERVIEW_KEY, res.data);
      queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
      toast.success("SMTP removed — emails will be sent by the platform mailer");
    },
    onError,
  });
};

export const useTestSmtp = () =>
  useMutation({
    mutationFn: (payload: emailService.SmtpTestPayload) => emailService.testSmtp(payload),
    onSuccess: (_res, vars) => toast.success(`Test email sent to ${vars.to}`),
    onError,
  });

export const useUpdateEmailAutomation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<emailService.EmailAutomation>) => emailService.updateEmailAutomation(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
      // "Payment Reminders" is the same switch as Settings → Income
      queryClient.invalidateQueries({ queryKey: ["entity-config"] });
      toast.success("Email automation updated");
    },
    onError,
  });
};

export const useUpdateEmailSignature = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (signature: string) => emailService.updateEmailSignature(signature),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
      toast.success("Email signature saved");
    },
    onError,
  });
};

export const useEmailTemplate = (type: emailService.EmailTemplateType | null) =>
  useQuery({
    queryKey: templateKey(type as emailService.EmailTemplateType),
    queryFn: async () => (await emailService.getEmailTemplate(type as emailService.EmailTemplateType)).data,
    enabled: !!type,
    staleTime: 60 * 1000,
  });

export const useSaveEmailTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ type, subject, body }: { type: emailService.EmailTemplateType; subject: string; body: string }) =>
      emailService.saveEmailTemplate(type, { subject, body }),
    onSuccess: (res, vars) => {
      if (res?.data) queryClient.setQueryData(templateKey(vars.type), res.data);
      queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
      toast.success("Email template saved");
    },
    onError,
  });
};

export const useResetEmailTemplate = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (type: emailService.EmailTemplateType) => emailService.resetEmailTemplate(type),
    onSuccess: (res, type) => {
      if (res?.data) queryClient.setQueryData(templateKey(type), res.data);
      queryClient.invalidateQueries({ queryKey: OVERVIEW_KEY });
      toast.success("Template reset to default");
    },
    onError,
  });
};

export const usePreviewEmailTemplate = () =>
  useMutation({
    mutationFn: ({ type, subject, body }: { type: emailService.EmailTemplateType; subject: string; body: string }) =>
      emailService.previewEmailTemplate(type, { subject, body }).then((res) => res.data),
    onError,
  });
