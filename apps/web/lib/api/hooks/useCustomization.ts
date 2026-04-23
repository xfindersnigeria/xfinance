import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { getCustomization, updateCustomization } from '@/lib/api/services/customizationService';
import { useSessionStore } from '@/lib/store/session';

export function useCustomization() {
  return useQuery({
    queryKey: ['customization'],
    queryFn: getCustomization,
  });
}

export function useUpdateCustomization() {
  const queryClient = useQueryClient();
  const setWhoami = useSessionStore((state) => state.setWhoami);

  return useMutation({
    mutationFn: ({
      data,
      logoFile,
      loginBgFile,
    }: {
      data: { primaryColor?: string };
      logoFile?: File;
      loginBgFile?: File;
    }) => updateCustomization(data, logoFile, loginBgFile),
    onSuccess: (record, variables) => {
      // Update query cache immediately — no refetch race condition
      queryClient.setQueryData(['customization'], record);

      // Use getState() so we always spread the LIVE whoami (no stale-closure risk).
      // Use variables.data.primaryColor as the color source — it's exactly what the
      // user submitted, bypassing any server-side null/default fallback in the record.
      // URLs (logoUrl, loginBgUrl) must come from the server because Cloudinary
      // generates them; local file object URLs are not permanent.
      const liveWhoami = useSessionStore.getState().whoami;
      if (liveWhoami) {
        setWhoami({
          ...liveWhoami,
          customization: {
            primaryColor: variables.data.primaryColor ?? record.primaryColor ?? '#4152B6',
            logoUrl: record.logoUrl ?? liveWhoami.customization?.logoUrl ?? null,
            loginBgUrl: record.loginBgUrl ?? liveWhoami.customization?.loginBgUrl ?? null,
          },
        });
      }
      toast.success('Customization saved');
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to save customization');
    },
  });
}
