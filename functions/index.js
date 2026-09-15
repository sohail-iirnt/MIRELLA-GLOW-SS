const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const Razorpay = require('razorpay');

admin.initializeApp();
const db = admin.firestore();
const RAZORPAY_KEY_ID = defineSecret('RAZORPAY_KEY_ID');
const RAZORPAY_KEY_SECRET = defineSecret('RAZORPAY_KEY_SECRET');

async function requireAdmin(uid) {
  if (!uid) throw new HttpsError('unauthenticated', 'Authentication required.');
  const snap = await db.doc(`admins/${uid}`).get();
  if (!snap.exists || snap.data().active !== true) throw new HttpsError('permission-denied', 'Admin access required.');
}

exports.createRazorpayOrder = onCall({ secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET], region: 'asia-south1' }, async (request) => {
  const { amount, currency = 'INR', receipt } = request.data || {};
  if (!Number.isInteger(amount) || amount < 100) throw new HttpsError('invalid-argument', 'Amount must be an integer number of paise and at least ₹1.');
  const razorpay = new Razorpay({ key_id: RAZORPAY_KEY_ID.value(), key_secret: RAZORPAY_KEY_SECRET.value() });
  try {
    const order = await razorpay.orders.create({ amount, currency, receipt: String(receipt || `MG-${Date.now()}`).slice(0, 40), payment_capture: 1 });
    return { id: order.id, amount: order.amount, currency: order.currency, keyId: RAZORPAY_KEY_ID.value() };
  } catch (e) {
    console.error(e);
    throw new HttpsError('internal', 'Unable to create payment order.');
  }
});

exports.verifyRazorpayPayment = onCall({ secrets: [RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET], region: 'asia-south1' }, async (request) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature, orderId } = request.data || {};
  if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature || !orderId) throw new HttpsError('invalid-argument', 'Payment verification data is incomplete.');
  const crypto = require('crypto');
  const expected = crypto.createHmac('sha256', RAZORPAY_KEY_SECRET.value()).update(`${razorpayOrderId}|${razorpayPaymentId}`).digest('hex');
  if (expected !== razorpaySignature) throw new HttpsError('permission-denied', 'Invalid payment signature.');
  await db.doc(`orders/${orderId}`).update({ paymentStatus: 'paid', razorpayOrderId, razorpayPaymentId, verifiedAt: admin.firestore.FieldValue.serverTimestamp(), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { verified: true };
});

exports.setOrderPaymentStatus = onCall(async (request) => {
  await requireAdmin(request.auth?.uid);
  const { orderId, paymentStatus } = request.data || {};
  if (!orderId || !['pending','paid','failed','refunded'].includes(paymentStatus)) throw new HttpsError('invalid-argument', 'Invalid order payment status.');
  await db.doc(`orders/${orderId}`).update({ paymentStatus, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  return { ok: true };
});
