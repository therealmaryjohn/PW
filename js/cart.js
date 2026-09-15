/* =====================================================================
   PINK WORLD — SHOPPING CART & CHECKOUT LOGIC
   ===================================================================== */

const CART_KEY = "pinkworld_cart";

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch (e) { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartBadge();
}

function addToCart(productId, size, qty) {
  qty = qty || 1;
  const cart = getCart();
  const existing = cart.find(item => item.id === productId && item.size === size);
  if (existing) { existing.qty += qty; }
  else { cart.push({ id: productId, size: size, qty: qty }); }
  saveCart(cart);
}

function updateCartQty(index, qty) {
  const cart = getCart();
  if (qty <= 0) cart.splice(index, 1);
  else cart[index].qty = qty;
  saveCart(cart);
}

function removeFromCart(index) {
  const cart = getCart();
  cart.splice(index, 1);
  saveCart(cart);
}

function clearCart() {
  localStorage.removeItem(CART_KEY);
  updateCartBadge();
}

function cartTotalItems() {
  return getCart().reduce((sum, item) => sum + item.qty, 0);
}

function cartTotalPrice() {
  const cart = getCart();
  let total = 0;
  cart.forEach(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    if (product) total += product.price * item.qty;
  });
  return total;
}

function cartShippingCost() {
  const total = cartTotalPrice();
  return total >= STORE_CONFIG.freeShippingThreshold ? 0 : 59;
}

function updateCartBadge() {
  const badges = document.querySelectorAll(".cart-badge");
  const count = cartTotalItems();
  badges.forEach(b => {
    b.textContent = count;
    b.style.display = count > 0 ? "inline-flex" : "none";
  });
}

function buildCartLineItems() {
  return getCart().map(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    if (!product) return null;
    return { id: product.id, name: product.name, size: item.size, qty: item.qty, price: product.price };
  }).filter(Boolean);
}

function buildOrderMessage(customerName, customerPhone, customerAddress, branch, paymentId) {
  const cart = getCart();
  let message = `Hello ${STORE_CONFIG.name}! I would like to place an order:\n\n`;
  let total = 0;
  cart.forEach(item => {
    const product = PRODUCTS.find(p => p.id === item.id);
    if (!product) return;
    const lineTotal = product.price * item.qty;
    total += lineTotal;
    message += `• ${product.name} (Size: ${item.size}) x${item.qty} — ${STORE_CONFIG.currency}${lineTotal}\n`;
  });
  const shipping = cartShippingCost();
  message += `\nSubtotal: ${STORE_CONFIG.currency}${total}`;
  message += `\nShipping: ${shipping === 0 ? "FREE" : STORE_CONFIG.currency + shipping}`;
  message += `\nTotal: ${STORE_CONFIG.currency}${total + shipping}\n`;
  if (customerName) message += `\nName: ${customerName}`;
  if (customerPhone) message += `\nPhone: ${customerPhone}`;
  if (customerAddress) message += `\nAddress: ${customerAddress}`;
  if (branch) message += `\nPreferred Branch: ${branch}`;
  if (paymentId) message += `\n\nPAID ONLINE — Razorpay Payment ID: ${paymentId}`;
  return message;
}

async function checkoutViaWhatsApp(customerName, customerPhone, customerAddress, branch, paymentId) {
  const cart = getCart();
  if (cart.length === 0) { alert("Your cart is empty. Please add some products first."); return; }

  const total = cartTotalPrice();
  const shipping = cartShippingCost();

  if (typeof saveOrderIfLoggedIn === "function") {
    try {
      await saveOrderIfLoggedIn({
        customerName, customerPhone, customerAddress, branch, paymentId,
        items: buildCartLineItems(), subtotal: total, shipping, total: total + shipping
      });
    } catch (e) { console.warn("Could not save order to account:", e); }
  }

  const message = buildOrderMessage(customerName, customerPhone, customerAddress, branch, paymentId);
  const url = `https://wa.me/${STORE_CONFIG.whatsapp}?text=${encodeURIComponent(message)}`;
  window.open(url, "_blank");
}

function payOnlineWithRazorpay(customerName, customerPhone, customerAddress, branch) {
  const cart = getCart();
  if (cart.length === 0) { alert("Your cart is empty. Please add some products first."); return; }

  if (!STORE_CONFIG.razorpayEnabled || !STORE_CONFIG.razorpayKeyId || STORE_CONFIG.razorpayKeyId.indexOf("1234567890abcd") > -1) {
    alert("Online payment isn't set up yet.\n\nTo enable it: open admin.html > Store Settings, add your real Razorpay Key ID, and switch on online payments. See the Website Guide, Section 4.\n\nFor now, please use 'Send Order via WhatsApp' to complete your order.");
    return;
  }
  if (typeof Razorpay === "undefined") {
    alert("Payment system could not load. Please check your internet connection and try again, or use 'Send Order via WhatsApp'.");
    return;
  }

  const total = cartTotalPrice();
  const shipping = cartShippingCost();
  const amountPaise = Math.round((total + shipping) * 100);

  const options = {
    key: STORE_CONFIG.razorpayKeyId,
    amount: amountPaise,
    currency: "INR",
    name: STORE_CONFIG.name,
    description: "Order Payment",
    prefill: { name: customerName || "", contact: customerPhone || "" },
    notes: { address: customerAddress || "", branch: branch || "" },
    theme: { color: "#c9436f" },
    handler: function (response) {
      clearCart();
      alert("Payment successful!\n\nPayment ID: " + response.razorpay_payment_id + "\n\nWe'll now open WhatsApp so you can send your order details for confirmation.");
      checkoutViaWhatsApp(customerName, customerPhone, customerAddress, branch, response.razorpay_payment_id);
    },
    modal: { ondismiss: function () { console.log("Payment popup closed by user."); } }
  };

  const rzp = new Razorpay(options);
  rzp.on("payment.failed", function (response) {
    alert("Payment failed: " + (response.error && response.error.description ? response.error.description : "Please try again or use WhatsApp checkout."));
  });
  rzp.open();
}

document.addEventListener("DOMContentLoaded", updateCartBadge);
