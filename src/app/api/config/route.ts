import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // In production, you should load this from environment variables
    const config = {
      key: "YWRtaW5Aa29vYmlkZS5jb20:2bysJdW0bIPx55xf_ifqE",
      url: "https://api.d-id.com"
    };

    return NextResponse.json(config);
  } catch (error) {
    console.error('Failed to load API config:', error);
    return NextResponse.json(
      { error: 'Failed to load API configuration' },
      { status: 500 }
    );
  }
}
