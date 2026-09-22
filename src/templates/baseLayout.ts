export function baseLayout(title: string, content: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>${title}</title>
        <style>
            body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f9f9f9; color: #333333; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 0 auto; background: #ffffff; padding: 40px; border-radius: 8px; margin-top: 40px; border: 1px solid #eaeded; }
            .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #888888; }
            .footer a { color: #555555; text-decoration: underline; }
            .btn { display: inline-block; background-color: #000000; color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            ${content}
        </div>
    </body>
    </html>
    `;
}
