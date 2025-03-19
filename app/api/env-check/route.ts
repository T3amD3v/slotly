import { NextResponse } from 'next/server';

export async function GET() {
  // Return environment variables (but redact secrets)
  return NextResponse.json({
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ? 'Set to: ' + process.env.GOOGLE_CLIENT_ID.substring(0, 8) + '...' : 'Not set',
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'Set (redacted)' : 'Not set',
    ALLOWED_EMAIL_DOMAINS: process.env.ALLOWED_EMAIL_DOMAINS,
    NODE_ENV: process.env.NODE_ENV,
  });
} 