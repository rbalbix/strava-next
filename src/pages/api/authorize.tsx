import { NextApiRequest, NextApiResponse } from 'next';

export default function Authorize(req: NextApiRequest, res: NextApiResponse) {
  const { code } = req.query;
  if (!code || typeof code !== 'string') {
    return res
      .status(400)
      .json({ error: 'Code parameter is missing or invalid' });
  }

  res.redirect(`/${code}`);
}
