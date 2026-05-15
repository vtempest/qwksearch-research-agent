/**
 * @fileoverview Google token refresh endpoint. POST uses the stored refresh
 * token to obtain a new access token and updates the HTTP-only cookies.
 */
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { refreshGoogleAccessToken } from '@/lib/integrations/googleTokenRefresh';

// POST /api/google-docs/refresh-token - Refresh expired access token
export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const refreshToken = cookieStore.get('google_refresh_token')?.value;

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'No refresh token available. Please reconnect Google Drive.',
        },
        { status: 401 }
      );
    }

    const result = await refreshGoogleAccessToken(refreshToken);

    // Update cookies with new tokens
    cookieStore.set('google_access_token', result.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    if (result.refreshToken && result.refreshToken !== refreshToken) {
      cookieStore.set('google_refresh_token', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Token refreshed successfully',
      expiresAt: result.expiresAt,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to refresh token',
        needsReauth: true,
      },
      { status: 401 }
    );
  }
}
