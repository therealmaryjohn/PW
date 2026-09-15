/* =====================================================================
   PINK WORLD — ORDER HISTORY
   -----------------------------------------------------------------
   When a logged-in customer checks out (via WhatsApp or online
   payment), their order is also saved to their account so they can
   view it later under "My Orders". Guests can still check out
   normally — their order just won't be saved to an account.
   ===================================================================== */

async function saveOrderIfLoggedIn(orderDetails) {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!user || !fbDb) return null;

  const order = {
    uid: user.uid,
    phone: user.phoneNumber || orderDetails.customerPhone || "",
    customerName: orderDetails.customerName || "",
    address: orderDetails.customerAddress || "",
    branch: orderDetails.branch || "",
    items: orderDetails.items,
    subtotal: orderDetails.subtotal,
    shipping: orderDetails.shipping,
    total: orderDetails.total,
    paymentMethod: orderDetails.paymentId ? "Online (Razorpay)" : "WhatsApp / Pay on delivery",
    paymentId: orderDetails.paymentId || null,
    status: "Placed",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  const ref = await fbDb.collection("orders").add(order);
  return ref.id;
}

async function getMyOrders() {
  const user = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  if (!user || !fbDb) return [];

  const snap = await fbDb.collection("orders")
    .where("uid", "==", user.uid)
    .orderBy("createdAt", "desc")
    .get();

  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}
