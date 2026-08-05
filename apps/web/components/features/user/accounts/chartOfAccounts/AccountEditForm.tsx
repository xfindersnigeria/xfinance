"use client";
import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useUpdateAccount } from "@/lib/api/hooks/useAccounts";

const accountEditSchema = z.object({
  name: z.string().min(1, "Account name is required"),
  description: z.string().optional(),
});

type AccountEditValues = z.infer<typeof accountEditSchema>;

interface AccountEditFormProps {
  account: { id: string; name: string; description?: string | null };
  onSuccess?: () => void;
}

/**
 * Deliberately minimal — only name and description are editable here.
 * Renaming an account with a linked bank account cascades the name to the
 * bank record too (AccountService.update on the backend).
 */
export default function AccountEditForm({ account, onSuccess }: AccountEditFormProps) {
  const updateAccount = useUpdateAccount();

  const form = useForm<AccountEditValues>({
    resolver: zodResolver(accountEditSchema),
    defaultValues: {
      name: account.name ?? "",
      description: account.description ?? "",
    },
  });

  const onSubmit = (values: AccountEditValues) => {
    updateAccount.mutate({ id: account.id, data: values }, { onSuccess });
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Account Name</FormLabel>
              <FormControl>
                <Input placeholder="e.g. Operating Account" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Brief description of the account"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={updateAccount.isPending} className="w-full">
          {updateAccount.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </form>
    </Form>
  );
}
