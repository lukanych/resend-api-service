import { Router, Request, Response, RequestHandler, NextFunction } from 'express';
import { Resend } from 'resend';
import jwt from 'jsonwebtoken'; // <--- Додано для JWT
import { secureTokenMiddleware } from '../middleware/auth';
import { loginTemplate } from '../templates/login';
import { newsletterTemplate } from '../templates/newsletter';
import { registrationTemplate } from '../templates/registration'; // <--- Додано новий шаблон

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:8089';

interface AttachmentItem {
    filename: string;
    content: string;
}

// 1. Існуючий обробник відправки звичайних листів
const sendHandler: RequestHandler = async (req, res) => {
    const { to, templateType, templateData, from, attachments } = req.body;

    if (!to || !templateType) {
        res.status(400).json({ error: 'Missing required fields: to, templateType' });
        return;
    }

    try {
        let htmlBody = '';

        switch (templateType.toUpperCase()) {
            case 'LOGIN':
                htmlBody = loginTemplate(templateData?.link || '#');
                break;
            case 'NEWSLETTER':
                const unsubLink = `http://localhost:8089/mailer/unsubscribe?email=${encodeURIComponent(to)}`;
                htmlBody = newsletterTemplate(templateData?.content || '', unsubLink);
                break;
            default:
                res.status(400).json({ error: `Template ${templateType} not found.` });
                return;
        }

        const emailOptions: any = {
            from: from || 'onboarding@resend.dev',
            to,
            subject: templateData?.subject || 'Нове повідомлення',
            html: htmlBody,
        };

        if (attachments && Array.isArray(attachments)) {
            emailOptions.attachments = attachments.map((file: AttachmentItem) => ({
                filename: file.filename,
                content: file.content
            }));
        }

        const result = await resend.emails.send(emailOptions);

        if (result.error) {
            res.status(400).json({ success: false, error: result.error });
            return;
        }

        res.status(200).json({ success: true, messageId: result.data?.id });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 2. НОВИЙ обробник: Ініціація реєстрації (Генерація токена + відправка листа)
// Захищено вашим secureTokenMiddleware
const registerHandler = (req: Request, res: Response, next: NextFunction): void => {
    const { to, from, userData } = req.body;

    if (!to) {
        res.status(400).json({ error: 'Missing required field: to (email)' });
        return;
    }

    try {
        // Зашиваємо email та userData в JWT токен на 24 години
        const token = jwt.sign(
            { email: to, ...userData }, 
            JWT_SECRET, 
            { expiresIn: '24h' }
        );

        // Формуємо лінк, який веде на ендпоінт верифікації нижче
        const verificationLink = `${APP_BASE_URL}/api/v1/mailer/verify?token=${token}`;
        const htmlBody = registrationTemplate(verificationLink);

        resend.emails.send({
            from: from || 'onboarding@resend.dev',
            to,
            subject: 'Підтвердження реєстрації',
            html: htmlBody,
        })
        .then((result) => {
            if (result.error) {
                res.status(400).json({ success: false, error: result.error });
                return;
            }
            res.status(200).json({ 
                success: true, 
                message: 'Verification email sent successfully.',
                messageId: result.data?.id
            });
        })
        .catch((error) => {
            res.status(500).json({ error: error.message });
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
};

// 3. НОВИЙ обробник: Публічна верифікація токена (Клік користувача з листа)
// Цей ендпоінт ПУБЛІЧНИЙ (без secureTokenMiddleware), оскільки людина просто клікає на лінк у пошті
const verifyHandler = (req: Request, res: Response, next: NextFunction): void => {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'Token is required' });
        return;
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        res.status(200).json({ 
            success: true, 
            message: 'Email successfully verified.', 
            user: decoded 
        });
    } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
             res.status(401).json({ error: 'Verification link has expired.' });
             return;
        }
        res.status(400).json({ error: 'Invalid or corrupted verification token.' });
    }
};

// Налаштування маршрутів (Роутів)
router.post('/send', secureTokenMiddleware, sendHandler);
router.post('/register', secureTokenMiddleware, registerHandler); // <--- Захищений роут реєстрації
router.get('/verify', verifyHandler);                             // <--- Публічний роут верифікації

export default router;
