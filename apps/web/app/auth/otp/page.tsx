import { headers } from 'next/headers';
import ResetPasswordForm from '@/components/local/shared/ResetPasswordForm';
import { getPublicCustomizationServer } from '@/lib/api/services/customizationService';
import { buildThemeCss } from '@/lib/utils/colorUtils';

export default async function OtpPage() {
  const headersList = await headers();
  const host = (headersList.get('host') || '').split(':')[0];
  const customization = await getPublicCustomizationServer(host);
  const themeStyle = buildThemeCss(customization);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      <ResetPasswordForm customization={customization} />
    </>
  );
}
