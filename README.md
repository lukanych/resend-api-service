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

## 🔒 Security Compliance Architecture
* **Production Protection Check:** The container strictly validates authorization tokens before parsing any JSON payload bodies. If a threat vector leaves headers blank or passes mismatched character arrays, the middleware short-circuits the pipeline instantly, throwing an HTTP `401 Unauthorized` block to preserve Resend monthly pricing tier usage quotas.
* **Environment Integrity Isolation:** The repository contains a pre-configured `.gitignore` block. File structures prevent tracking local `.env` and `node_modules` paths to keep production data keys from leaking out onto public GitHub staging networks.
