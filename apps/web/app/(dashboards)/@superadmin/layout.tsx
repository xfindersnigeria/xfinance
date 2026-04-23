import { ENUM_ROLE } from "@/lib/types/enums";
import Wrapper from "../../../components/local/shared/dashboard/view/Wrapper";

export default function SuperadminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <Wrapper role={ENUM_ROLE.SUPERADMIN}>
      <main className=''>{children}</main>
    </Wrapper>
  );
}
