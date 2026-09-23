# Secure Resend API Mailer Service (TypeScript + Docker)

An ultra-lightweight, high-performance, and secure microservice wrapper designed to isolate and manage the [Resend API](https://resend.com) inside an independent Docker container. Built strictly using **TypeScript** with native compilation (`tsc`) and type safety.

## 🚀 Key Features
* **Zero Database Overhead:** Session-free memory validation requiring no PostgreSQL dependencies.
* **API Protection Middleware:** All inbound endpoints are strictly protected via customized token verification headers (`x-api-token`).
* **Clean Template Isolation:** Emails are rendered using native TS string layouts (`src/templates/`) which support standard HTML and Inline CSS.
* **Subscription Management Lifecycle:** Bundled public endpoints (`/mailer/unsubscribe`) automatically handle client-side opt-out interfaces directly from the container.
* **Base64 Attachment Layer:** Integrated arrays accept documents, invoices, or log files via dynamic object encoding inputs.

---

## 🛠️ Service Architecture

```text
resend-api-service/
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── tsconfig.json
├── package.json
└── src/
    ├── app.ts
    ├── middleware/
    │   └── auth.ts       <-- Secure x-api-token gatekeeper
    ├── routes/
    │   ├── email.ts      <-- Protected template dispatching endpoints
    │   └── views.ts      <-- Public Unsubscribe/Subscribe web views
    └── templates/        <-- Centralized design layout engine
        ├── baseLayout.ts
        ├── login.ts
        └── newsletter.ts
```

---

## 💻 Microservice Setup (Standalone Deployment)

### 1. Initialize Local System Variables
Clone this repository to your build environment, copy the environment template, and fill in your confidential service variables:
```bash
cp .env.example .env
```
Open `.env` and fill out your configurations:
```env
RESEND_API_KEY=re_yourSecretResendKeyHere
API_SECURE_TOKEN=your_generated_64_char_hex_token
```
*(To generate a highly secure token locally in your PowerShell terminal, execute: `[System.Security.Cryptography.RNGCryptoServiceProvider]` ...)*

### 2. Install Local Type Dependencies (For Editor Linting Only)
Ensure your host editor (VS Code) correctly registers type definitions without red warning indicators:
```bash
npm install
```

### 3. Spin Up Container Deployment
Initialize the isolated environment layer on host port `8089`:
```bash
docker compose up --build -d
```
Verify operational compliance via the automated health check router:
```bash
curl -X GET http://localhost:8089/api/v1/mailer/health \
  -H "x-api-token: YOUR_CONFIGURED_SECURE_TOKEN"
```

---

## 🔌 Integration Guide (Connecting to an Existing Project)

This service isolates all email tasks. Your primary application service (Next.js, Python, Ruby, Go, NestJS, etc.) communicates with this container solely via protected internal HTTP calls.

### Integration Approach A: JavaScript / TypeScript Ecosystem (Axios Examples)
Import this code block into your main existing backend controllers to safely dispatch verification payloads:

```typescript
import axios from 'axios';

interface EmailPayload {
    to: string;
    templateType: 'LOGIN' | 'NEWSLETTER';
    templateData: {
        subject: string;
        link?: string;
        content?: string;
    };
    attachments?: Array<{ filename: string; content: string }>;
}

async function triggerSystemEmail(payload: EmailPayload) {
    try {
        const response = await axios.post('http://localhost:8089/api/v1/mailer/send', payload, {
            headers: {
                'x-api-token': process.env.MAILER_SERVICE_TOKEN, // Matches API_SECURE_TOKEN
                'Content-Type': 'application/json'
            }
        });
        console.log(`Email accepted by service wrapper. Message ID: ${response.data.messageId}`);
    } catch (error: any) {
        console.error('Mailer connection error:', error.response?.data || error.message);
    }
}

// Execution usage for Secure Single-Sign-On Links:
triggerSystemEmail({
    to: "client@example.com",
    templateType: "LOGIN",
    templateData: {
        subject: "Verify Your Identity",
        link: "https://your-main-app.com"
    }
});
```

### Integration Approach B: Cross-Platform Python Systems
```python
import requests

def fire_system_newsletter(target_user, news_content):
    url = "http://localhost:8089/api/v1/mailer/send"
    headers = {
        "x-api-token": "YOUR_SECURE_TOKEN_STRING",
        "Content-Type": "application/json"
    }
    data = {
        "to": target_user,
        "templateType": "NEWSLETTER",
        "templateData": {
            "subject": "Monthly Product Upgrades",
            "content": news_content
        }
    }
    response = requests.post(url, json=data, headers=headers)
    return response.json()
```

---

## 🎨 Modifying Email Designs & Styles

Developers do not need to rewrite API endpoint parameters to adjust structural email aesthetics. Layouts are completely unified locally.

1. **Global Corporate Visual Polish:** Open `src/templates/baseLayout.ts`. Alter the inline background tokens, fonts, or primary signature margins within the template wrapper literal.
2. **Template Expansion Routine:** To add a new layout (e.g., `WELCOME_EMAIL`):
   * Create `src/templates/welcome.ts` following the pattern in `login.ts`.
   * Open `src/routes/email.ts` and add a new switch condition mapping your layout signature:
     ```typescript
     case 'WELCOME':
         htmlBody = welcomeTemplate(templateData?.username);
         break;
     ```
3. **Hot-Reload Build Refresh:** Recompile changed TypeScript modules directly inside Docker:
   ```bash
   docker compose up --build -d
   ```

---
### 🔄 Database & Backend Integration Architecture (Registration Flow)

Since this mailer service is an isolated, stateless microservice, it does not talk to your database directly. Instead, your **Main Application Backend** coordinates the database operations and uses the mailer service via HTTP requests.

Below is the architectural blueprint and concrete code examples showing how to integrate these endpoints into an existing database lifecycle.

```text
[User Registers] ──> 1. Main Backend (Saves Record with isVerified: false)
                           │
                           ▼
                     2. Main Backend calls POST /api/v1/auth/register (with x-api-token)
                           │
                           ▼
                     3. Mailer Service generates JWT & sends email to User
                           │
                           ▼
[User Clicks Link] ─> 4. Main Backend intercepts or reads GET /api/v1/auth/verify
                           │
                           ▼
                     5. Main Backend updates Database (Set isVerified: true) ──> [Success UI]
```

#### 🏭 Step 1: Initiating Registration (Main Backend Example)

When a user submits a registration form on your application, your primary backend should save their account as **inactive/unverified** and then trigger the Mailer microservice.

```typescript
import axios from 'axios';

// Example inside your main application's registration controller
async function handleUserRegistration(req, res) {
    const { email, password, username } = req.body;

    try {
        // 1. Hash password and save the pending user to your database (e.g., Prisma, Mongoose, PostgreSQL)
        const newUser = await myDatabase.user.create({
            data: {
                email,
                passwordHash: await hashPassword(password),
                username,
                isVerified: false // Keep account locked until verified
            }
        });

        // 2. Fire and forget the registration payload to the Mailer microservice
        await axios.post('http://localhost:8089/api/v1/auth/register', {
            to: email,
            userData: { 
                userId: newUser.id, // Pass DB identification inside the secure token
                action: 'REGISTRATION_CONFIRM'
            }
        }, {
            headers: {
                'x-api-token': process.env.MAILER_SERVICE_TOKEN, // Matches your API_SECURE_TOKEN
                'Content-Type': 'application/json'
            }
        });

        return res.status(201).json({ 
            success: true, 
            message: "Account created! Please check your email to activate it." 
        });

    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
```

#### 🔓 Step 2: Handling the Verification Callback & DB Update

Once the user clicks the link inside the email, the token must be validated, and the corresponding row in your database must be updated to `isVerified: true`.

Depending on your design, you have **two approaches** to finalize this step:

##### Option A: Internal Redirect (Simplest Approach)
If the `APP_BASE_URL` in the Mailer service is set to point directly to your **Main App Frontend**, your frontend code can simply read the token from the URL params, send a background `FETCH` request to the Mailer's `/verify` endpoint, extract the `userId`, and send it to your main backend to unlock the row.

##### Option B: Main Backend Proxy Verification
If you want your Main App Backend to handle the click directly and update the DB instantly, write a routing controller on your main server like this:

```typescript
// Inside your Main Application Backend Router (e.g., GET /auth/confirm-email)
async function verifyUserEmail(req, res) {
    const { token } = req.query; // Extracted from the email link click

    if (!token) return res.redirect('https://your-app.com');

    try {
        // 1. Ask the mailer service to cryptographically verify and decode the token
        const mailerResponse = await axios.get(`http://localhost:8089/api/v1/auth/verify?token=${token}`);
        
        if (mailerResponse.data.success) {
            const { userId, email } = mailerResponse.data.user;

            // 2. The token is valid! Update the status inside your Database
            await myDatabase.user.update({
                where: { id: userId },
                data: { isVerified: true }
            });

            // 3. Seamlessly redirect your user to your frontend login or onboarding dashboard
            return res.redirect('https://your-app.com');
        }

    } catch (error) {
        // Handle expired (24h limit) or corrupted tokens safely
        const errorMsg = error.response?.data?.error || "verification_failed";
        return res.redirect(`https://your-app.com{encodeURIComponent(errorMsg)}`);
    }
}
```

#### 🛡️ Database Security Best Practices
* **Prevent Replay Attacks:** Since JWT tokens are stateless, they remain cryptographically readable until they expire. To ensure a user cannot click the same verification link multiple times, always check your DB state first: `if (user.isVerified) { return res.redirect('/dashboard'); }`.
* **Idempotency:** Designing your verification database queries using an idempotent approach (like an unconditional `SET isVerified = true`) ensures that duplicate incoming network hooks from aggressive mail scanners or double-clicks do not corrupt application states.

## 🔒 Security Compliance Architecture
* **Production Protection Check:** The container strictly validates authorization tokens before parsing any JSON payload bodies. If a threat vector leaves headers blank or passes mismatched character arrays, the middleware short-circuits the pipeline instantly, throwing an HTTP `401 Unauthorized` block to preserve Resend monthly pricing tier usage quotas.
* **Environment Integrity Isolation:** The repository contains a pre-configured `.gitignore` block. File structures prevent tracking local `.env` and `node_modules` paths to keep production data keys from leaking out onto public GitHub staging networks.

## 🧪 Testing the Registration & Verification Flow

You can test the registration lifecycle locally using **PowerShell** (Windows) or **cURL** (Linux/macOS). Ensure your Docker container is running before executing these steps.

### Step 1: Initiate Registration (Send Verification Email)
This request simulates your primary backend triggering a registration event. It passes user payload data to the microservice, which cryptographically signs it into a 24-hour JWT token and sends an email.

#### Option A: Windows PowerShell (Recommended)
```powershell
$headers = @{
    "x-api-token"  = "c3079ca5b014ec9e1a0793eb2cd1ed975d4aec7b88a07ff166fcef3ac9b19cca"
    "Content-Type" = "application/json"
}

