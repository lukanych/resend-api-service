# 🚀 Registration & Verification Flow Integration Guide (Prisma + PostgreSQL)

This guide provides developers of the primary application with clear instructions on how to integrate the existing backend with our isolated email mailer microservice. This flow enables secure user registration and email token verification using **Prisma ORM** and **PostgreSQL**.

---

## 🏗️ Interaction Architecture

The mailer microservice runs entirely **Stateless**. It has no direct connection or access credentials to your primary database. Instead, user payloads are cryptographically signed into a temporary JSON Web Token (JWT) with a strict **24-hour expiration window**.

```text
[User Submits Form] ──> 1. Main Backend saves record to PostgreSQL (isVerified: false)
                               │
                               ▼
                         2. Main Backend fires HTTP POST to /api/v1/mailer/register
                               │
                               ▼
                         3. Mailer signs stateless JWT & sends clean activation HTML email
                               │
                               ▼
[User Clicks Email] ──> 4. Main Backend intercepts link and calls GET /api/v1/mailer/verify
                               │
                               ▼
                         5. Main Backend updates record in PostgreSQL (isVerified: true)
```

---

## ⚙️ 1. Environment Configuration (.env)

Add the following environment variables to the `.env` file of your **primary/main** application backend:

```env
# Connection string to your primary PostgreSQL instance
DATABASE_URL="postgresql://user:password@localhost:5432/main_db?schema=public"

# The host URL where the mailer microservice container is running
MAILER_SERVICE_URL="http://localhost:8089"

# Secret authorization key (Must match the API_SECURE_TOKEN configured in the Mailer microservice)
MAILER_SERVICE_TOKEN="c3079ca5b014ec9e1a0793eb2cd1ed975d4aec7b88a07ff166fcef3ac9b19cca"
```

---

## 🗄️ 2. Database Schema Definition (Prisma)

Ensure your database `User` model in your main application `schema.prisma` file includes an `isVerified` flag. It must default to `false` to block unverified accounts from logging in.

```prisma
// schema.prisma

model User {
  id           String   @id @default(uuid())
  email        String   @unique
  username     String
  passwordHash String
  isVerified   Boolean  @default(false) // ◄ Locks account until email confirmation
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

---

## 💻 3. Implementing Backend Route Controllers

Below is a production-ready example of controllers written for an **Express / Node.js** app running TypeScript, utilizing `@prisma/client` and `axios`.

### Step A: New User Registration Handler
When a new client signs up, create a pending record inside PostgreSQL, and then dispatch the activation signal to the Mailer microservice, sealing the database user ID inside `userData`.

```typescript
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import axios from 'axios';

const prisma = new PrismaClient();
const MAILER_URL = process.env.MAILER_SERVICE_URL || 'http://localhost:8089';
const MAILER_TOKEN = process.env.MAILER_SERVICE_TOKEN;

export const registerUser = async (req: Request, res: Response): Promise<void> => {
    const { email, username, password } = req.body;

    try {
        // 1. Verify if user already exists in your PostgreSQL database
        const existingUser = await prisma.user.findUnique({ where: { email } });
        if (existingUser) {
            res.status(400).json({ error: 'An account with this email already exists.' });
            return;
        }

        // 2. Hash password and persist pending user record to PostgreSQL
        const passwordHash = await bcrypt.hash(password, 10);
        const newUser = await prisma.user.create({
            data: { email, username, passwordHash, isVerified: false }
        });

        // 3. Command the mailer microservice to generate a token and email the user
        await axios.post(`${MAILER_URL}/api/v1/mailer/register`, {
            to: email,
            userData: {
                userId: newUser.id, // Seal the PostgreSQL primary key within the token
                action: 'CONFIRM_REGISTRATION'
            }
        }, {
            headers: {
                'x-api-token': MAILER_TOKEN,
                'Content-Type': 'application/json'
            }
        });

        res.status(201).json({
            success: true,
            message: 'Registration successful! Please check your inbox to activate your account.'
        });

    } catch (error: any) {
        console.error('[Registration Microservice Error]:', error.response?.data || error.message);
        res.status(500).json({ error: 'Internal server error processing registration.' });
    }
};
```

### Step B: Email Callback Verification Handler
This endpoint captures incoming traffic when the user clicks the "Confirm Email" button in their mailbox. The main backend relays the raw token to the microservice for cryptographic evaluation, then updates PostgreSQL.

```typescript
export const verifyEmailToken = async (req: Request, res: Response): Promise<void> => {
    const { token } = req.query;

    if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'Verification token parameter is missing.' });
        return;
    }

    try {
        // 1. Ask the microservice to cryptographically unpack and validate the token
        // This endpoint is public; you DO NOT pass the 'x-api-token' header here
        const mailerResponse = await axios.get(`${MAILER_URL}/api/v1/mailer/verify?token=${token}`);
        
        if (!mailerResponse.data.success) {
            res.status(400).json({ error: 'Token verification rejected by validation service.' });
            return;
        }

        // 2. Extract verified parameters originally sealed inside the JWT
        const { userId } = mailerResponse.data.user;

        // 3. Fetch record state from PostgreSQL (Defends against Replay Attacks)
        const user = await prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            res.status(404).json({ error: 'User record matching this token was not found.' });
            return;
        }

        if (user.isVerified) {
            // Already active; immediately send the user to the frontend login interface
            res.redirect('https://your-main-app.com');
            return;
        }

        // 4. Update the user account to fully active in PostgreSQL
        await prisma.user.update({
            where: { id: userId },
            data: { isVerified: true }
        });

        // 5. Success boundary reached — Seamlessly redirect back to your primary UI
        res.redirect('https://your-main-app.com');

    } catch (error: any) {
        const errorMessage = error.response?.data?.error || 'Expired or invalid token';
        console.error('[Verification Microservice Error]:', errorMessage);
        
        // Token expired (24h lifespan breached) or modified. Redirect to Frontend Error Screen.
        res.redirect(`https://your-main-app.com{encodeURIComponent(errorMessage)}`);
    }
};
```

---

## 🛡️ Security Engineering Best Practices

1. **Replay Attack Protections:** Always query the active database state of `isVerified` before modifying row data. The JWT string remains fully decodable and mathematically valid until it hits its 24-hour expiration, but your database should only perform the verification mutation once.
2. **Graceful 401 Expiration Handling:** If the verification call drops into a catch block with a `401` stating `"Verification link has expired."`, ensure your frontend offers a visible UI hook to *"Resend verification link"*.
3. **Data Contamination Prevention:** Never bundle sensitive rows (like a user's `passwordHash`) into the registration `userData` block. Limit token parameters to explicit pointer IDs (`userId`), `role` boundaries, or execution scopes.
