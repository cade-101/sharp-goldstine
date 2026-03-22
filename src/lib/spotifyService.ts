import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabase';
import { SPOTIFY_CLIENT_ID } from './config';

const SPOTIFY_BASE = 'https://api.spotify.com/v1';
const SCOPES = [
  'playlist-read-private',
  'playlist-modify-public',
  'playlist-modify-private',
  'user-read-playback-state',
  'user-modify-playback-state',
].join(' ');

export const SPOTIFY_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.spotify.com/authorize',
  tokenEndpoint: 'https://accounts.spotify.com/api/token',
};

export function makeSpotifyRedirectUri() {
  const uri = AuthSession.makeRedirectUri({ scheme: 'tether', path: 'spotify' });
  console.log('[Spotify] redirectUri:', uri);
  return uri;
}

export function getSpotifyScopes() {
  return SCOPES;
}

export async function saveSpotifyTokens(
  userId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number
) {
  const expiry = Date.now() + expiresIn * 1000;
  await supabase.from('user_profiles').update({
    spotify_access_token: accessToken,
    spotify_refresh_token: refreshToken,
    spotify_token_expiry: expiry,
  }).eq('id', userId);
}

export async function clearSpotifyTokens(userId: string) {
  await supabase.from('user_profiles').update({
    spotify_access_token: null,
    spotify_refresh_token: null,
    spotify_token_expiry: null,
  }).eq('id', userId);
}

async function spotifyFetch(path: string, accessToken: string, options: RequestInit = {}) {
  const resp = await fetch(`${SPOTIFY_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });
  if (!resp.ok) throw new Error(`Spotify ${resp.status}: ${path}`);
  if (resp.status === 204) return null;
  return resp.json();
}

export async function searchTracks(query: string, accessToken: string) {
  const encoded = encodeURIComponent(query);
  const data = await spotifyFetch(`/search?q=${encoded}&type=track&limit=10`, accessToken);
  return (data?.tracks?.items ?? []) as SpotifyTrack[];
}

export async function addTrackToPlaylist(playlistId: string, trackUri: string, accessToken: string) {
  await spotifyFetch(`/playlists/${playlistId}/tracks`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ uris: [trackUri] }),
  });
}

export async function createPlaylist(spotifyUserId: string, name: string, accessToken: string) {
  const data = await spotifyFetch(`/users/${spotifyUserId}/playlists`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ name, public: true, description: 'Shared gym playlist — Tether' }),
  });
  return data as { id: string; external_urls: { spotify: string } };
}

export async function getPlaybackState(accessToken: string) {
  return spotifyFetch('/me/player', accessToken) as Promise<SpotifyPlaybackState | null>;
}

export async function startPlayback(accessToken: string, contextUri?: string, positionMs = 0) {
  const body: any = { position_ms: positionMs };
  if (contextUri) body.context_uri = contextUri;
  await spotifyFetch('/me/player/play', accessToken, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
}

export async function seekPosition(positionMs: number, accessToken: string) {
  await spotifyFetch(`/me/player/seek?position_ms=${positionMs}`, accessToken, {
    method: 'PUT',
  });
}

export async function getSpotifyMe(accessToken: string) {
  return spotifyFetch('/me', accessToken) as Promise<{ id: string; display_name: string }>;
}

// ── PKCE TOKEN EXCHANGE & REFRESH ─────────────────────────────────────────────

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: SPOTIFY_CLIENT_ID,
    code_verifier: codeVerifier,
  });
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!resp.ok) throw new Error(`Token exchange failed: ${resp.status}`);
  return resp.json();
}

export async function refreshSpotifyToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number; refresh_token?: string }> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: SPOTIFY_CLIENT_ID,
  });
  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!resp.ok) throw new Error(`Token refresh failed: ${resp.status}`);
  return resp.json();
}

/** Returns a valid access token, auto-refreshing with PKCE refresh token if expired. */
export async function getValidAccessToken(user: {
  id: string;
  spotify_access_token?: string | null;
  spotify_refresh_token?: string | null;
  spotify_token_expiry?: number | null;
}): Promise<string | null> {
  if (!user.spotify_access_token) return null;
  // 60-second buffer before expiry
  if ((user.spotify_token_expiry ?? 0) > Date.now() + 60000) {
    return user.spotify_access_token;
  }
  if (!user.spotify_refresh_token) return null;
  try {
    const tokens = await refreshSpotifyToken(user.spotify_refresh_token);
    await saveSpotifyTokens(
      user.id,
      tokens.access_token,
      tokens.refresh_token ?? user.spotify_refresh_token,
      tokens.expires_in
    );
    return tokens.access_token;
  } catch {
    return null;
  }
}

export async function getHouseholdPlaylistId(houseName: string): Promise<string | null> {
  const { data } = await supabase
    .from('household_settings')
    .select('joint_ops_playlist_id')
    .eq('house_name', houseName)
    .maybeSingle();
  return data?.joint_ops_playlist_id ?? null;
}

export async function saveHouseholdPlaylistId(houseName: string, playlistId: string) {
  await supabase.from('household_settings').upsert({
    house_name: houseName,
    joint_ops_playlist_id: playlistId,
  });
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  uri: string;
  duration_ms: number;
}

export interface SpotifyPlaybackState {
  is_playing: boolean;
  progress_ms: number;
  item: SpotifyTrack | null;
  context: { uri: string } | null;
}
