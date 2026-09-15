/* =====================================================================
   PINK WORLD — CUSTOMER ACCOUNTS & LIVE DATA CONFIGURATION (Firebase)
   -----------------------------------------------------------------
   This one file controls THREE optional upgrades, each independent:

   1. ACCOUNTS_ENABLED — "Login with Mobile Number", wishlists that
      follow a customer across devices, and order history.
      See the Website Guide, Section 5.

   2. PRODUCTS_SYNC_ENABLED — makes your product catalog live in a
      cloud database (Firestore) instead of a file you must download
      and re-upload. Once on, adding/editing a product in admin.html
      appears on your live site within seconds — no file uploads.
      See the Website Guide, Section 6. Requires ACCOUNTS_ENABLED
      (and FIREBASE_CONFIG below) to also be set up, since it reuses
      the same login to know who's allowed to make changes.

   HOW TO ENABLE (either or both):
   1. Create a free project at https://console.firebase.google.com
   2. Enable "Phone" sign-in under Authentication > Sign-in method.
   3. Create a Firestore Database (production mode, nearest region
      to India e.g. asia-south1).
   4. Add a "Web app" to your project (</> icon) and copy the config
      object it gives you into FIREBASE_CONFIG below.
   5. Set ACCOUNTS_ENABLED to true.
   6. Upload the Firestore security rules from the Website Guide,
      Appendix D, into Firestore > Rules.
   7. For live product sync ALSO: enable Storage (Build > Storage),
      upload the Storage rules from Appendix E, and set
      PRODUCTS_SYNC_ENABLED to true.
   ===================================================================== */

const ACCOUNTS_ENABLED = false;       // set to true once FIREBASE_CONFIG below is filled in
const PRODUCTS_SYNC_ENABLED = false;  // set to true for instant product updates (needs Storage too — Section 6)

const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "000000000000",
  appId: "1:000000000000:web:xxxxxxxxxxxxxxxxxxxxxx"
};
