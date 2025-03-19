import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'NextAuth API routes are working'
  });
}

export const dynamic = 'force-dynamic'; 