/**
 * Server-side feature flags (read from process.env in Node).
 */

export function isFirebaseMirrorDisabled(): boolean {
  const v = (process.env.DISABLE_FIREBASE_MIRROR ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}
