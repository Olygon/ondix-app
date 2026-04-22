import Image from "next/image";

export function OndixLogo() {
  return (
    <div className="flex items-center">
      <Image
        src="/ondix.svg"
        alt="ONDIX"
        width={180}
        height={75}
        priority
        className="h-auto w-[182px]"
      />
    </div>
  );
}
