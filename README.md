
# Secure Resend API Mailer Service (TypeScript + Docker)

An ultra-lightweight, high-performance, and secure microservice wrapper designed to isolate and manage the [Resend API](https://resend.com) inside an independent Docker container. Built strictly using **TypeScript** with native compilation (`tsc`) and type safety.

## ⚡ Key Features
* **Zero Database Overhead:** Session-free memory validation requiring no PostgreSQL dependencies.
* **API Protection Middleware:** All inbound endpoints are strictly protected via customized token verification headers (`x-api-token`).
* **Clean Template Isolation:** Emails are rendered using native TS string layouts (`src/templates/`) which support standard HTML and Inline CSS.
* **Subscription Management Lifecycle:** Bundled public endpoints (`/mailer/unsubscribe`) automatically handle client-side opt-out interfaces directly from the container.
* **Base64 Attachment Layer:** Integrated arrays accept documents, invoices, or log files via dynamic object encoding inputs.
## 🏗️ Service Architecture
```text
resend-api-service/
├── .env.example
├── docker-compose.yml
├── Dockerfile
├── tsconfig.json
├── package.json
├── test-email-only.js
└── src/
    ├── app.ts
    ├── middleware/
    │   └── auth.ts <-- Secure x-api-token gatekeeper
    ├── routes/
    │   ├── email.ts <-- Protected template dispatching endpoints
    │   └── views.ts <-- Public Unsubscribe/Subscribe web views
    └── templates/
        ├── baseLayout.ts <-- Centralized layout design layout engine
        ├── login.ts
        ├── newsletter.ts
        └── registration.ts
```
## 🚀 Microservice Setup (Standalone Deployment)

### 1. Initialize Local System Variables
Clone this repository to your build environment, copy the environment template, and fill in your confidential service variables:
```bash
cp .env.example .env
```

Open `.env` and fill out your configurations:
```env
PORT=3000
RESEND_API_KEY=re_yourSecretResendKeyHere
API_SECURE_TOKEN=your_generated_64_char_hex_token
APP_BASE_URL=http://localhost:8089
JWT_SECRET=your_secure_jwt_signing_secret
```

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
## 🧪 Testing the Pipeline (`test-email-only.js`)

We have bundled an interactive Node.js command-line testing runner utility designed for developers to validate registration payloads and token cryptographic signatures quickly.

To run the interactive menu, execute the utility locally in your terminal context:
```bash
node test-email-only.js
```

### Available Matrix Test Selections:
1. **Mode 1 (LOGIN Template):** Tests the standard delivery engine using native single-sign-on dynamic token layout parameters.
2. **Mode 2 (NEWSLETTER Template):** Dispatches monthly content blocks along with automated, container-side tracking opt-out footer paths.
3. **Mode 3 (REGISTRATION Flow Delivery):** Calls the backend auth engine to cryptographically seal sample parameters into a 24-hour stateless JWT and emails the layout.
4. **Mode 4 (JWT Cryptographic Decoding):** Parses raw verification string codes back to console terminals to return clear database fields directly from container structures.
5. **Mode 5 & 6 (SUBSCRIBE / UNSUBSCRIBE Lifecycle views):** Simulates browser routing hits targeting explicit client-side public dynamic components without manual integration testing overheads.
## 🔗 Integration Guide (Connecting to an Existing Project)

This service isolates all email tasks. Your primary application service (Next.js, Python, Ruby, Go, NestJS, etc.) communicates with this container solely via protected internal HTTP calls.

### Integration Approach: JavaScript / TypeScript Ecosystem (Axios Examples)
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
```
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

## 🛡️ Security Compliance Architecture
* **Production Protection Check:** The container strictly validates authorization tokens before parsing any JSON payload bodies. If a threat vector leaves headers blank or passes mismatched character arrays, the middleware short-circuits the pipeline instantly, throwing an HTTP `401 Unauthorized` block to preserve Resend monthly pricing tier usage quotas.
* **Environment Integrity Isolation:** The repository contains a pre-configured `.gitignore` block. File structures prevent tracking local `.env` and `node_modules` paths to keep production data keys from leaking out onto public GitHub staging networks.

## 🗺️ Project Roadmap & Future Scope

We are actively working on expanding this microservice into a unified, lightweight communications hub. Below are the key milestones planned for future releases. Open Source contributors are highly encouraged to pick up any of these items!

### 🟩 Phase 1: Core Enhancements (Short-Term)
* [ ] **Automatic Success Webhook Callbacks:** Add a notification layer that fires an HTTP POST webhook back to your main application server once Resend successfully delivers or drops an email.
* [ ] **Custom JWT Expiration Overrides:** Allow the primary backend to dynamically specify custom token lifespans (e.g., `expiresIn: '1h'` or `7d`) inside the `/register` payload body.

### 🟨 Phase 2: Template & Localization Management (Medium-Term)
* [ ] **Dynamic Language Localization (i18n):** Introduce an automatic language toggle inside the template engine (e.g., `templateData: { lang: 'uk' }`) to change static email text frameworks seamlessly.
* [ ] **Password Reset Layout Integration:** Add a native `src/templates/passwordReset.ts` module with pre-configured transaction layout parameters.

### 🟦 Phase 3: Channel Expansion (Long-Term)
* [ ] **Multi-Channel SMS Templates:** Integrate lightweight fallback endpoints for SMS dispatch systems using popular secure APIs (like Twilio or Infobip).
* [ ] **Developer Web Dashboard:** Mount an optional public-facing web view route container dashboard showing real-time delivery performance charts using pure Tailwind CSS.

---

### 🤝 How to Contribute
If you want to implement any of the roadmap features above:
1. Open an **Issue** to discuss your architectural approach.
2. Fork the repository and build your feature layer.
3. Submit a **Pull Request (PR)** tracking back to the `main` branch. 


## 📝 License & Author
Developed and maintained by **Lukanych Vasyl**.  
This project is licensed under the terms of the **MIT License**. You are free to modify, distribute, and integrate this wrapper within production systems provided the original copyright notice remains intact.
