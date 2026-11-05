type SameSite = 'Strict' | 'Lax' | 'None';

// Cookie HttpOnly que transporta o token opaco da sessão do aplicativo
// (D6/PR 2). O valor só significa algo com o registro `strava:session:*`
// correspondente no Redis — ver src/server/session.ts.
export const SESSION_COOKIE = 'gl_session';

type CookieOptions = {
  maxAge: number;
  sameSite?: SameSite;
};

// Padrão Lax, e não Strict: os cookies de sessão/estado precisam ser enviados
// na navegação de topo de volta do Strava (`/api/authorize` lê
// `strava_oauth_state`), que é cross-site — Strict silenciosamente não envia o
// cookie nesse retorno e quebraria o OAuth. Antes, gravar era Lax e limpar era
// Strict (inconsistência apontada pelo D6/PR 2); com o padrão unificado, os
// call sites podem omitir a opção e continuar corretos.
function serializeHttpOnlyCookie(
  name: string,
  value: string,
  options: CookieOptions,
): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const sameSite = options.sameSite || 'Lax';
  return `${name}=${value}; Path=/; Max-Age=${options.maxAge}; HttpOnly; SameSite=${sameSite}${secure}`;
}

function clearHttpOnlyCookie(name: string, sameSite: SameSite = 'Lax'): string {
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
