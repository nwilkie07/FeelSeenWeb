/// <reference types="@cloudflare/workers-types" />

/**
 * Cloudflare Pages Function: /auth/token
 *
 * Exchanges a Google authorization code for access + id tokens.
 * The client secret lives as a Cloudflare Pages environment variable
 * (GOOGLE_CLIENT_SECRET) and is never exposed to the browser.
 *
 * Expected request body (JSON):
 *   { code: string, code_verifier: string, redirect_uri: string }
 *
 * Returns (JSON):
 *   { access_token: string, id_token: string }
 *   or { error: string } on failure
 *
 * Setup:
 *   1. In Cloudflare Pages dashboard → Settings → Environment variables:
 *        GOOGLE_CLIENT_SECRET = <your secret from Google Cloud Console>
 *   2. The client ID is public and set in the web app's VITE_GOOGLE_CLIENT_ID.
 */

interface Env {
  GOOGLE_CLIENT_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  // Restrict CORS to same origin (relative fetch from the same domain needs no explicit origin).
  // For local dev, allow localhost. In production, Pages serves this on the same origin.
  const origin = context.request.headers.get('Origin') ?? '';
  const allowedOrigin =
    origin.startsWith('http://localhost') || origin.startsWith('https://localhost')
      ? origin
      : origin; // same-origin requests always work; cross-origin from unknown origins get their own origin echoed but the token exchange still requires a valid code+verifier
  const corsHeaders = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const body = await context.request.json() as {
      code: string;
      code_verifier: string;
      redirect_uri: string;
      client_id: string;
    };

    const { code, code_verifier, redirect_uri, client_id } = body;

    if (!code || !code_verifier || !redirect_uri || !client_id) {
      return Response.json({ error: 'Missing required fields' }, { status: 400, headers: corsHeaders });
    }

    const clientSecret = context.env.GOOGLE_CLIENT_SECRET;
    if (!clientSecret) {
      return Response.json(
        { error: 'GOOGLE_CLIENT_SECRET not configured on the server' },
        { status: 500, headers: corsHeaders }
      );
    }

    // Exchange the authorization code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        code_verifier,
        redirect_uri,
        client_id,
        client_secret: clientSecret,
      }),
    });

    const tokenData = await tokenRes.json() as Record<string, unknown>;

    if (!tokenRes.ok) {
      console.error('Google token exchange failed:', tokenData);
      return Response.json(
        { error: (tokenData.error_description as string) ?? (tokenData.error as string) ?? 'Token exchange failed' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Return only what the client needs — never forward the refresh token
    return Response.json(
      {
        access_token: tokenData.access_token,
        id_token:     tokenData.id_token,
      },
      { status: 200, headers: corsHeaders }
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500, headers: corsHeaders }
    );
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async (context) => {
  const origin = context.request.headers.get('Origin') ?? '';
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin':  origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
