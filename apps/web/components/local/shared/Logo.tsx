import Image from "next/image";

export default function Logo({
  white = false,
  logoUrl,
  className,
}: {
  white?: boolean;
  logoUrl?: string;
  className?: string;
  /** @deprecated use className */
  classNames?: string;
}) {
  const src = logoUrl || "/images/logo.png";
  return (
    <div className={`flex ${className ?? ""}`}>
      <Image
        src={src}
        alt="Logo"
        width={300}
        height={60}
        className="h-10  w-auto max-w-[300px] object-contain"
        priority
      />
    </div>
  );
}
