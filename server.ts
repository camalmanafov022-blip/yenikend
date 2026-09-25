import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route for orders
  app.post('/api/order', async (req, res) => {
    const { product, price, customer, phone } = req.body;
    const recipient = 'diqqet02@mail.ru';

    console.log('New Order Received:', { product, price, customer, phone });

    // In a real app, you would use an email service like SendGrid or a real SMTP server
    // For now, we'll try to use nodemailer with environment variables if provided
    // If not provided, we just log it and return success for the demo
    
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: 587,
          secure: false,
          auth: {
            user: smtpUser,
            pass: smtpPass,
          },
        });

        await transporter.sendMail({
          from: `"AqroMüasir Sifariş" <${smtpUser}>`,
          to: recipient,
          subject: `Yeni Sifariş: ${product}`,
          text: `
            Yeni sifariş gəldi!
            
            Məhsul: ${product}
            Qiymət: ${price} ₼
            Müştəri: ${customer}
            Telefon: ${phone}
          `,
          html: `
            <h2>Yeni Sifariş!</h2>
            <p><strong>Məhsul:</strong> ${product}</p>
            <p><strong>Qiymət:</strong> ${price} ₼</p>
            <p><strong>Müştəri:</strong> ${customer}</p>
            <p><strong>Telefon:</strong> ${phone}</p>
          `,
        });
        console.log('Email sent successfully');
      } catch (error) {
        console.error('Failed to send email:', error);
        // We still return 200 for the demo, but log the error
      }
    } else {
      console.log('SMTP credentials not provided. Email not sent, but order logged.');
    }

    res.json({ success: true, message: 'Order received' });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
