import Image from "next/image";

// File logo: public/LogoGudangLPS.png (ganti file itu untuk mengubah logo)
export default function Logo({ width = 160, height = 48, className = "" }) {
  return (
    <Image
      src="/LogoGudangLPS.png"
      alt="Logo gudangLPS"
      width={width}
      height={height}
      priority
      className={`h-auto w-auto ${className}`}
      style={{ maxWidth: width, maxHeight: height }}
    />
  );
}
