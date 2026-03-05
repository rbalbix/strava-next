import axios from 'axios';

export type ActivitySportType = string;

type ActivityTypeLike = {
  type?: unknown;
  sport_type?: unknown;
};

type ErrorResponseDataLike = {
  message?: unknown;
  errors?: unknown;
  error?: unknown;
};

type ErrorLike = {
  message?: unknown;
  status?: unknown;
  response?: {
    status?: unknown;
    data?: unknown;
  };
};

function readText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
}

function extractMessageFromErrorData(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null;
  const parsed = data as ErrorResponseDataLike;

  const message = readText(parsed.message);
  if (message) return message;

  const singleError = readText(parsed.error);
  if (singleError) return singleError;

  if (Array.isArray(parsed.errors)) {
    const combined = parsed.errors
      .map((item) => {
        if (typeof item === 'string') return item.trim();
        if (item && typeof item === 'object') {
          const fromMessage = readText(
            (item as { message?: unknown; code?: unknown }).message,
          );
          if (fromMessage) return fromMessage;
          const fromCode = readText((item as { code?: unknown }).code);
          if (fromCode) return fromCode;
        }
        return '';
      })
      .filter(Boolean)
      .join('; ');
    if (combined.length > 0) return combined;
  }

  return null;
}

export function getActivitySportType(
  activity: ActivityTypeLike,
): ActivitySportType | null {
  const sportType = readText(activity.sport_type);
  if (sportType) return sportType;

  const legacyType = readText(activity.type);
  if (legacyType) return legacyType;

  return null;
}

export function getStravaErrorDetails(error: unknown): {
  status: number | null;
  message: string;
} {
  if (axios.isAxiosError(error)) {
    const status =
      typeof error.response?.status === 'number' ? error.response.status : null;
    const message =
      extractMessageFromErrorData(error.response?.data) ||
      readText(error.message) ||
      'Unknown Strava error';
    return { status, message };
  }

  if (error && typeof error === 'object') {
    const e = error as ErrorLike;
    const statusFromError = typeof e.status === 'number' ? e.status : null;
    const statusFromResponse =
      typeof e.response?.status === 'number' ? e.response.status : null;
    const status = statusFromError ?? statusFromResponse;
    const message =
      extractMessageFromErrorData(e.response?.data) ||
      readText(e.message) ||
      'Unknown Strava error';
    return { status, message };
  }

  return {
    status: null,
    message: error instanceof Error ? error.message : String(error),
  };
}
