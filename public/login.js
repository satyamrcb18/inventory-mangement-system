import { initializeApp } from "https://www.gstatic.com/firebasejs/10.9.0/firebase-app.js";
import { 
    getAuth, signInWithPopup, GoogleAuthProvider, 
    RecaptchaVerifier, signInWithPhoneNumber,
    sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink
} from "https://www.gstatic.com/firebasejs/10.9.0/firebase-auth.js";

// TODO: Replace this with your actual Firebase Project config!
const firebaseConfig = {
  apiKey: "AIzaSyD5IaX6okkryxCHBR_mvwz_tvVkKb30mTY",
  authDomain: "inventory-mangement-syst-f1159.firebaseapp.com",
  projectId: "inventory-mangement-syst-f1159",
  storageBucket: "inventory-mangement-syst-f1159.firebasestorage.app",
  messagingSenderId: "48220079166",
  appId: "1:48220079166:web:e7ee37957b60c1147c3d6f",
  measurementId: "G-3WGSSC9KC1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Initialize Lucide Icons
if (window.lucide) { lucide.createIcons(); }

// Redirect if logged in
if (localStorage.getItem('isAdminLoggedIn') === 'true') {
    window.location.href = '/dashboard.html';
}

const errorBox = document.getElementById('login-error');
const errorText = document.getElementById('error-text');

// Elements
const primaryAuthMethods = document.getElementById('primary-auth-methods');
const phoneOtpSection = document.getElementById('phone-otp-section');
const requestOtpSection = document.getElementById('request-otp-section');
const verifyOtpSection = document.getElementById('verify-otp-section');

const btnGoogleLogin = document.getElementById('btn-google-login');
const btnShowPhone = document.getElementById('btn-show-phone');
const btnBack = document.getElementById('btn-back');

// UI Elements - Email Link Auth
const btnShowEmail = document.getElementById('btn-show-email');
const emailSection = document.getElementById('email-link-section');
const btnBackEmail = document.getElementById('btn-back-email');
const btnSendEmailLink = document.getElementById('btn-send-email-link');
const emailInput = document.getElementById('emailInput');

const btnSendOtp = document.getElementById('btn-send-otp');
const btnVerifyOtp = document.getElementById('btn-verify-otp');
const phoneInput = document.getElementById('phoneNumber');
const otpInput = document.getElementById('otpCode');

// Helper to show errors
function showError(msg, type = 'error') {
    errorText.textContent = msg;
    errorBox.style.display = 'block';
    errorBox.style.background = type === 'success' ? '#d4edda' : '#f8d7da';
    errorBox.style.color = type === 'success' ? '#155724' : '#721c24';
    const box = document.querySelector('.login-box');
    box.style.animation = 'none';
    box.offsetHeight; 
    box.style.animation = 'shake 0.4s cubic-bezier(.36,.07,.19,.97) both';
}
function clearError() { errorBox.style.display = 'none'; }

// Global shake animation
if (!document.getElementById('shake-anim')) {
    const style = document.createElement('style');
    style.id = 'shake-anim';
    style.innerHTML = `
    @keyframes shake {
        10%, 90% { transform: translate3d(-1px, 0, 0); }
        20%, 80% { transform: translate3d(2px, 0, 0); }
        30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
        40%, 60% { transform: translate3d(4px, 0, 0); }
    }
    .btn.disabled { opacity: 0.6; pointer-events: none; }
    `;
    document.head.appendChild(style);
}

// ========================
// 1. Google (Gmail) Login
// ========================
btnGoogleLogin.addEventListener('click', async () => {
    clearError();
    const provider = new GoogleAuthProvider();
    btnGoogleLogin.classList.add('disabled');
    btnGoogleLogin.innerHTML = 'Signing in...';
    
    try {
        if(firebaseConfig.apiKey === "YOUR_API_KEY") {
            throw new Error("Please add your Firebase Config keys in login.js first!");
        }
        
        const result = await signInWithPopup(auth, provider);
        // Successful login
        localStorage.setItem('isAdminLoggedIn', 'true');
        localStorage.setItem('adminName', result.user.displayName || 'Admin');
        window.location.href = '/dashboard.html';
        
    } catch (error) {
        showError(error.message);
        btnGoogleLogin.classList.remove('disabled');
        btnGoogleLogin.innerHTML = '<svg style="width:18px;height:18px;margin-right:8px;" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/><path fill="none" d="M1 1h22v22H1z"/></svg> Continue with Google';
    }
});

// ========================
// 2. Phone OTP Navigation
// ========================
btnShowPhone.addEventListener('click', () => {
    clearError();
    primaryAuthMethods.style.display = 'none';
    phoneOtpSection.style.display = 'block';
    
    // Auto initialize reCAPTCHA when screen opens
    if (!window.recaptchaVerifier) {
        try {
           window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
              'size': 'normal',
              'callback': (response) => { /* reCAPTCHA solved */ }
           });
           window.recaptchaVerifier.render().catch(err => {
              console.log("Recaptcha config error, likely due to dummy Firebase keys.", err);
           });
        } catch(e) {
           console.log("Recaptcha config error (caught).", e);
        }
    }
});

