export function SlideThumbnail() {
  return (
    <span className="inline-flex h-[0.85em] w-[1.4em] items-start rounded-[3px] border border-zinc-300 bg-white p-[1px] shadow-sm align-middle overflow-hidden">
      <span className="flex flex-col w-full gap-[1px]">
        <span className="h-[3px] w-3/5 rounded-[1px] bg-zinc-800" />
        <span className="h-[2px] w-4/5 rounded-[1px] bg-zinc-200" />
        <span className="h-[2px] w-3/5 rounded-[1px] bg-zinc-200" />
        <span className="h-[2px] w-1/2 rounded-[1px] bg-zinc-200" />
      </span>
    </span>
  );
}
