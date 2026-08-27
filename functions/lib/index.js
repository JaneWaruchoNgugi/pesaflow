"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminSignIn = exports.sendVerificationEmail = exports.sendNewsletter = exports.getSubscribers = exports.chatWithAdvisor = exports.confirmSubscriptionPayment = exports.getPaymentStatus = exports.stkCallback = exports.deposit = exports.initiateStkPush = void 0;
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const axios_1 = require("axios");
const http = require("http");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
admin.initializeApp();
const db = admin.firestore();
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
// ── Newsletter / admin email sending ──────────────────────
// Admin-only gate: relies on the `admin` custom claim that adminSignIn mints on the
// Firebase Auth session, so callers never pass a shared secret in the request body.
const requireAdmin = (request) => {
    var _a, _b;
    if (((_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.admin) !== true) {
        throw new https_1.HttpsError('permission-denied', 'Admin only. Please sign in to the admin panel.');
    }
};
const buildTransport = () => nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});
// Legacy client hashes (djb2) — used only to verify + migrate old admin accounts.
const legacyHashPin = (pin) => {
    let h = 5381;
    for (let i = 0; i < pin.length; i++)
        h = (h * 33) ^ pin.charCodeAt(i);
    return (h >>> 0).toString(36);
};
const legacyHashPassword = legacyHashPin;
// Salt generator (used for admin password upgrades).
const genSalt = () => crypto.randomBytes(16).toString('hex');
// Strong PASSWORD hashing (admins): scrypt — a slow, brute-force-resistant KDF
// built into Node (no extra dependency), the right choice for real passwords.
const scryptHashPw = (password, salt) => crypto.scryptSync(password, salt, 64).toString('hex');
const timingSafeHexEqual = (a, b) => {
    try {
        const ba = Buffer.from(a, 'hex');
        const bb = Buffer.from(b, 'hex');
        return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
    }
    catch (_a) {
        return false;
    }
};
const timingSafeStrEqual = (a, b) => {
    const ba = Buffer.from(String(a));
    const bb = Buffer.from(String(b));
    return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
};
// ── Helpers ───────────────────────────────────────────────
const fmt = (amount, currency = 'KES') => currency + ' ' + Number(amount || 0).toLocaleString('en-KE', { maximumFractionDigits: 0 });
const DAY_MS = 24 * 60 * 60 * 1000;
const SUBSCRIPTION_DAYS = 30; // legacy flat tiers
// Pro plan — three M-Pesa billing cycles. Keep in sync with src/lib/pricing.ts.
const PRO_PRICES = { daily: 20, weekly: 99, monthly: 299 };
const CYCLE_DAYS = { daily: 1, weekly: 7, monthly: 30 };
const isBillingCycle = (c) => c === 'daily' || c === 'weekly' || c === 'monthly';
// Legacy tier prices (grandfathered — no longer sold as new subs).
const STANDARD_SUBSCRIPTION_PRICES = {
    silver: 299,
    gold: 599,
    platinum: 999,
    pro: PRO_PRICES.monthly,
};
// The exact amount we expect for a given (tier, cycle). Pro varies by cycle.
const getSubscriptionPrice = (tier, cycle) => tier === 'pro' ? PRO_PRICES[cycle !== null && cycle !== void 0 ? cycle : 'monthly'] : STANDARD_SUBSCRIPTION_PRICES[tier];
// How many days a successful payment grants, given tier + cycle.
const grantDays = (tier, cycle) => tier === 'pro' ? CYCLE_DAYS[cycle !== null && cycle !== void 0 ? cycle : 'monthly'] : SUBSCRIPTION_DAYS;
const normalizePhone = (phone) => {
    const cleaned = String(phone || '').replace(/[^\d+]/g, '');
    if (/^0\d{9}$/.test(cleaned))
        return '254' + cleaned.slice(1);
    if (/^\+254\d{9}$/.test(cleaned))
        return cleaned.slice(1);
    if (/^254\d{9}$/.test(cleaned))
        return cleaned;
    throw new https_1.HttpsError('invalid-argument', 'Use a valid Kenyan M-Pesa phone number.');
};
const sortByCreatedAtDesc = (a, b) => {
    var _a, _b, _c, _d, _e, _f;
    const aTime = (_c = (_b = (_a = a.data().createdAt) === null || _a === void 0 ? void 0 : _a.toMillis) === null || _b === void 0 ? void 0 : _b.call(_a)) !== null && _c !== void 0 ? _c : 0;
    const bTime = (_f = (_e = (_d = b.data().createdAt) === null || _d === void 0 ? void 0 : _d.toMillis) === null || _e === void 0 ? void 0 : _e.call(_d)) !== null && _f !== void 0 ? _f : 0;
    return bTime - aTime;
};
const isPaidTier = (tier) => tier === 'silver' || tier === 'gold' || tier === 'platinum' || tier === 'pro';
async function postBongoStkRequest(payload) {
    const raw = JSON.stringify(payload);
    return await new Promise((resolve, reject) => {
        const request = http.request({
            hostname: '142.93.47.187',
            port: 2610,
            path: '/ngomma/bongo/stkrequest',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(raw),
            },
        }, response => {
            let body = '';
            response.on('data', chunk => { body += chunk; });
            response.on('end', () => {
                try {
                    resolve(JSON.parse(body));
                }
                catch (_a) {
                    resolve({ raw: body });
                }
            });
        });
        request.on('error', reject);
        request.write(raw);
        request.end();
    });
}
async function activateSubscription(paymentId, payment) {
    const userId = String(payment.userId || '');
    const tier = payment.tier;
    if (!userId || !isPaidTier(tier))
        return;
    const cycle = isBillingCycle(payment.cycle) ? payment.cycle : 'monthly';
    const startedAt = new Date();
    const expiresAt = new Date(startedAt.getTime() + grantDays(tier, cycle) * DAY_MS);
    await db.collection('users').doc(userId).set({
        tier,
        subscriptionStatus: 'active',
        subscriptionStart: startedAt.toISOString(),
        subscriptionExpiresAt: expiresAt.toISOString(),
        billingCycle: tier === 'pro' ? cycle : admin.firestore.FieldValue.delete(),
        lastPaymentId: paymentId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
}
async function initiateSubscriptionPayment(input) {
    var _a;
    if (!isPaidTier(input.tier)) {
        throw new https_1.HttpsError('invalid-argument', 'Choose a paid subscription plan.');
    }
    const userId = String(input.userId || '').replace(/\s+/g, '');
    if (!userId)
        throw new https_1.HttpsError('invalid-argument', 'Missing user account.');
    const cycle = isBillingCycle(input.cycle) ? input.cycle : 'monthly';
    const phone = normalizePhone(input.phone);
    const expectedAmount = getSubscriptionPrice(input.tier, cycle);
    if (typeof input.amount === 'number' && input.amount !== expectedAmount) {
        throw new https_1.HttpsError('invalid-argument', 'Invalid ' + input.tier + ' amount.');
    }
    const payload = {
        name: ((_a = input.name) === null || _a === void 0 ? void 0 : _a.trim()) || 'PesaFlow ' + input.tier,
        phone,
        amount: expectedAmount,
        trigger: 'R1R2',
    };
    const docRef = await db.collection('payments').add({
        userId,
        tier: input.tier,
        cycle,
        phone,
        amount: expectedAmount,
        trigger: payload.trigger,
        subscriptionTrigger: 'FINWISE_' + input.tier.toUpperCase() + '_SUBSCRIPTION',
        status: 'pending',
        checkoutId: null,
        checkoutRequestId: null,
        provider: 'bongo-stkrequest',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await db.collection('users').doc(userId).set({
        phone,
        pendingTier: input.tier,
        subscriptionStatus: 'pending_payment',
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    try {
        console.log('FinWise STK initiation started', { paymentId: docRef.id, userId, tier: input.tier, phone, amount: expectedAmount });
        const result = await postBongoStkRequest(payload);
        const checkoutRequestId = typeof result.CheckoutRequestID === 'string' ? result.CheckoutRequestID :
            typeof result.checkoutRequestId === 'string' ? result.checkoutRequestId :
                null;
        await docRef.update({
            checkoutId: checkoutRequestId,
            checkoutRequestId,
            providerResult: result,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.log('FinWise STK initiation response', { paymentId: docRef.id, checkoutRequestId, result });
        return { paymentId: docRef.id, checkoutId: checkoutRequestId || docRef.id, amount: expectedAmount };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'STK request failed';
        await docRef.update({
            status: 'failed',
            errorMessage: message,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        console.error('FinWise STK initiation failed', { paymentId: docRef.id, message });
        throw new https_1.HttpsError('internal', 'Failed to initiate M-Pesa payment. Please try again.');
    }
}
// ── 1. Initiate STK Push ──────────────────────────────────
exports.initiateStkPush = (0, https_1.onCall)({ cors: true }, async (request) => {
    const { phone, amount, tier, cycle, userId, name } = request.data;
    return await initiateSubscriptionPayment({ phone, amount, tier, cycle, userId, name });
});
// Optional HTTP endpoint with the same shape as the Bongo deposit function.
exports.deposit = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a;
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }
    try {
        if ((_a = req.body) === null || _a === void 0 ? void 0 : _a.trans_id) {
            await recordBongoPaymentCallback(req.body);
            res.status(200).json({ success: true, message: 'Payment recorded' });
            return;
        }
        const result = await initiateSubscriptionPayment(req.body);
        res.status(200).json(Object.assign({ success: true }, result));
    }
    catch (error) {
        const message = error instanceof https_1.HttpsError ? error.message : 'Payment initiation failed.';
        const status = error instanceof https_1.HttpsError ? 400 : 500;
        res.status(status).json({ error: message });
    }
});
async function findPendingPayment(phone, amount, checkoutRequestId) {
    if (checkoutRequestId) {
        const byCheckout = await db.collection('payments')
            .where('checkoutRequestId', '==', checkoutRequestId)
            .limit(1)
            .get();
        if (!byCheckout.empty)
            return byCheckout.docs[0];
    }
    const byPhone = await db.collection('payments')
        .where('phone', '==', phone)
        .where('status', '==', 'pending')
        .get();
    const docs = byPhone.docs
        .filter(docSnap => typeof amount !== 'number' || docSnap.data().amount === amount)
        .sort(sortByCreatedAtDesc);
    return docs[0] || null;
}
async function recordBongoPaymentCallback(body) {
    const phone = normalizePhone(String(body.phone || ''));
    const amount = typeof body.amount === 'number' ? body.amount : Number(body.amount);
    const checkoutRequestId = typeof body.checkoutRequestId === 'string' ? body.checkoutRequestId : undefined;
    const matched = await findPendingPayment(phone, amount, checkoutRequestId);
    const updatePayload = {
        status: 'success',
        trans_id: body.trans_id,
        trans_time: body.trans_time || null,
        business_shortcode: body.business_shortcode || null,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (matched) {
        await matched.ref.update(updatePayload);
        await activateSubscription(matched.id, Object.assign(Object.assign({}, matched.data()), updatePayload));
        return;
    }
    const docRef = await db.collection('payments').add({
        phone,
        amount,
        status: 'success',
        trans_id: body.trans_id,
        trans_time: body.trans_time || null,
        business_shortcode: body.business_shortcode || null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await activateSubscription(docRef.id, (await docRef.get()).data() || {});
}
// ── 2. STK Callback ───────────────────────────────────────
exports.stkCallback = (0, https_1.onRequest)({ cors: true }, async (req, res) => {
    var _a, _b, _c;
    if (req.method !== 'POST') {
        res.status(405).send('Method not allowed');
        return;
    }
    if ((_a = req.body) === null || _a === void 0 ? void 0 : _a.trans_id) {
        try {
            await recordBongoPaymentCallback(req.body);
            res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }
        catch (error) {
            console.error('Bongo callback error:', error);
            res.status(500).send('Internal error');
        }
        return;
    }
    const body = (_c = (_b = req.body) === null || _b === void 0 ? void 0 : _b.Body) === null || _c === void 0 ? void 0 : _c.stkCallback;
    if (!body) {
        res.status(400).send('Bad request');
        return;
    }
    const checkoutId = body.CheckoutRequestID;
    const resultCode = body.ResultCode;
    let paySnap = await db.collection('payments').doc(checkoutId).get();
    if (!paySnap.exists) {
        const matched = await db.collection('payments')
            .where('checkoutRequestId', '==', checkoutId)
            .limit(1)
            .get();
        if (!matched.empty)
            paySnap = matched.docs[0];
    }
    if (!paySnap.exists) {
        res.status(404).send('Not found');
        return;
    }
    if (resultCode === 0) {
        await paySnap.ref.update({
            status: 'success',
            resultCode,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await activateSubscription(paySnap.id, paySnap.data() || {});
    }
    else {
        await paySnap.ref.update({
            status: 'failed',
            resultCode,
            resultDesc: body.ResultDesc || null,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Accepted' });
});
exports.getPaymentStatus = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b;
    const { checkoutId } = request.data;
    if (!checkoutId)
        throw new https_1.HttpsError('invalid-argument', 'Missing checkoutId.');
    const direct = await db.collection('payments').doc(checkoutId).get();
    if (direct.exists)
        return { status: (_a = direct.data()) === null || _a === void 0 ? void 0 : _a.status, paymentId: direct.id };
    const byCheckout = await db.collection('payments')
        .where('checkoutRequestId', '==', checkoutId)
        .limit(1)
        .get();
    if (byCheckout.empty)
        return { status: 'not_found' };
    return { status: (_b = byCheckout.docs[0].data()) === null || _b === void 0 ? void 0 : _b.status, paymentId: byCheckout.docs[0].id };
});
exports.confirmSubscriptionPayment = (0, https_1.onCall)({ cors: true }, async (request) => {
    const { checkoutId, userId, tier } = request.data;
    const normalizedUserId = String(userId || '').replace(/\s+/g, '');
    if (!checkoutId || !normalizedUserId || !isPaidTier(tier)) {
        throw new https_1.HttpsError('invalid-argument', 'Missing payment details.');
    }
    const snap = await db.collection('payments').doc(checkoutId).get();
    if (!snap.exists)
        throw new https_1.HttpsError('not-found', 'Payment not found.');
    const payment = snap.data() || {};
    if (payment.userId !== normalizedUserId || payment.tier !== tier) {
        throw new https_1.HttpsError('permission-denied', 'Payment does not match this user.');
    }
    if (payment.status === 'success' || payment.status === 'paid') {
        await activateSubscription(snap.id, payment);
        return { status: 'success' };
    }
    if (payment.status !== 'pending') {
        throw new https_1.HttpsError('failed-precondition', 'Payment is not pending.');
    }
    return { status: 'pending', message: 'Payment is still awaiting provider confirmation.' };
});
// NOTE: expireSubscriptions (a scheduled onSchedule job) was removed because paid
// subscriptions are currently disabled (Free + Gold-coming-soon), and the Cloud
// Scheduler API it required was blocking deploys. Re-add it when paid tiers launch.
// ── 4. PesaFlow AI Advisor Chat ────────────────────────────
exports.chatWithAdvisor = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b, _c;
    const { userId, message, conversationHistory = [] } = request.data;
    if (!(userId === null || userId === void 0 ? void 0 : userId.trim()) || !(message === null || message === void 0 ? void 0 : message.trim())) {
        throw new https_1.HttpsError('invalid-argument', 'userId and message are required');
    }
    const anthropicKey = ANTHROPIC_API_KEY;
    if (!anthropicKey) {
        throw new https_1.HttpsError('failed-precondition', 'Anthropic API key is not configured.');
    }
    const userRef = db.collection('users').doc(userId);
    // ── Fetch all financial data in parallel ─────────────────
    const [expensesSnap, investmentsSnap, goalsSnap, billsSnap, networthSnap, profileDoc, financialProfileDoc, habitsDoc, efDoc,] = await Promise.all([
        userRef.collection('expenses').get(),
        userRef.collection('investments').get(),
        userRef.collection('goals').get(),
        userRef.collection('bills').get(),
        userRef.collection('networth').get(),
        userRef.collection('data').doc('profile').get(),
        userRef.collection('data').doc('financialProfile').get(),
        userRef.collection('data').doc('habits').get(),
        userRef.collection('data').doc('emergencyFund').get(),
    ]);
    // ── Parse financial profile ───────────────────────────────
    const profileData = profileDoc.data();
    const financialProfileData = financialProfileDoc.data();
    const effectiveProfile = ((profileData === null || profileData === void 0 ? void 0 : profileData.monthlyIncome) || 0) > 0 ? profileData : financialProfileData;
    const monthlyIncome = (effectiveProfile === null || effectiveProfile === void 0 ? void 0 : effectiveProfile.monthlyIncome) || 0;
    const currency = (effectiveProfile === null || effectiveProfile === void 0 ? void 0 : effectiveProfile.currency) || 'KES';
    // ── Expenses (current calendar month) ────────────────────
    const now = new Date();
    const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const allExpenses = expensesSnap.docs.map(d => d.data());
    const monthExpenses = allExpenses.filter(e => String(e.date || '').startsWith(currentYM));
    const totalExpenses = monthExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const necessaryTotal = monthExpenses
        .filter(e => e.type === 'necessary')
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const unnecessaryTotal = monthExpenses
        .filter(e => e.type === 'unnecessary')
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const savingsLeft = monthlyIncome - totalExpenses;
    const spendPct = monthlyIncome > 0 ? Math.round((totalExpenses / monthlyIncome) * 100) : 0;
    // ── Investments ───────────────────────────────────────────
    const investments = investmentsSnap.docs.map(d => d.data());
    const activeInvestments = investments.filter(inv => inv.status === 'active');
    const totalInvested = activeInvestments.reduce((s, inv) => s + (Number(inv.amount) || 0), 0);
    const projectedAnnualReturn = activeInvestments.reduce((s, inv) => s + (Number(inv.amount) || 0) * (Number(inv.expectedReturnPct) || 0) / 100, 0);
    const investmentLines = activeInvestments.length > 0
        ? activeInvestments.map(inv => `  - ${inv.name || 'Unnamed'}: ${fmt(inv.amount, currency)} [${inv.category || 'other'}, ${inv.expectedReturnPct || 0}% return]`).join('\n')
        : '  (no active investments)';
    // ── Bills ─────────────────────────────────────────────────
    const bills = billsSnap.docs.map(d => d.data());
    const billsMonthlyTotal = bills.reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const billsDue = bills.filter(b => b.status !== 'paid').reduce((s, b) => s + (Number(b.amount) || 0), 0);
    const overdueCount = bills.filter(b => b.status === 'overdue').length;
    const billsLine = bills.length > 0
        ? bills.map(b => `${b.name} ${currency}${b.amount} [${b.status}]`).join(', ')
        : 'none added yet';
    // ── Net Worth ─────────────────────────────────────────────
    const netItems = networthSnap.docs.map(d => d.data());
    const totalAssets = netItems
        .filter(i => i.type === 'asset')
        .reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const totalLiabilities = netItems
        .filter(i => i.type === 'liability')
        .reduce((s, i) => s + (Number(i.amount) || 0), 0);
    const netWorth = totalAssets - totalLiabilities;
    // ── Goals ─────────────────────────────────────────────────
    const activeGoals = goalsSnap.docs.map(d => d.data()).filter(g => !g.completed);
    const goalsLines = activeGoals.length > 0
        ? activeGoals.map(g => {
            const pct = g.targetAmount > 0
                ? Math.min(100, Math.round(((g.savedAmount || 0) / g.targetAmount) * 100))
                : 0;
            return `• ${g.name}: ${pct}% (${fmt(g.savedAmount || 0, currency)} / ${fmt(g.targetAmount || 0, currency)})${g.deadline ? ` — deadline ${g.deadline}` : ''}`;
        }).join('\n')
        : '• No active goals';
    // ── Habits ────────────────────────────────────────────────
    const habitsArr = ((_a = habitsDoc.data()) === null || _a === void 0 ? void 0 : _a.habits) || [];
    const habitsCompleted = habitsArr.filter(h => h.done).length;
    // ── Emergency Fund ────────────────────────────────────────
    const efRaw = efDoc.data() || {};
    const efCurrent = Number(efRaw.currentAmount) || 0;
    const efTargetMonths = Number(efRaw.targetMonths) || 6;
    const efTarget = efTargetMonths * (totalExpenses || monthlyIncome * 0.6);
    const efPct = efTarget > 0 ? Math.min(100, Math.round((efCurrent / efTarget) * 100)) : 0;
    const monthsCovered = totalExpenses > 0 ? (efCurrent / totalExpenses).toFixed(1) : '0';
    // ── Build system prompt ───────────────────────────────────
    const systemPrompt = `You are PesaFlow AI — a finance-only personal financial advisor for Kenyan users. You have LIVE access to the user's complete financial data pulled directly from their PesaFlow account. Answer only questions about budgeting, spending, bills, savings, debt, emergency funds, investments, goals, net worth, insurance, taxes, and Kenyan money decisions. If asked about anything outside finance, politely refuse and redirect to a finance question. Give warm, specific, actionable advice tailored to the Kenyan context. Always reference relevant Kenyan financial instruments where appropriate: SACCOs, M-Pesa, M-Shwari, KCB M-Pesa, Fuliza, NSE, T-Bills/Bonds via CBK, MMFs, HELB, SHA/NHIF, NSSF, KRA iTax, Equity Bank, Co-op Bank, Family Bank, Faulu MFB.

Be concise and conversational (2–4 short paragraphs max). Use bullet points for lists. Always end with ONE bold specific action the user can take TODAY.

If the user appears to be in a financial crisis (cannot pay bills, severe debt overload, extreme overspending beyond 90% of income), urgently acknowledge it and recommend they use the SOS Alert button in the Alerts & SOS tab to send their advisor a snapshot immediately.

━━━ LIVE FINANCIAL SNAPSHOT (fetched now) ━━━

INCOME & SPENDING (this month):
• Monthly Income: ${fmt(monthlyIncome, currency)}/month
• Total Spent: ${fmt(totalExpenses, currency)} (${spendPct}% of income)
• Necessary Expenses: ${fmt(necessaryTotal, currency)}
• Unnecessary Expenses: ${fmt(unnecessaryTotal, currency)}
• Savings Left: ${fmt(savingsLeft, currency)}

INVESTMENTS:
• Total Invested: ${fmt(totalInvested, currency)}
• Active Investments: ${activeInvestments.length}
• Projected Annual Return: ${fmt(projectedAnnualReturn, currency)}
${investmentLines}

BILLS:
• Monthly Bills Total: ${fmt(billsMonthlyTotal, currency)}
• Bills Currently Due/Overdue: ${fmt(billsDue, currency)}
• Overdue Bills: ${overdueCount}
• All Bills: ${billsLine}

NET WORTH:
• Total Assets: ${fmt(totalAssets, currency)}
• Total Liabilities: ${fmt(totalLiabilities, currency)}
• Net Worth: ${fmt(netWorth, currency)}

EMERGENCY FUND:
• Current: ${fmt(efCurrent, currency)} (${efPct}% of ${fmt(efTarget, currency)} target — ${efTargetMonths}-month goal)
• Months Covered: ${monthsCovered} months

GOALS (${activeGoals.length} active):
${goalsLines}

DAILY HABITS: ${habitsCompleted}/${habitsArr.length} habits completed today

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
    // ── Save user message to Firestore ────────────────────────
    const msgTs = new Date().toISOString();
    const userMsgId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await userRef.collection('chat').doc(userMsgId).set({
        id: userMsgId, role: 'user', content: message.trim(), timestamp: msgTs,
    });
    // ── Call Anthropic API ────────────────────────────────────
    const apiMessages = [
        ...conversationHistory.slice(-20),
        { role: 'user', content: message.trim() },
    ];
    const { data: aiData } = await axios_1.default.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-haiku-4-5',
        max_tokens: 700,
        system: systemPrompt,
        messages: apiMessages,
    }, {
        headers: {
            'x-api-key': anthropicKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
        },
    });
    const reply = ((_c = (_b = aiData.content) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.text) || 'Sorry, I could not generate a response.';
    // ── Save AI response to Firestore ─────────────────────────
    const aiMsgId = `a_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    await userRef.collection('chat').doc(aiMsgId).set({
        id: aiMsgId, role: 'assistant', content: reply,
        timestamp: new Date().toISOString(),
    });
    return { reply, userMsgId, aiMsgId };
});
// ── Newsletter: list subscribers (admin only) ─────────────
exports.getSubscribers = (0, https_1.onCall)({ cors: true }, async (request) => {
    requireAdmin(request);
    const snap = await db.collection('subscribers').where('active', '==', true).get();
    const emails = snap.docs
        .map(d => d.data().email)
        .filter((e) => !!e);
    return { count: emails.length, emails };
});
// ── Newsletter: send an update to all active subscribers ──
exports.sendNewsletter = (0, https_1.onCall)({ cors: true, timeoutSeconds: 540 }, async (request) => {
    requireAdmin(request);
    const { subject, html } = request.data;
    if (!(subject === null || subject === void 0 ? void 0 : subject.trim()) || !(html === null || html === void 0 ? void 0 : html.trim())) {
        throw new https_1.HttpsError('invalid-argument', 'subject and html are required.');
    }
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        throw new https_1.HttpsError('failed-precondition', 'SMTP is not configured (set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM).');
    }
    const snap = await db.collection('subscribers').where('active', '==', true).get();
    const emails = snap.docs
        .map(d => d.data().email)
        .filter((e) => !!e);
    const transport = buildTransport();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    let sent = 0;
    let failed = 0;
    // Send individually so recipients never see each other's addresses.
    for (const to of emails) {
        try {
            await transport.sendMail({ from, to, subject, html });
            sent++;
        }
        catch (err) {
            console.error('newsletter send failed for', to, err);
            failed++;
        }
    }
    await db.collection('newsletters').add({
        subject,
        html,
        total: emails.length,
        sent,
        failed,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    return { total: emails.length, sent, failed };
});
// ── Branded email verification via Brevo ──────────────────
// Firebase's default sender (noreply@<project>.firebaseapp.com) has no SPF/DKIM/DMARC
// aligned to your domain, so those emails often land in spam. This sends the same
// verification link through your authenticated SMTP domain (Brevo) for inbox delivery.
const verificationEmailHtml = (name, link) => `
  <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0F1B2D">
    <div style="background:linear-gradient(135deg,#F97316,#EA580C);padding:20px 24px;border-radius:12px 12px 0 0">
      <span style="color:#fff;font-size:20px;font-weight:800">PesaFlow</span>
    </div>
    <div style="padding:24px;border:1px solid #eee;border-top:none;border-radius:0 0 12px 12px">
      <h2 style="margin:0 0 12px;font-size:19px">Confirm your email</h2>
      <p style="line-height:1.6;color:#374151">Hi ${name}, welcome to PesaFlow! Tap the button below to verify your email and activate your account.</p>
      <p style="text-align:center;margin:26px 0">
        <a href="${link}" style="background:#EA580C;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:700;display:inline-block">Verify my email</a>
      </p>
      <p style="line-height:1.6;color:#6B7280;font-size:13px">If the button doesn't work, copy and paste this link into your browser:<br/><a href="${link}" style="color:#EA580C;word-break:break-all">${link}</a></p>
      <p style="margin-top:24px;font-size:12px;color:#9CA3AF">If you didn't create a PesaFlow account, you can safely ignore this email.</p>
    </div>
  </div>`;
exports.sendVerificationEmail = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b;
    const email = (_b = (_a = request.auth) === null || _a === void 0 ? void 0 : _a.token) === null || _b === void 0 ? void 0 : _b.email;
    if (!request.auth || !email) {
        throw new https_1.HttpsError('unauthenticated', 'You must be signed in to verify your email.');
    }
    if (request.auth.token.email_verified === true) {
        return { alreadyVerified: true };
    }
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
        throw new https_1.HttpsError('failed-precondition', 'Email sending is not configured.');
    }
    const link = await admin.auth().generateEmailVerificationLink(email);
    const name = (request.auth.token.name || '').split(' ')[0] || 'there';
    const transport = buildTransport();
    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    await transport.sendMail({
        from,
        to: email,
        subject: 'Verify your email for PesaFlow',
        html: verificationEmailHtml(name, link),
        text: `Hi ${name},\n\nConfirm your email to activate your PesaFlow account:\n${link}\n\nIf you didn't create an account, you can ignore this email.`,
    });
    return { sent: true };
});
// ── Admin auth: verify admin email + password, mint an admin-claim token ──
exports.adminSignIn = (0, https_1.onCall)({ cors: true }, async (request) => {
    const { email, password } = request.data;
    if (!email || !password)
        throw new https_1.HttpsError('invalid-argument', 'Email and password are required.');
    const snap = await db.collection('admins').get();
    const match = snap.docs.find(d => d.data().email === email);
    if (!match)
        throw new https_1.HttpsError('permission-denied', 'Invalid credentials.');
    const data = match.data();
    let ok = false;
    if (data.passwordScrypt && data.passwordSalt) {
        ok = timingSafeHexEqual(data.passwordScrypt, scryptHashPw(password, data.passwordSalt));
    }
    else if (data.passwordHash) {
        // Legacy djb2 hash — verify (timing-safe), then transparently upgrade to scrypt.
        if (timingSafeStrEqual(data.passwordHash, legacyHashPassword(password))) {
            ok = true;
            const salt = genSalt();
            await match.ref.set({ passwordScrypt: scryptHashPw(password, salt), passwordSalt: salt }, { merge: true });
        }
    }
    if (!ok)
        throw new https_1.HttpsError('permission-denied', 'Invalid credentials.');
    const adminUid = 'admin_' + match.id;
    const token = await admin.auth().createCustomToken(adminUid, { admin: true, role: data.role || 'support' });
    const _a = match.data(), { passwordHash: _pw, passwordScrypt: _ps, passwordSalt: _psa } = _a, safe = __rest(_a, ["passwordHash", "passwordScrypt", "passwordSalt"]);
    return { token, admin: Object.assign({ id: match.id }, safe) };
});
//# sourceMappingURL=index.js.map