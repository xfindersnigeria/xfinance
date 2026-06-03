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
      faviconFile,
    }: {
      data: { primaryColor?: string; siteName?: string };
      logoFile?: File;
      loginBgFile?: File;
      faviconFile?: File;
    }) => updateCustomization(data, logoFile, loginBgFile, faviconFile),
    onSuccess: (record, variables) => {
      queryClient.setQueryData(['customization'], record);

      const liveWhoami = useSessionStore.getState().whoami;
      if (liveWhoami) {
        setWhoami({
          ...liveWhoami,
          customization: {
            primaryColor: variables.data.primaryColor ?? record.primaryColor ?? '#4152B6',
            logoUrl: record.logoUrl ?? liveWhoami.customization?.logoUrl ?? null,
            loginBgUrl: record.loginBgUrl ?? liveWhoami.customization?.loginBgUrl ?? null,
            siteName: record.siteName ?? liveWhoami.customization?.siteName ?? null,
            faviconUrl: record.faviconUrl ?? liveWhoami.customization?.faviconUrl ?? null,
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
