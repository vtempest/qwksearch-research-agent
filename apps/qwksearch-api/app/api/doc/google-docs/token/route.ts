/**
 * @fileoverview Google access token retrieval. GET returns the stored Google
 * OAuth access token from cookies for client-side use (e.g., Google Picker).
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// GET /api/google-docs/token - Get access token for client-side use (e.g., Google Picker)
export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('google_access_token')?.value;

    if (!accessToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not authenticated with Google Drive',
        },
        { status: 401 }
      );
    }

    return NextResponse.json({
      success: true,
      accessToken,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to retrieve access token',
      },
      { status: 500 }
    );
  }
}
