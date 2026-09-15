/* =====================================================================
   PINK WORLD — WISHLIST LOGIC
   -----------------------------------------------------------------
   If a customer is logged in, the wishlist is stored permanently in
   their account (Firestore) and follows them across any device.
   If they're just browsing as a guest, it's saved on this browser
   only (like the cart) — and automatically merged into their account
   the moment they log in (see auth.js: migrateGuestWishlist).
   ===================================================================== */

const GUEST_WISHLIST_KEY = "pinkworld_wishlist_guest";

function getGuestWishlist() {
  try { return JSON.parse(localStorage.getItem(GUEST_WISHLIST_KEY)) || []; }
  catch (e) { return []; }
}

function saveGuestWishlist(list) {
  localStorage.setItem(GUEST_WISHLIST_KEY, JSON.stringify(list));
}

/* Returns a Promise resolving to an array of product IDs */
async function getWishlistIds() {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (user && fbDb) {
    const snap = await fbDb.collection("users").doc(user.uid).collection("wishlist").get();
    return snap.docs.map(d => d.id);
  }
  return getGuestWishlist();
}

async function isInWishlist(productId) {
  const ids = await getWishlistIds();
  return ids.includes(productId);
}

/* Adds or removes a product from the wishlist, returns the new state (true = now in wishlist) */
async function toggleWishlist(productId) {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;

  if (user && fbDb) {
    const ref = fbDb.collection("users").doc(user.uid).collection("wishlist").doc(productId);
    const snap = await ref.get();
    if (snap.exists) {
      await ref.delete();
      return false;
    } else {
      await ref.set({ productId, addedAt: firebase.firestore.FieldValue.serverTimestamp() });
      return true;
    }
  }

  // Guest fallback (this browser only, until they log in)
  let list = getGuestWishlist();
  const idx = list.indexOf(productId);
  if (idx > -1) {
    list.splice(idx, 1);
    saveGuestWishlist(list);
    return false;
  } else {
    list.push(productId);
    saveGuestWishlist(list);
    return true;
  }
}

/* Renders heart-toggle buttons after they're inserted into the page */
async function refreshWishlistIcons() {
  const ids = await getWishlistIds();
  document.querySelectorAll("[data-wishlist-id]").forEach(btn => {
    const pid = btn.getAttribute("data-wishlist-id");
    btn.classList.toggle("active", ids.includes(pid));
    btn.textContent = ids.includes(pid) ? "♥" : "♡";
  });
}

async function handleWishlistClick(productId, btnEl) {
  const nowActive = await toggleWishlist(productId);
  if (btnEl) {
    btnEl.classList.toggle("active", nowActive);
    btnEl.textContent = nowActive ? "♥" : "♡";
  }
}
