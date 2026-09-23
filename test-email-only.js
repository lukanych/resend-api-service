const readline = require('readline');

// --- Configuration ---
const MAILER_URL = "http://localhost:8089";
const API_TOKEN = "c3079ca5b014ec9e1a0793eb2cd1ed975d4aec7b88a07ff166fcef3ac9b19cca";

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function showBanner() {
    console.clear();
    console.log("=========================================================");
    console.log("   Resend Mailer Microservice - Full Template Test Suite ");
    console.log("=========================================================");
    console.log(`Target Environment URL : ${MAILER_URL}`);
    console.log("Security Token Loaded  : [PROTECTED]");
    console.log("---------------------------------------------------------\n");
}

function showMenu() {
    console.log("Select an operational test mode:");
    console.log("1) Send [LOGIN] Template Email");
    console.log("2) Send [NEWSLETTER] Template Email");
    console.log("\x1b[32m3) Trigger [REGISTRATION] Flow (Generate 24h JWT & Send Link)\x1b[0m");
    console.log("\x1b[33m4) Test [GET] Token Verification (Decode Registration JWT)\x1b[0m");
    console.log("5) Simulate Web View: [SUBSCRIBE] Form");
    console.log("6) Simulate Web View: [UNSUBSCRIBE] Action");
    console.log("\x1b[31m7) Exit Testing Context\x1b[0m");
    console.log("---------------------------------------------------------");
    rl.question("Input numeric vector code (1-7): ", handleMenuChoice);
}

function handleMenuChoice(choice) {
    switch (choice.trim()) {
        case '1': runStandardEmail('LOGIN'); break;
        case '2': runStandardEmail('NEWSLETTER'); break;
        case '3': runRegistrationMode(); break;
        case '4': runVerificationMode(); break;
        case '5': runWebViewSimulation('subscribe'); break;
        case '6': runWebViewSimulation('unsubscribe'); break;
        case '7':
            console.log("\n\x1b[32mClosing active pipeline context. Happy engineering! 🚀\x1b[0m\n");
            rl.close();
            process.exit(0);
            break;
        default:
            console.log("\x1b[31mInvalid option entry pattern. Please input 1-7.\x1b[0m\n");
            setTimeout(askToContinue, 1500);
    }
}

// Handler for LOGIN and NEWSLETTER
function runStandardEmail(templateType) {
    console.log(`\n--- Sending [${templateType}] Template Email ---`);
    rl.question("Enter recipient email address: ", (email) => {
        if (!email.trim()) return cancelOperation();

        let templateData = { subject: `Test ${templateType} Email` };

        if (templateType === 'LOGIN') {
            templateData.link = "https://your-main-app.com";
        } else if (templateType === 'NEWSLETTER') {
            templateData.content = "Welcome to our monthly upgrades! We have deployed new secure API channels.";
        }

        const payload = JSON.stringify({
            to: email.trim(),
            templateType: templateType,
            templateData: templateData
        });

        executePostRequest('/api/v1/mailer/send', payload, email.trim(), false);
    });
}

// Handler for REGISTRATION (JWT Creation)
function runRegistrationMode() {
    console.log("\n--- [REGISTRATION FLOW]: Generating Cryptographic JWT & Link ---");
    rl.question("Enter destination tester email address: ", (email) => {
        if (!email.trim()) return cancelOperation();

        rl.question("Enter mock PostgreSQL identifier (Default: db_usr_999): ", (userId) => {
            const finalUserId = userId.trim() || "db_usr_999";
            
            const payload = JSON.stringify({
                to: email.trim(),
                userData: {
                    userId: finalUserId,
                    role: "developer_test_node"
                }
            });

            executePostRequest('/api/v1/mailer/register', payload, email.trim(), true);
        });
    });
}

