// pages/api/send-email.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { Resend } from 'resend';

// Inicializa o Resend com sua API Key
const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Apenas permite requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, subject, html, from = 'onboarding@resend.dev' } = req.body;

    // Validação básica dos campos obrigatórios
    if (!to || !subject || !html) {
      return res.status(400).json({
        error: 'Missing required fields: to, subject, or html',
      });
    }

    // Envia o email usando o Resend
    const { data, error } = await resend.emails.send({
      from: from,
      to: Array.isArray(to) ? to : [to],
      subject: subject,
      html: html,
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(400).json({
        error: error.message || 'Failed to send email',
      });
    }

    // Retorna sucesso
    res.status(200).json({
      success: true,
      data: data,
      message: 'Email sent successfully',
    });
  } catch (error) {
    console.error('Email sending error:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
}
