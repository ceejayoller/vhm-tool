import type {
  SendTokenResponse,
  VerifyTokenResponse,
  AuthUser,
} from "@/types/auth";
import type { VesselWithLayouts, LayoutDetail } from "@/types/api";

function getApiBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_KAIKO_API_URL ?? "";
  if (!url && process.env.NODE_ENV === "production") {
    throw new Error("NEXT_PUBLIC_KAIKO_API_URL is required in production");
  }
  return url;
}

const APP_NAME = "vhm-tool";

/** Callback invoked when an authenticated request receives 401/403 */
let onAuthError: (() => void) | null = null;

/** Register a handler to run when the API returns 401 or 403 (triggers logout). */
export function registerOnAuthError(fn: () => void): void {
  onAuthError = fn;
}

/** Structured API error with HTTP status and parsed response body */
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly data: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  opts?: { isAuthenticated?: boolean },
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-App-Name": APP_NAME,
    ...((options.headers as Record<string, string> | undefined) ?? {}),
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    if (
      opts?.isAuthenticated &&
      (response.status === 401 || response.status === 403)
    ) {
      onAuthError?.();
    }
    const data: unknown = await response.json().catch(() => null);
    throw new ApiError(
      `API request failed: ${response.status}`,
      response.status,
      data,
    );
  }

  return response.json() as Promise<T>;
}

/** Send a 6-digit OTP code to the user's email */
export async function sendOtpCode(
  email: string,
): Promise<SendTokenResponse> {
  return apiFetch<SendTokenResponse>("/api/v1/auth/token/send", {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

/** Verify the OTP code and receive a bearer token */
export async function verifyOtpCode(
  email: string,
  token: string,
): Promise<VerifyTokenResponse> {
  return apiFetch<VerifyTokenResponse>("/api/v1/auth/token/verify", {
    method: "POST",
    body: JSON.stringify({ email, token }),
  });
}

/** Fetch the currently authenticated user's info */
export async function fetchCurrentUser(
  bearerToken: string,
): Promise<AuthUser> {
  return apiFetch<AuthUser>(
    "/api/v1/auth/me",
    {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    },
    { isAuthenticated: true },
  );
}

// ── VHM API ──

const DEV_BYPASS =
  process.env.NODE_ENV === "development" &&
  process.env.NEXT_PUBLIC_VHM_DEV_BYPASS_AUTH === "true";

const MOCK_LAYOUT_ID = "dev-layout-001";

const MOCK_VESSELS: VesselWithLayouts[] = [
  {
    id: "dev-vessel-001",
    name: "MV Kaiko",
    imo_number: "0000000",
    layouts: [{ id: MOCK_LAYOUT_ID, name: "Main Deck" }],
  },
];

async function getMockLayoutDetail(): Promise<LayoutDetail> {
  const res = await fetch("/test-data/test.geojson");
  const parsed: unknown = await res.json();

  // The test file may be a plain array of Features or a FeatureCollection
  const geojson: LayoutDetail["geojson"] = Array.isArray(parsed)
    ? { type: "FeatureCollection", features: parsed }
    : (parsed as LayoutDetail["geojson"]);

  return {
    id: MOCK_LAYOUT_ID,
    name: "Main Deck",
    vessel_name: "MV Kaiko",
    use_mercator: false,
    ga_plan_url: "/test-data/ga-plan.png",
    geojson,
  };
}

/** Fetch vessels with VHM enabled and their layouts */
export async function fetchVhmVessels(
  bearerToken: string,
): Promise<VesselWithLayouts[]> {
  if (DEV_BYPASS) return MOCK_VESSELS;

  return apiFetch<VesselWithLayouts[]>(
    "/api/v1/vhm/vessels",
    {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    },
    { isAuthenticated: true },
  );
}

/** Fetch a single layout's details (GeoJSON + GA plan URL) */
export async function fetchLayoutDetail(
  bearerToken: string,
  layoutId: string,
): Promise<LayoutDetail> {
  if (DEV_BYPASS) return getMockLayoutDetail();

  return apiFetch<LayoutDetail>(
    `/api/v1/vhm/layouts/${encodeURIComponent(layoutId)}`,
    {
      headers: {
        Authorization: `Bearer ${bearerToken}`,
      },
    },
    { isAuthenticated: true },
  );
}
