import { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow POST for logout
  if (req.method !== 'POST') {
    return res.status(405).end();
  }

  // Clear cookies (including HttpOnly ones set by the server)
  const cookies = [
    'strava_code=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict',
    'strava_athleteId=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict',
    'strava_oauth_state=; Path=/; Max-Age=0; HttpOnly; SameSite=Strict',
  ];

  // In production, cookies should be Secure
  if (process.env.NODE_ENV === 'production') {
    const secureCookies = cookies.map((c) => `${c}; Secure`);
    res.setHeader('Set-Cookie', secureCookies);
  } else {
    res.setHeader('Set-Cookie', cookies);
  }

  return res.status(200).json({ success: true });
}
