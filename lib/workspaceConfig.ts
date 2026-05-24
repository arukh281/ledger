import { validateGSTIN, normalizeGSTIN } from './validation';
import { LedgerScope } from './types';

export interface WorkspaceMeta {
  scope: LedgerScope;
  title: string;
  identifierLabel: string;
  documentTitleBase: string;
  identifierPlaceholder: string;
  identifierInputClassName?: string;
  identifierMaxLength?: number;
  validateIdentifier: (value: string) => { valid: boolean; error?: string };
  normalizeIdentifier: (value: string) => string;
}

export const PARTY_META: WorkspaceMeta = {
  scope: 'party',
  title: 'Party',
  identifierLabel: 'GSTIN',
  documentTitleBase: 'Party',
  identifierPlaceholder: '15 characters',
  identifierInputClassName: 'font-mono',
  identifierMaxLength: 15,
  validateIdentifier: validateGSTIN,
  normalizeIdentifier: normalizeGSTIN,
};

export const SECONDARY_META: WorkspaceMeta = {
  scope: 'secondary',
  title: 'Secondary',
  identifierLabel: 'Ref',
  documentTitleBase: 'Secondary',
  identifierPlaceholder: 'Any reference',
  validateIdentifier: () => ({ valid: true }),
  normalizeIdentifier: v => v.trim(),
};

export function getWorkspaceMeta(scope: LedgerScope): WorkspaceMeta {
  return scope === 'party' ? PARTY_META : SECONDARY_META;
}
