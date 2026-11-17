import { NextRequest, NextResponse } from 'next/server';
import { SecurityAuth } from '@/lib/security/auth';

export async function GET(req: NextRequest) {
  const authRequired = Boolean(SecurityAuth.getExpectedToken());
  const check = SecurityAuth.verifyApiRequest(req);
  return NextResponse.json({
    authRequired,
    authenticated: check.authorized
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (body.action === 'logout') {
      const res = NextResponse.json({
        authRequired: Boolean(SecurityAuth.getExpectedToken()),
        authenticated: false,
        message: 'Session logged out.'
      });
      res.cookies.set('va_session', '', {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        maxAge: 0
      });
      return res;
    }

    const token = (body.token || body.secret || '').trim();
    if (!SecurityAuth.verifyTokenValue(token)) {
      return NextResponse.json(
        { error: 'Invalid access token or passphrase.', authenticated: false },
        { status: 401 }
      );
    }

    const res = NextResponse.json({
      authRequired: Boolean(SecurityAuth.getExpectedToken()),
      authenticated: true,
      message: 'Session authenticated.'
    });

    res.cookies.set('va_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Authentication failed.' },
      { status: 500 }
    );
  }
}
