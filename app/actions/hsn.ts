'use server';

import {
  createHsnCatalogItem,
  deleteHsnCatalogItem,
  listHsnCatalog,
  restoreHsnCatalogItem,
  updateHsnCatalogItem,
} from '@/lib/hsnRepository';
import type { HsnCatalogItem, HsnCatalogPayload } from '@/lib/hsn/types';
import { ActionResult } from '@/lib/types';

export async function actionListHsnCatalog(): Promise<ActionResult<HsnCatalogItem[]>> {
  return listHsnCatalog();
}

export async function actionCreateHsnCatalogItem(
  payload: HsnCatalogPayload
): Promise<ActionResult<HsnCatalogItem>> {
  return createHsnCatalogItem(payload);
}

export async function actionUpdateHsnCatalogItem(
  id: string,
  payload: HsnCatalogPayload
): Promise<ActionResult<HsnCatalogItem>> {
  return updateHsnCatalogItem(id, payload);
}

export async function actionDeleteHsnCatalogItem(id: string): Promise<ActionResult> {
  return deleteHsnCatalogItem(id);
}

export async function actionRestoreHsnCatalogItem(
  item: HsnCatalogItem
): Promise<ActionResult<HsnCatalogItem>> {
  return restoreHsnCatalogItem(item);
}
