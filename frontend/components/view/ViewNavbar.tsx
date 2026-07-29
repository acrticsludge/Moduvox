import Image from "next/image"

export function ViewNavbar() {
  return (
    <header className="border-b border-zinc-200 bg-white">
      <div className="mx-auto flex h-16 max-w-[1400px] items-center px-4 sm:px-6 lg:px-8">
        <Image src="/logo-wordmark.svg" alt="Moduvox" width={112} height={28} className="h-7 w-auto" priority />
      </div>
    </header>
  )
}
