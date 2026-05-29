type SameSite = 'Strict' | 'Lax' | 'None';

type CookieOptions = {
  maxAge: number;
  sameSite?: SameSite;
};

function serializeHttpOnlyCookie(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const sameSite = options.sameSite || 'Strict';
  return `${name}=${value}; Path=/; Max-Age=${options.maxAge}; HttpOnly; SameSite=${sameSite}${secure}`;
}

function clearHttpOnlyCookie(name: string, sameSite: SameSite = 'Strict'): string {
  return serializeHttpOnlyCookie(name, '', { maxAge: 0, sameSite });
}

function getCookieValue(cookieHeader: string, key: string): string | null {
  const cookie = cookieHeader
    .split(';')
    .find((item) => item.trim().startsWith(`${key}=`));
  if (!cookie) return null;
  return cookie.split('=').slice(1).join('=');
}

export { clearHttpOnlyCookie, getCookieValue, serializeHttpOnlyCookie };