// Handler for VERIFICATION (JWT Decoding)
function runVerificationMode() {
    console.log("\n--- [VERIFICATION FLOW]: Cryptographic Signature Diagnostic ---");
    rl.question("Paste the raw token block string (characters after ?token=): ", async (token) => {
        if (!token.trim()) {
            console.log("\x1b[31mOperation aborted. Token input string cannot be blank.\x1b[0m");
            return askToContinue();
        }

        console.log("Transmitting packet verification frames...");
        try {
            const response = await fetch(`${MAILER_URL}/api/v1/mailer/verify?token=${token.trim()}`);
            const result = await response.json();

            if (response.ok && result.success) {
                console.log("\n\x1b[32m[VERIFIED] Cryptographic Token Signature Integrity Authenticated!\x1b[0m");
                console.log("---------------------------------------------------------");
                console.log("Decoded Sealed State User Profile Metadata:");
                console.log(`  ↳ Associated Email    : \x1b[36m${result.user.email}\x1b[0m`);
                console.log(`  ↳ Postgres Database ID: \x1b[36m${result.user.userId}\x1b[0m`);
                console.log(`  ↳ Authorized User Role: \x1b[36m${result.user.role}\x1b[0m`);
                console.log(`  ↳ Issued Timestamp    : ${result.user.iat}`);
                console.log(`  ↳ Expiration Lifespan : ${result.user.exp}`);
                console.log("---------------------------------------------------------");
            } else {
                console.log(`\n\x1b[31m[ERROR] Verification Rejected: ${result.error || response.statusText}\x1b[0m`);
            }
        } catch (err) {
            console.log(`\n\x1b[31m[ERROR] Runtime Exception: ${err.message}\x1b[0m`);
        }
        askToContinue();
    });
}

// Handler for Web View Simulation (SUBSCRIBE / UNSUBSCRIBE)
function runWebViewSimulation(type) {
    console.log(`\n--- Simulating Public Web View Router Action: [${type.toUpperCase()}] ---`);
    rl.question("Enter target email address to simulate: ", async (email) => {
        if (!email.trim()) return cancelOperation();

        const targetUrl = `${MAILER_URL}/mailer/${type}?email=${encodeURIComponent(email.trim())}`;
        console.log(`\nProcessing request frame against public router routing engine...`);
        console.log(`Constructed Web Target: \x1b[34m${targetUrl}\x1b[0m`);
        
        try {
            const response = await fetch(targetUrl);
            if (response.ok) {
                console.log(`\n\x1b[32m[SUCCESS] Public view routed successfully! (HTTP Status: ${response.status})\x1b[0m`);
                console.log(`The microservice successfully processed the client-side opt-out interface.`);
            } else {
                console.log(`\n\x1b[31m[ERROR] Public route returned status: ${response.status}\x1b[0m`);
            }
        } catch (err) {
            console.log(`\n\x1b[31m[ERROR] Network Connection Failure: ${err.message}\x1b[0m`);
        }
        askToContinue();
    });
}

// Helper: Outbound POST pipeline logic
async function executePostRequest(endpoint, payload, email, isRegistration) {
    console.log("Processing network packet streams...");
    try {
        const response = await fetch(`${MAILER_URL}${endpoint}`, {
            method: 'POST',
            headers: {
                'x-api-token': API_TOKEN,
                'Content-Type': 'application/json'
            },
            body: payload
        });

        const result = await response.json();

        if (response.ok && result.success) {
            console.log("\n\x1b[32m[SUCCESS] Microservice accepted communication state!\x1b[0m");
            console.log(`Message Envelope ID : ${result.messageId || 'N/A'}`);
            if (result.message) console.log(`Status Response     : ${result.message}`);
            
            if (isRegistration) {
                console.log(`\n\x1b[36m👉 Action Required: Open your (${email}) inbox, copy the underlying JWT token block from the verification link, and paste it into Menu Option 4.\x1b[0m`);
            }
        } else {
            console.log(`\n\x1b[31m[ERROR] Server rejected request: ${result.error || response.statusText}\x1b[0m`);
        }
    } catch (err) {
        console.log(`\n\x1b[31m[ERROR] Runtime Exception: ${err.message}\x1b[0m`);
    }
    askToContinue();
}

function cancelOperation() {
    console.log("\x1b[31mOperation canceled. Missing mandatory target fields.\x1b[0m");
    askToContinue();
}

function askToContinue() {
    console.log("\n---------------------------------------------------------");
    rl.question("Press Enter to return to main menu...", () => {
        showBanner();
        showMenu();
    });
}

// Initialize Loop
showBanner();
showMenu();