btnBack.addEventListener('click', () => {
    clearError();
    phoneOtpSection.style.display = 'none';
    primaryAuthMethods.style.display = 'flex';
});

// ========================
// EMAIL MAGIC LINK AUTH
// ========================

// Toggle Email UI
btnShowEmail.addEventListener('click', () => {
    primaryAuthMethods.style.display = 'none';
    emailSection.style.display = 'block';
});

btnBackEmail.addEventListener('click', () => {
    emailSection.style.display = 'none';
    primaryAuthMethods.style.display = 'flex';
    clearError();
});

// Send Magic Link
btnSendEmailLink.addEventListener('click', async () => {
    clearError();
    const email = emailInput.value.trim();
    if (!email || !email.includes('@')) {
        return showError("Please enter a valid email address.");
    }
    
    if(firebaseConfig.apiKey === "YOUR_API_KEY") {
        return showError("Please add your Firebase Config keys in login.js first!");
    }

    try {
        btnSendEmailLink.innerHTML = 'Sending Link...';
        btnSendEmailLink.disabled = true;

        const actionCodeSettings = {
            url: window.location.origin + window.location.pathname,
            handleCodeInApp: true
        };

        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        
        window.localStorage.setItem('emailForSignIn', email);
        
        btnSendEmailLink.innerHTML = 'Check your inbox!';
        btnSendEmailLink.style.background = '#28a745';
        showError("A magic link has been sent to your email! Click it to login.", "success");
        
    } catch (error) {
        btnSendEmailLink.innerHTML = 'Send Magic Link';
        btnSendEmailLink.disabled = false;
        showError(error.message);
    }
});

// VERY IMPORTANT: Check if the user just clicked a magic link!
async function checkEmailRedirect() {
    if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        if (!email) {
            email = window.prompt('Please provide your email for confirmation');
        }

        try {
            const result = await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            
            localStorage.setItem('isAdminLoggedIn', 'true');
            if (result.user.email) {
                localStorage.setItem('adminPhone', result.user.email);
            }
            window.location.href = '/dashboard.html';
        } catch (error) {
            showError("Error verifying email link: " + error.message);
        }
    }
}

checkEmailRedirect();

// ========================
// 3. Send OTP
// ========================
btnSendOtp.addEventListener('click', async () => {
    clearError();
    let phoneNumber = phoneInput.value.trim();
    if (!phoneNumber) return showError("Please enter a phone number");
    
    // Auto-add +91 if missing
    if (!phoneNumber.startsWith('+')) {
        phoneNumber = '+91' + phoneNumber;
    }
    
    if(firebaseConfig.apiKey === "YOUR_API_KEY") {
        return showError("Please add your Firebase Config keys in login.js first!");
    }

    btnSendOtp.classList.add('disabled');
    btnSendOtp.textContent = 'Sending...';

    try {
        const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, window.recaptchaVerifier);
        // OTP Sent!
        window.confirmationResult = confirmationResult;
        
        requestOtpSection.style.display = 'none';
        verifyOtpSection.style.display = 'block';
        
    } catch (error) {
        showError(error.message);
        btnSendOtp.classList.remove('disabled');
        btnSendOtp.textContent = 'Send OTP';
        // reset reCaptcha
        if(window.recaptchaVerifier) window.recaptchaVerifier.render();
    }
});

// ========================
// 4. Verify OTP
// ========================
btnVerifyOtp.addEventListener('click', async () => {
    clearError();
    const code = otpInput.value.trim();
    if (!code || code.length < 6) return showError("Enter valid 6-digit OTP");

    btnVerifyOtp.classList.add('disabled');
    btnVerifyOtp.textContent = 'Verifying...';

    try {
        const result = await window.confirmationResult.confirm(code);
        // Successful login!
        localStorage.setItem('isAdminLoggedIn', 'true');
        localStorage.setItem('adminPhone', result.user.phoneNumber);
        window.location.href = '/dashboard.html';
        
    } catch (error) {
        showError("Invalid OTP. Try again.");
        btnVerifyOtp.classList.remove('disabled');
        btnVerifyOtp.textContent = 'Verify & Login';
    }
});
