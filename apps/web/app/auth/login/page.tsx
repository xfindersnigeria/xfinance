import { headers } from 'next/headers';
import LoginForm from '@/components/local/shared/LoginForm';
import { getPublicCustomizationServer } from '@/lib/api/services/customizationService';
import { buildThemeCss } from '@/lib/utils/colorUtils';

export default async function LoginPage() {
  const headersList = await headers();
  const host = (headersList.get('host') || '').split(':')[0];
  const customization = await getPublicCustomizationServer(host);
  const themeStyle = buildThemeCss(customization);

  return (
    <>
      {/* Inject theme CSS server-side — zero flash on login page */}
      <style dangerouslySetInnerHTML={{ __html: themeStyle }} />
      <LoginForm customization={customization} />
    </>
  );
}
