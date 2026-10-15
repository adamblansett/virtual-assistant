/**
 * Google OAuth 2.0 Token Manager.
 * Safely creates consent URLs, exchanges auth codes for tokens, and refreshes tokens.
 */

export interface StoredOAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // Unix timestamp ms
  email?: string;
  scopes: string[];
}

export class GmailOAuthManager {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  private tokens: StoredOAuthTokens | null = null;

  public static readonly DEFAULT_SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.modify',
    'https://www.googleapis.com/auth/gmail.compose'
  ];

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/integrations/gmail/callback';
  }

  public getAuthUrl(state?: string): string {
    if (!this.clientId) {
      throw new Error('GOOGLE_CLIENT_ID is not configured in environment variables.');
    }

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      scope: GmailOAuthManager.DEFAULT_SCOPES.join(' '),
      access_type: 'offline',
      prompt: 'consent'
    });

    if (state) params.set('state', state);

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  public async exchangeCodeForTokens(code: string): Promise<StoredOAuthTokens> {
    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: this.clientId,
        client_secret: this.clientSecret,
        redirect_uri: this.redirectUri,
        grant_type: 'authorization_code'
      })
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Token exchange failed: ${err}`);
    }

    const data = await res.json();
    const tokens: StoredOAuthTokens = {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: Date.now() + (data.expires_in * 1000),
      scopes: (data.scope || '').split(' ')
    };

    this.tokens = tokens;
    return tokens;
  }

  public async getValidTokens(): Promise<StoredOAuthTokens | null> {
    if (!this.tokens) return null;

    // Check expiration with a 60-second safety buffer
    if (Date.now() >= this.tokens.expiresAt - 60000) {
      if (this.tokens.refreshToken) {
        await this.refreshAccessToken();
      } else {
        return null;
      }
    }

    return this.tokens;
  }

  public async getAccessToken(): Promise<string | null> {
    const valid = await this.getValidTokens();
    return valid ? valid.accessToken : null;
  }

  public async refreshAccessToken(): Promise<string | null> {
    if (!this.tokens?.refreshToken) return null;

    try {
      const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          refresh_token: this.tokens.refreshToken,
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token'
        })
      });

      if (!res.ok) return null;

      const data = await res.json();
      this.tokens.accessToken = data.access_token;
      this.tokens.expiresAt = Date.now() + (data.expires_in * 1000);
      return this.tokens.accessToken;
    } catch {
      return null;
    }
  }

  public async revokeTokens(): Promise<void> {
    if (this.tokens?.accessToken) {
      try {
        await fetch(`https://oauth2.googleapis.com/revoke?token=${this.tokens.accessToken}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      } catch {
        // Revoke best effort
      }
    }
    this.tokens = null;
  }

  public setTokensDirectly(tokens: StoredOAuthTokens): void {
    this.tokens = tokens;
  }
}
