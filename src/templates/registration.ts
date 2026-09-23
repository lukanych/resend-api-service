import { baseLayout } from './baseLayout';

/**
* REGISTRATION EMAIL TEMPLATE GENERATOR
* @param verificationLink Link containing the JWT token for confirmation
*/
export const registrationTemplate = (verificationLink: string): string => {
// Generate clean email HTML content without displaying the long raw token
const content = `
<h2 style="font-size: 24px; font-weight: 600; margin-top: 0; color: #111111;">
Registration Confirmation
</h2>

<p style="font-size: 16px; line-height: 1.6; color: #333333;">
Thank you for registering with our service! To activate your account and complete the verification process, please click the button below:
</p>

<div style="text-align: center; margin: 30px 0;">
<!-- Main verification button -->
<a href="${verificationLink}" class="btn" target="_blank">
Confirm Email
</a>
</div>

<div class="footer" style="border-top: 1px solid #eaeded; padding-top: 20px; margin-top: 30px;">
<p style="margin: 0; line-height: 1.4;">
This link is valid for 24 hours.<br />
If you did not register with us, simply delete this email. 
</p>
</div>
`; 

return baseLayout('Registration Confirmation', content);
};