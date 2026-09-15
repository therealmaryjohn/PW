/* =====================================================================
   PINK WORLD — CUSTOMER LOGIN (Mobile Number + OTP)
   -----------------------------------------------------------------
   Uses Firebase Authentication's Phone sign-in. Works only when
   ACCOUNTS_ENABLED is true and FIREBASE_CONFIG is filled in
   (js/firebase-config.js). Safe to load on every page — it quietly
   does nothing if accounts aren't set up yet.
   ===================================================================== */

let fbApp = null;
let fbAuth = null;
let fbDb = null;
let recaptchaVerifier = null;
let confirmationResult = null;

const authStateListeners = [];

function firebaseReady() {
  return typeof ACCOUNTS_ENABLED !== "undefined" && ACCOUNTS_ENABLED &&
    typeof firebase !== "undefined" &&
    FIREBASE_CONFIG && FIREBASE_CONFIG.apiKey && FIREBASE_CONFIG.apiKey !== "YOUR_API_KEY";
}

function initFirebase() {
  if (!firebaseReady()) return false;
  if (!fbApp) {
    fbApp = firebase.initializeApp(FIREBASE_CONFIG);
    fbAuth = firebase.auth();
    fbDb = firebase.firestore();
    fbAuth.onAuthStateChanged(user => {
      authStateListeners.forEach(cb => cb(user));
    });
  }
  return true;
}

function onAuthChange(callback) {
  authStateListeners.push(callback);
  if (fbAuth) {
    callback(fbAuth.currentUser);
  } else if (initFirebase()) {
    callback(fbAuth.currentUser);
  } else {
    callback(null);
  }
}

function getCurrentUser() {
  return fbAuth ? fbAuth.currentUser : null;
}

/* ---------------------------------------------------------------------
   Sets up an invisible reCAPTCHA on the given button element id.
   Must be called once before sendOtp().
   --------------------------------------------------------------------- */
function setupRecaptcha(buttonElementId) {
  if (!initFirebase()) return null;
  if (recaptchaVerifier) return recaptchaVerifier;
  recaptchaVerifier = new firebase.auth.RecaptchaVerifier(buttonElementId, {
    size: "invisible"
  });
  return recaptchaVerifier;
}

/* ---------------------------------------------------------------------
   Sends an OTP to the given phone number (must be in E.164 format,
   e.g. "+919876543210"). Returns a Promise.
   --------------------------------------------------------------------- */
function sendOtp(phoneNumberE164) {
  if (!initFirebase()) return Promise.reject(new Error("not-configured"));
  return fbAuth.signInWithPhoneNumber(phoneNumberE164, recaptchaVerifier)
    .then(result => { confirmationResult = result; return result; });
}

/* ---------------------------------------------------------------------
   Verifies the 6-digit code the customer received by SMS.
   On success, creates/updates their profile doc in Firestore and
   migrates any guest wishlist items saved on this device.
   --------------------------------------------------------------------- */
function verifyOtp(code) {
  if (!confirmationResult) return Promise.reject(new Error("no-otp-sent"));
  return confirmationResult.confirm(code).then(async (result) => {
    const user = result.user;
    await ensureUserProfile(user);
    await migrateGuestWishlist(user);
    return user;
  });
}

async function ensureUserProfile(user) {
  const ref = fbDb.collection("users").doc(user.uid);
  const snap = await ref.get();
  if (!snap.exists) {
    await ref.set({
      phone: user.phoneNumber,
      name: "",
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

async function updateUserName(name) {
  const user = getCurrentUser();
  if (!user) return;
  await fbDb.collection("users").doc(user.uid).set({ name }, { merge: true });
}

async function getUserProfile() {
  const user = getCurrentUser();
  if (!user) return null;
  const snap = await fbDb.collection("users").doc(user.uid).get();
  return snap.exists ? snap.data() : null;
}

function logout() {
  if (fbAuth) return fbAuth.signOut();
  return Promise.resolve();
}

/* ---------------------------------------------------------------------
   Moves any wishlist items saved as a guest (before logging in, on
   this same browser) into the customer's permanent account wishlist.
   --------------------------------------------------------------------- */
async function migrateGuestWishlist(user) {
  try {
    const guestList = JSON.parse(localStorage.getItem("pinkworld_wishlist_guest") || "[]");
    if (!guestList.length) return;
    const batch = fbDb.batch();
    guestList.forEach(productId => {
      const ref = fbDb.collection("users").doc(user.uid).collection("wishlist").doc(productId);
      batch.set(ref, { productId, addedAt: firebase.firestore.FieldValue.serverTimestamp() }, { merge: true });
    });
    await batch.commit();
    localStorage.removeItem("pinkworld_wishlist_guest");
  } catch (e) {
    console.warn("Wishlist migration skipped:", e);
  }
}
