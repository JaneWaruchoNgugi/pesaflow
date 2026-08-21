// Central legal/compliance constants. Edit these in ONE place.
//
// PRIVACY_POLICY_VERSION is stamped onto each user's profile at signup (see useAuth)
// so we have provable, versioned consent — a core requirement of Kenya's Data
// Protection Act 2019. Bump the version whenever the policy materially changes.

export const COMPANY_NAME = 'PesaFlow';

// TODO: replace with a real, monitored inbox before launch (app stores + the ODPC
// both require a working privacy contact address).
export const SUPPORT_EMAIL = 'support@pesaflow.app';

export const PRIVACY_POLICY_VERSION = '1.0';
export const PRIVACY_EFFECTIVE_DATE = '21 August 2026';

// Kenya's data-protection regulator, for the "your rights" section.
export const ODPC_NAME = 'Office of the Data Protection Commissioner (ODPC)';
export const ODPC_URL = 'https://www.odpc.go.ke';

export interface ConsentRecord {
  policyVersion: string;
  agreedAt: string; // ISO timestamp
}

// The consent snapshot to stamp on a profile at signup time.
export const currentConsent = (): ConsentRecord => ({
  policyVersion: PRIVACY_POLICY_VERSION,
  agreedAt: new Date().toISOString(),
});
