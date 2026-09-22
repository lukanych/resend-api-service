import { Router, Request, Response } from 'express';

const router = Router();

router.get('/unsubscribe', (req: Request, res: Response) => {
const email = req.query.email as string;
res.send(`
<div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
<h2>You have successfully unsubscribed</h2>
<p>The address <strong>${email || 'your email address'}</strong> has been removed from the regular mailing lists.</p>
<p>If this was a mistake, you can <a href="/mailer/subscribe?email=${encodeURIComponent(email || '')}">subscribe again</a>.</p>
</div>
`);
});

router.get('/subscribe', (req: Request, res: Response) => {
const email = req.query.email as string;
res.send(`
<div style="font-family: Arial, sans-serif; text-align: center; margin-top: 100px;">
<h2>Thank you for subscribing!</h2>
<p>The address <strong>${email || ''}</strong> has been added back to the newsletter list.</p>
</div>
`);
});

export default router;