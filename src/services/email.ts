import { apiEmail } from './api';

export interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

export async function sendEmail(emailData: EmailData) {
  try {
    const response = await apiEmail.post('/', JSON.stringify(emailData));

    if (response.status >= 200 && response.status < 300) {
      return response.data;
    } else {
      throw new Error(
        `Send email failed: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    console.error('Email service error:', error);
    throw error;
  }
}

// Template de email simples de contato
export function createContactEmailTemplate(
  name: string,
  email: string,
  message: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007aff; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Novo Contato - Stuff Stats</h1>
        </div>
        <div class="content">
          <p><strong>Nome:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Mensagem:</strong></p>
          <p>${message}</p>
        </div>
        <div class="footer">
          <p>Email enviado automaticamente pelo sistema Stuff Stats</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export function createErrorEmailTemplate(
  message: string,
  error: string
): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #007aff; color: white; padding: 20px; text-align: center; }
        .content { background-color: #f9f9f9; padding: 20px; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Novo Contato - Stuff Stats</h1>
        </div>
        <div class="content">
          <p><strong>Mensagem:</strong></p>
          <p>${message}</p>
          <p><strong>Erro:</strong></p>
          <p>${error}</p>
        </div>
        <div class="footer">
          <p>Email enviado automaticamente pelo sistema Stuff Stats</p>
        </div>
      </div>
    </body>
    </html>
  `;
}
