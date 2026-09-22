import { Router, Request, Response, RequestHandler } from 'express';
import { Resend } from 'resend';
import { secureTokenMiddleware } from '../middleware/auth';
import { loginTemplate } from '../templates/login';
import { newsletterTemplate } from '../templates/newsletter';

const router = Router();
const resend = new Resend(process.env.RESEND_API_KEY);

interface AttachmentItem {
    filename: string;
    content: string;
}

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

router.post('/send', secureTokenMiddleware, sendHandler);

export default router;