$body = @{
    to = "your_test_email@example.com"
    userData = @{
        userId = "db_user_id_999"
        role   = "admin"
    }
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:8089/api/v1/mailer/register" -Method Post -Headers $headers -Body $body
```

#### Option B: Linux / macOS cURL
```bash
curl -X POST http://localhost:8089/api/v1/mailer/register \
  -H "x-api-token: c3079ca5b014ec9e1a0793eb2cd1ed975d4aec7b88a07ff166fcef3ac9b19cca" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "your_test_email@example.com",
    "userData": {
      "userId": "db_user_id_999",
      "role": "admin"
    }
  }'
```

* **Expected Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Verification email sent successfully.",
    "messageId": "01a0ce4b-c8b1-7721-84a3-c7fd4563a84f"
  }
  ```

---

### Step 2: Verify the Token (Simulate Email Click)
Open your inbox, locate the **"Підтвердження реєстрації"** email, and click the **"Підтвердити Email"** button. 

Alternatively, extract the token from the link or test the public endpoint directly by opening the following URL format in any browser or executing a `GET` request:

```bash
curl -X GET "http://localhost:8089/api/v1/mailer/verify?token=YOUR_EXTRACTED_JWT_TOKEN"
```

* **Expected Response (200 OK):**
  The service securely decodes the stateless token and returns the sealed state parameters to your frontend/app layer:
  ```json
  {
    "success": true,
    "message": "Email successfully verified.",
    "user": {
      "email": "your_test_email@example.com",
      "userId": "db_user_id_999",
      "role": "admin",
      "iat": 1711200000,
      "exp": 1711286400
    }
  }
  ```

---

### 🛡️ Security & Boundary Constraints Testing
To ensure production threat vectors are completely locked down, verify these edge cases:
1. **Missing Access Headers:** Send a `POST /register` without the `x-api-token` header. The server must drop the connection with a `401 Unauthorized` status code.
2. **Signature Tampering:** Alter a single character inside a valid `?token=` parameter on the `GET /verify` endpoint. The service must immediately decline authorization and respond with:
   ```json
   { "error": "Invalid or corrupted verification token." }
   ```
3. **Expiration Lifespan:** Tokens are set to die strictly after **24 hours** (`expiresIn: '24h'`). Attempting to verify an outdated link will throw a `401 Unauthorized` block with `"Verification link has expired."`.


## 📄 License & Author

Developed and maintained by **Lukanych Vasyl**.

This project is licensed under the terms of the **MIT License**. You are free to modify, distribute, and integrate this wrapper within production systems provided the original copyright notice remains intact.