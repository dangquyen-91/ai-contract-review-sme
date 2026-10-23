import { NextRequest } from 'next/server';
import { proxyProfile } from '@/lib/api/profile-proxy';
export async function GET(request: NextRequest) { return proxyProfile(request); }
export async function PATCH(request: NextRequest) { return proxyProfile(request); }
