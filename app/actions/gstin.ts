'use server';

import {
  createGstinRow,
  deleteGstinRow,
  listGstinDirectory,
  restoreGstinRow,
  updateGstinRow,
} from '@/lib/gstin/directoryRepository';
import type { GstinCategory, GstinDirectory, GstinRow, GstinRowPayload } from '@/lib/gstin/types';
import { ActionResult } from '@/lib/types';

export async function actionListGstinDirectory(): Promise<ActionResult<GstinDirectory>> {
  return listGstinDirectory();
}

export async function actionCreateGstinRow(
  category: GstinCategory,
  payload: GstinRowPayload
): Promise<ActionResult<GstinRow>> {
  return createGstinRow(category, payload);
}

export async function actionUpdateGstinRow(
  category: GstinCategory,
  id: string,
  payload: GstinRowPayload
): Promise<ActionResult<GstinRow>> {
  return updateGstinRow(category, id, payload);
}

export async function actionDeleteGstinRow(
  category: GstinCategory,
  id: string
): Promise<ActionResult<undefined>> {
  return deleteGstinRow(category, id);
}

export async function actionRestoreGstinRow(row: GstinRow): Promise<ActionResult<GstinRow>> {
  return restoreGstinRow(row);
}
