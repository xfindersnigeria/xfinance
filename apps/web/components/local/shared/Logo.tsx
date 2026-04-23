import Image from "next/image";

export default function Logo({
  white = false,
  classNames = "w-10 h-10",
  logoUrl,
}: {
  white?: boolean;
  classNames?: string;
  logoUrl?: string;
}) {
  const src = logoUrl || "/images/logo.png";
  return (
    <div className={`${classNames} mx-auto`}>
      <Image
        src={src}
        alt="XPortal Logo"
        width={180}
        height={180}
        className={`${classNames} object-contain`}
        priority
      />
    </div>
  );
}
