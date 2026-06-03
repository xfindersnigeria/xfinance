import { headers } from 'next/headers';
import ForgotPasswordForm from '@/components/local/shared/ForgotPasswordForm';
import { getPublicCustomizationServer } from '@/lib/api/services/customizationService';
import { buildThemeCss } from '@/lib/utils/colorUtils';

export default async function ForgotPasswordPage() {
  const headersList = await headers();
  const host = (headersList.get('host') || '').split(':')[0];
  const customization = await getPublicCustomizationServer(host);
  const themeStyle = buildThemeCss(customization);

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      <ForgotPasswordForm customization={customization} />
    </>
  );
}
