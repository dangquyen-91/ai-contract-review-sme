import { NextRequest } from 'next/server';
import { proxyProfile } from '@/lib/api/profile-proxy';
export async function POST(request: NextRequest) { return proxyProfile(request, 'avatar'); }
export async function DELETE(request: NextRequest) { return proxyProfile(request, 'avatar'); }
