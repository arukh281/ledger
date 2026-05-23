import { NextRequest, NextResponse } from 'next/server';
import { APP_PASSWORD, AUTH_COOKIE, AUTH_TOKEN } from '@/lib/auth';

export async function POST(request: NextRequest) {
  let password = '';

  try {
    const body = (await request.json()) as { password?: string };
    password = body.password ?? '';
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }

  if (password !== APP_PASSWORD) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(AUTH_COOKIE, AUTH_TOKEN, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });

  return response;
}
