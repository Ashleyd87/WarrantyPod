// Tiny module store carrying captures from the camera / email-import screens
// into the review form. Cleared when the form saves or unmounts.

export interface PendingPhoto {
  uri: string;
  /** RECEIPT | SERIAL_STICKER | PRODUCT_PHOTO | OTHER */
  assetType: string;
}

let photos: PendingPhoto[] = [];
let serial: string | null = null;
let barcode: string | null = null;

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
  takeAll(): {
    photos: PendingPhoto[];
    serial: string | null;
    barcode: string | null;
  } {
    const out = { photos, serial, barcode };
    photos = [];
    serial = null;
    barcode = null;
    return out;
  },
  peekCount(): number {
    return photos.length;
  },
  clear() {
    photos = [];
    serial = null;
    barcode = null;
  },
};
