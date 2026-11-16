"use client";

import Image from 'next/image';
import { useState } from 'react';

export function ProfileAvatar({ name, url, size = 40 }: { name: string; url?: string | null; size?: number }) {
  const [failed, setFailed] = useState<string | null>(null);
  const initials = name.trim().split(/\s+/).slice(-2).map(part => part[0]).join('').toUpperCase() || 'LS';
  return <span style={{ width: size, height: size }} className="relative inline-grid shrink-0 place-items-center overflow-hidden rounded-xl bg-[#eaf1ff] font-bold text-[#2856a2]">
    {url && url !== failed ? <Image src={url} alt="" width={size} height={size} unoptimized className="h-full w-full object-cover" onError={() => setFailed(url)} /> : <span className={size > 60 ? 'text-2xl' : 'text-xs'}>{initials}</span>}
  </span>;
}
