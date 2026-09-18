/* =====================================================================
   PINK WORLD — STORE CONFIGURATION
   -----------------------------------------------------------------
   This is your control panel for store-wide information.
   You can edit this file directly, OR use the visual Store Settings
   tab inside admin.html and click "Download config.js" — much easier
   if you're not comfortable editing code by hand.
   ===================================================================== */

const STORE_CONFIG = {
  name: "Pink World",
  tagline: "Fashion & Everyday Essentials for the Whole Family",
  description: "Trendy sarees, kurtis, western wear, men's collections & intimate wear — now online from our Erattayar and Nedumkandam stores.",

  // WhatsApp number used for "Order on WhatsApp" buttons.
  // Format: country code + number, NO plus sign, NO spaces. Example for India: 919812345678
  whatsapp: "919999999999", // <-- REPLACE with the shop's real WhatsApp number

  email: "info@pinkworldstore.in", // <-- REPLACE with real email if available

  freeShippingThreshold: 1499,
  currency: "₹",

  // ---------------- ONLINE PAYMENTS (Razorpay) ----------------
  // See the Website Guide, Section 4, for the full walkthrough.
  razorpayEnabled: false,
  razorpayKeyId: "rzp_test_1234567890abcd", // <-- REPLACE with your real Razorpay Key ID

  // ---------------- CUSTOMER ACCOUNTS & ORDERS (Firebase) ----------------
  // See the Website Guide, Section 5, for the full walkthrough.
  // adminPhone: the shop owner's own mobile number (same format customers use to log in,
  // e.g. "+919876543210"). When YOU log in via account.html with this exact number, the
  // Store Manager's "Orders" tab (and, if enabled, live Products editing) unlocks.
  adminPhone: "+910000000000", // <-- REPLACE with the owner's mobile number

  // Branch / store locations
  branches: [
    {
      name: "Erattayar Branch",
      address: "Erattayar, Idukki District, Kerala - 685514",
      phone: "+91 90000 00001",
      hours: "Mon – Sat: 9:00 AM – 8:30 PM | Sun: 10:00 AM – 6:00 PM",
      mapEmbed: "https://www.google.com/maps?q=Erattayar,+Idukki,+Kerala&output=embed",
      mapLink: "https://maps.google.com/?q=Erattayar,+Idukki,+Kerala"
    },
    {
      name: "Nedumkandam Branch",
      address: "Nedumkandam, Idukki District, Kerala - 685553",
      phone: "+91 62357 75643",
      hours: "Mon – Sat: 9:00 AM – 8:30 PM | Sun: 10:00 AM – 6:00 PM",
      mapEmbed: "https://www.google.com/maps?q=Nedumkandam,+Idukki,+Kerala&output=embed",
      mapLink: "https://maps.google.com/?q=Nedumkandam,+Idukki,+Kerala"
    }
  ],

  social: {
    instagram: "#",
    facebook: "#",
    youtube: "#"
  }
};
