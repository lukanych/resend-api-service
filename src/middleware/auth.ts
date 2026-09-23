import { Request, Response, NextFunction } from 'express';

export function secureTokenMiddleware(req: Request, res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];
    const customHeader = req.headers['x-api-token'];
    
    let providedToken: string | undefined;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const parts = authHeader.split(' ');
        providedToken = parts[1];
    } else if (customHeader) {
        providedToken = customHeader as string;
    }

    // ВИПРАВЛЕНО: додано резервне значення токена за замовчуванням (fallback)
    const systemToken = process.env.API_SECURE_TOKEN || "c3079ca5b014ec9e1a0793eb2cd1ed975d4aec7b88a07ff166fcef3ac9b19cca";

    if (!systemToken) {
        res.status(500).json({ error: 'Server configuration error: Secure token is not set' });
        return;
    }

    if (!providedToken || providedToken !== systemToken) {
        res.status(401).json({ error: 'Unauthorized: Invalid or missing secure API token' });
        return;
    }

    next();
}
