/** User info returned by the Kaiko Dashboard API */
export interface AuthUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
}

/** Response from POST /api/v1/auth/token/send */
export interface SendTokenResponse {
  ok: true;
}

/** Response from POST /api/v1/auth/token/verify */
export interface VerifyTokenResponse {
  bearer_token: string;
  user: AuthUser;
}

/** Error response shape from login endpoints (400) */
export interface AuthErrorResponse {
  email: string | null;
  token: string | null;
}
