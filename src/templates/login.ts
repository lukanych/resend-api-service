import { baseLayout } from './baseLayout';

export function loginTemplate(link: string): string {
const htmlContent = `
<h2>Portal Login</h2>
<p>Hello! You requested a one-time link to securely log in to your account.</p>
<a href="${link}" class="btn">Log in to your account</a>
<p>If you did not make this request, simply ignore this email.</p>
`; 
return baseLayout('System Login', htmlContent);
}