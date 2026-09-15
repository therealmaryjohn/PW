/* =====================================================================
   PINK WORLD — LIVE PRODUCT SYNC (Firestore)
   -----------------------------------------------------------------
   When PRODUCTS_SYNC_ENABLED is true (js/firebase-config.js) and a
   Firestore "products" collection has been migrated to (Section 6 of
   the Website Guide), this file keeps the in-memory PRODUCTS array
   (from js/products.js) automatically up to date with the live cloud
   catalog — no page reload needed, no file uploads needed.

   If it's NOT enabled, this file quietly does nothing, and your site
   keeps working exactly as before using the static products.js file.

   HOW EACH PAGE USES THIS:
     renderEverythingUsingPRODUCTS();              // uses whatever PRODUCTS has right now
     subscribeProductsUpdates(renderEverythingUsingPRODUCTS); // re-run it whenever live data changes
   ===================================================================== */

let _productsSyncStarted = false;
let _productsFirestoreHasData = false;

function productsSyncActive() {
  return typeof PRODUCTS_SYNC_ENABLED !== "undefined" && PRODUCTS_SYNC_ENABLED && firebaseReady();
}

function firestoreCatalogHasData() {
  return _productsFirestoreHasData;
}

/* Subscribes to live product changes. Safe to call on every page —
   it's a no-op if product sync isn't enabled/configured.
   `onChange` is called once immediately if data is already loaded,
   and again every time the live catalog changes. */
function subscribeProductsUpdates(onChange) {
  if (!productsSyncActive()) return false;
  if (!initFirebase()) return false;

  fbDb.collection("products").onSnapshot(
    snap => {
      _productsFirestoreHasData = !snap.empty;
      if (!snap.empty) {
        const items = snap.docs.map(d => d.data());
        items.sort((a, b) => (a.id || "").localeCompare(b.id || "", undefined, { numeric: true }));
        // Mutate the SAME array object (not reassign) so every file that
        // already references PRODUCTS keeps working without changes.
        PRODUCTS.splice(0, PRODUCTS.length, ...items);
      }
      if (typeof onChange === "function") onChange();
    },
    err => {
      console.warn("Live product sync unavailable, using the built-in catalog instead:", err);
      if (typeof onChange === "function") onChange();
    }
  );
  _productsSyncStarted = true;
  return true;
}
