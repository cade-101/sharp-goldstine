// RevenueCat in-app purchases
// Install: npx expo install react-native-purchases --legacy-peer-deps
// Add to app.config.js plugins: "react-native-purchases"

let Purchases: any = null;

async function getRevenueCat() {
  if (Purchases) return Purchases;
  try {
    // Dynamic require via computed string — avoids tsc resolving the module
    // before react-native-purchases is installed.
    const mod = 'react-native-purchases';
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Purchases = require(mod).default ?? require(mod);
    return Purchases;
  } catch {
    // Not installed yet or not supported on this platform
    return null;
  }
}

const REVENUECAT_API_KEY_ANDROID = 'YOUR_REVENUECAT_ANDROID_KEY'; // TODO: replace after RevenueCat account setup

export async function initPurchases(userId: string): Promise<void> {
  const rc = await getRevenueCat();
  if (!rc) return;
  try {
    await rc.setLogLevel(rc.LOG_LEVEL?.VERBOSE ?? 'verbose');
    await rc.configure({
      apiKey: REVENUECAT_API_KEY_ANDROID,
      appUserID: userId, // anonymous Supabase UUID — no real name
    });
  } catch {
    // Non-blocking
  }
}

export async function getOfferings(): Promise<any> {
  const rc = await getRevenueCat();
  if (!rc) return null;
  try {
    const offerings = await rc.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg: any): Promise<any> {
  const rc = await getRevenueCat();
  if (!rc) return null;
  const { customerInfo } = await rc.purchasePackage(pkg);
  return customerInfo;
}

export async function restorePurchases(): Promise<any> {
  const rc = await getRevenueCat();
  if (!rc) return null;
  return rc.restorePurchases();
}

export type SubscriptionStatus = {
  isPro: boolean;
  isFamilyPlan: boolean;
  isLifetime: boolean;
  isAnyPaid: boolean;
};

export async function checkSubscriptionStatus(): Promise<SubscriptionStatus> {
  const rc = await getRevenueCat();
  const defaultStatus: SubscriptionStatus = { isPro: false, isFamilyPlan: false, isLifetime: false, isAnyPaid: false };
  if (!rc) return defaultStatus;
  try {
    const customerInfo = await rc.getCustomerInfo();
    const active = customerInfo.entitlements.active;
    const isPro      = !!active['tether_individual'];
    const isFamilyPlan = !!active['tether_family'];
    const isLifetime = !!active['tether_lifetime'];
    return { isPro, isFamilyPlan, isLifetime, isAnyPaid: isPro || isFamilyPlan || isLifetime };
  } catch {
    return defaultStatus;
  }
}

/*
RevenueCat product config (set up in RevenueCat dashboard):

Entitlements:
  tether_individual  — $4.99/month or $39/year
  tether_family      — $9.99/month or $69/year
  tether_lifetime    — $149 one-time

Free trial:
  2 month free trial, no credit card required (if supported by store)

Add to app.config.js plugins array:
  "react-native-purchases"

Install:
  npx expo install react-native-purchases --legacy-peer-deps
  (requires native rebuild — EAS build needed)
*/
