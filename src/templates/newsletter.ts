import { baseLayout } from './baseLayout';

export function newsletterTemplate(content: string, unsubscribeUrl: string): string {
const htmlContent = `
<h2>Our Weekly Updates</h2>
<div style="line-height: 1.6;">${content}</div>
<hr style="border: 0; border-top: 1px solid #eaeded; margin: 30px 0;">
<div class="footer">
You are receiving this email because you subscribed to our newsletter.<br>
<a href="${unsubscribeUrl}">Unsubscribe from the newsletter</a>
</div>
`; 
return baseLayout('News Digest', htmlContent);
}