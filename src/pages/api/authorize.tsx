import { NextApiRequest, NextApiResponse } from 'next';

export default function Authorize(req: NextApiRequest, res: NextApiResponse) {
  res.redirect(`/${req.query.code}`);
}
