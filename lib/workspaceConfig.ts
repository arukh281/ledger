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

export const PRIMARY_META: WorkspaceMeta = {
  scope: 'primary',
  title: 'Primary',
  identifierLabel: 'GSTIN',
  documentTitleBase: 'Primary',
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
  return scope === 'primary' ? PRIMARY_META : SECONDARY_META;
}
