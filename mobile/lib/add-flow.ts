// Tiny module store carrying captures from the camera / email-import screens
// into the review form. Cleared when the form saves or unmounts.

export interface PendingPhoto {
  uri: string;
  /** RECEIPT | SERIAL_STICKER | PRODUCT_PHOTO | OTHER */
  assetType: string;
}

/** Fields identified before the form opens (e.g. from a barcode lookup). */
export interface Prefill {
  brand?: string;
  modelName?: string;
  category?: string;
  warrantyDurationMonths?: string;
}

let photos: PendingPhoto[] = [];
let serial: string | null = null;
let barcode: string | null = null;
let prefill: Prefill | null = null;

export const addFlow = {
  addPhoto(p: PendingPhoto) {
    photos = [...photos, p];
  },
  setSerial(s: string) {
    serial = s;
  },
  setBarcode(b: string) {
    barcode = b;
  },
  setPrefill(p: Prefill) {
    prefill = { ...prefill, ...p };
  },
  takeAll(): {
    photos: PendingPhoto[];
    serial: string | null;
    barcode: string | null;
    prefill: Prefill | null;
  } {
    const out = { photos, serial, barcode, prefill };
    photos = [];
    serial = null;
    barcode = null;
    prefill = null;
    return out;
  },
  peekCount(): number {
    return photos.length;
  },
  clear() {
    photos = [];
    serial = null;
    barcode = null;
    prefill = null;
  },
};
