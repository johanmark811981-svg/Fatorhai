import { Currency } from '../types';

export const CURRENCY_SYMBOLS: Record<Currency, { symbolAr: string; symbolEn: string; code: string }> = {
  SAR: { symbolAr: 'ر.س', symbolEn: 'SAR', code: 'SAR' },
  AED: { symbolAr: 'د.إ', symbolEn: 'AED', code: 'AED' },
  KWD: { symbolAr: 'د.ك', symbolEn: 'KWD', code: 'KWD' },
  QAR: { symbolAr: 'ر.ق', symbolEn: 'QAR', code: 'QAR' },
  USD: { symbolAr: '$', symbolEn: '$', code: 'USD' },
  EUR: { symbolAr: '€', symbolEn: '€', code: 'EUR' },
  EGP: { symbolAr: 'ج.م', symbolEn: 'EGP', code: 'EGP' },
};

export function formatCurrency(
  amount: number,
  currency: string = 'SAR',
  language: 'ar' | 'en' = 'ar',
  compact: boolean = false
): string {
  // Map common symbols to codes if needed
  let code = currency;
  if (currency === 'ر.س') code = 'SAR';
  else if (currency === '$') code = 'USD';
  else if (currency === 'د.إ') code = 'AED';
  else if (currency === 'د.ك') code = 'KWD';
  else if (currency === 'ر.ق') code = 'QAR';
  else if (currency === '€') code = 'EUR';
  else if (currency === 'ج.م') code = 'EGP';

  const currencyInfo = CURRENCY_SYMBOLS[code as Currency] || CURRENCY_SYMBOLS['SAR'] || { symbolAr: 'ر.س', symbolEn: 'SAR', code: 'SAR' };
  const symbol = language === 'ar' ? (currencyInfo.symbolAr || 'ر.س') : (currencyInfo.symbolEn || 'SAR');

  if (compact && Math.abs(amount) >= 1000) {
    if (Math.abs(amount) >= 1000000) {
      return `${(amount / 1000000).toFixed(1)}M ${symbol}`;
    }
    return `${(amount / 1000).toFixed(1)}K ${symbol}`;
  }

  const formattedNum = new Intl.NumberFormat(language === 'ar' ? 'ar-SA' : 'en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);

  return `${formattedNum} ${symbol}`;
}

export function formatDate(dateString: string, language: 'ar' | 'en' = 'ar'): string {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-SA-u-ca-gregory' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function generateId(prefix: string = 'id'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}_${Date.now().toString(36)}`;
}

export function generateZatcaPhase2Metadata(invoiceNumber?: string, dateStr?: string, grandTotal?: number) {
  const hex = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
  const uuid = `${hex()}${hex()}-${hex()}-4${hex().substring(1)}-a${hex().substring(1)}-${hex()}${hex()}${hex()}`;
  
  const seed = `${invoiceNumber || 'INV'}-${dateStr || '2026'}-${grandTotal || 0}-${Date.now()}`;
  
  const safeBtoa = (str: string) => {
    try {
      return btoa(unescape(encodeURIComponent(str)));
    } catch (e) {
      // Fallback for environment constraints
      const bytes = new TextEncoder().encode(str);
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    }
  };

  // Base64 simulated SHA-256 digest (Tag 6)
  const invoiceHash = safeBtoa(`ZATCA-SHA256-HASH-${seed}`).substring(0, 44);
  
  // Base64 simulated ECDSA secp256k1 signature (Tag 7)
  const ecdsaSignature = safeBtoa(`ZATCA-ECDSA-SECP256K1-SIG-${seed}`).substring(0, 64);
  
  // Base64 simulated X.509 Certificate (Tag 8)
  const ecdsaPublicKey = safeBtoa(`MIICXDCCAgSgAwIBAgIU-ZATCA-PHASE2-CERT-${invoiceNumber || '300000000000003'}`);
  
  // Base64 simulated Cryptographic Stamp (Tag 9)
  const cryptographicStamp = safeBtoa(`STAMP-CSID-APPROVED-${uuid.substring(0, 8)}`);
  
  const icv = Math.floor(100 + Math.random() * 9000);
  const pih = safeBtoa(`PIH-PREVIOUS-INVOICE-HASH-${icv - 1}`).substring(0, 32);

  return {
    uuid,
    invoiceHash,
    ecdsaSignature,
    ecdsaPublicKey,
    cryptographicStamp,
    icv,
    pih,
    clearanceStatus: 'cleared' as const
  };
}

export function generateZatcaQrData(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  invoiceTotal: number,
  vatTotal: number,
  phase2Options?: {
    isPhase2?: boolean;
    uuid?: string;
    invoiceHash?: string;
    ecdsaSignature?: string;
    ecdsaPublicKey?: string;
    cryptographicStamp?: string;
  }
): string {
  // ZATCA TLV Encoding helper
  const lvtBuffer = (tag: number, value: string) => {
    const utf8Value = new TextEncoder().encode(value);
    const tagBuffer = new Uint8Array([tag]);
    const lengthBuffer = new Uint8Array([utf8Value.length]);
    const result = new Uint8Array(tagBuffer.length + lengthBuffer.length + utf8Value.length);
    result.set(tagBuffer);
    result.set(lengthBuffer, tagBuffer.length);
    result.set(utf8Value, tagBuffer.length + lengthBuffer.length);
    return result;
  };

  const tag1 = lvtBuffer(1, sellerName || 'شركة كواليتي لينكس');
  const tag2 = lvtBuffer(2, vatNumber || '300000000000003');
  
  // Format timestamp to ISO 8601
  let isoTimestamp = timestamp;
  if (timestamp.length === 10) {
    isoTimestamp = `${timestamp}T${new Date().toISOString().slice(11, 19)}Z`;
  } else if (!timestamp.includes('T')) {
    isoTimestamp = `${timestamp}T12:00:00Z`;
  }
  const tag3 = lvtBuffer(3, isoTimestamp);
  const tag4 = lvtBuffer(4, invoiceTotal.toFixed(2));
  const tag5 = lvtBuffer(5, vatTotal.toFixed(2));

  let tagsArray = [tag1, tag2, tag3, tag4, tag5];

  // If Phase 2 is enabled, attach Tags 6, 7, 8, 9
  if (phase2Options?.isPhase2) {
    const meta = generateZatcaPhase2Metadata(sellerName, timestamp, invoiceTotal);
    const hashVal = phase2Options.invoiceHash || meta.invoiceHash;
    const sigVal = phase2Options.ecdsaSignature || meta.ecdsaSignature;
    const pubKeyVal = phase2Options.ecdsaPublicKey || meta.ecdsaPublicKey;
    const stampVal = phase2Options.cryptographicStamp || meta.cryptographicStamp;

    tagsArray.push(lvtBuffer(6, hashVal));
    tagsArray.push(lvtBuffer(7, sigVal));
    tagsArray.push(lvtBuffer(8, pubKeyVal));
    tagsArray.push(lvtBuffer(9, stampVal));
  }

  const totalLength = tagsArray.reduce((acc, t) => acc + t.length, 0);
  const totalBuffer = new Uint8Array(totalLength);

  let offset = 0;
  tagsArray.forEach(tag => {
    totalBuffer.set(tag, offset);
    offset += tag.length;
  });

  let binary = '';
  const len = totalBuffer.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(totalBuffer[i]);
  }
  return btoa(binary);
}

export function decodeZatcaTlvQr(base64Qr: string): Record<number, string> {
  const result: Record<number, string> = {};
  try {
    const binaryStr = atob(base64Qr);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    let index = 0;
    while (index < bytes.length) {
      const tag = bytes[index];
      const len = bytes[index + 1];
      if (index + 2 + len <= bytes.length) {
        const valBytes = bytes.slice(index + 2, index + 2 + len);
        const valStr = new TextDecoder().decode(valBytes);
        result[tag] = valStr;
      }
      index += 2 + len;
    }
  } catch {
    // Return empty if parsing error
  }
  return result;
}

export function numberToArabicWords(n: number): string {
  const units = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
  const tens = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
  const hundreds = ['', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];
  const thousands = ['', 'ألف', 'ألفان', 'ثلاثة آلاف', 'أربعة آلاف', 'خمسة آلاف', 'ستة آلاف', 'سبعة آلاف', 'ثمانية آلاف', 'تسعة آلاف', 'عشرة آلاف'];

  if (n === 0) return 'صفر';
  
  const integerPart = Math.floor(n);
  const decimalPart = Math.round((n - integerPart) * 100);

  function convert(num: number): string {
    if (num < 20) return units[num];
    if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' و' + units[num % 10] : '');
    if (num < 1000) return hundreds[Math.floor(num / 100)] + (num % 100 !== 0 ? ' و' + convert(num % 100) : '');
    if (num < 1000000) return convert(Math.floor(num / 1000)) + ' ألف' + (num % 1000 !== 0 ? ' و' + convert(num % 1000) : '');
    return num.toString();
  }

  let result = convert(integerPart) + ' ريال';
  if (decimalPart > 0) {
    result += ' و' + convert(decimalPart) + ' هللة';
  }
  result += ' لا غير';
  
  return result;
}

export function normalizeInvoiceList<T extends { invoiceNumber: string }>(invoices: T[]): T[] {
  if (!invoices || invoices.length === 0) return invoices;
  
  let currentNum = 20970;
  return invoices.map((inv, idx) => {
    let isValidNumber = false;
    let parsed = 0;

    if (inv && inv.invoiceNumber) {
      const match = inv.invoiceNumber.match(/^INV-(\d+)$/i);
      if (match) {
        parsed = parseInt(match[1], 10);
        // Valid invoice number is between 20970 and 100000
        if (parsed >= 20970 && parsed < 100000 && !inv.invoiceNumber.includes('2026')) {
          isValidNumber = true;
        }
      }
    }

    if (!isValidNumber) {
      const assignedNum = idx === 0 ? 20970 : currentNum + (Math.floor(Math.random() * 6) + 4);
      currentNum = assignedNum;
      return {
        ...inv,
        invoiceNumber: `INV-${assignedNum}`
      };
    } else {
      currentNum = parsed;
      return inv;
    }
  });
}

export function generateNextInvoiceNumber(existingInvoices: { invoiceNumber: string }[] = []): string {
  const defaultBase = 20970;
  
  if (!existingInvoices || existingInvoices.length === 0) {
    return `INV-${defaultBase}`;
  }
  
  const numbers = existingInvoices.map(inv => {
    if (!inv || !inv.invoiceNumber) return 0;
    const match = inv.invoiceNumber.match(/^INV-(\d+)$/i);
    if (match) {
      const val = parseInt(match[1], 10);
      if (val >= 20970 && val < 100000) {
        return val;
      }
    }
    return 0;
  });
  
  const maxNum = Math.max(...numbers, 0);
  const baseNum = maxNum < defaultBase ? defaultBase : maxNum;
  
  // Random jump between 4 and 9 inclusive (4, 5, 6, 7, 8, or 9)
  const randomJump = Math.floor(Math.random() * 6) + 4;
  const nextNum = maxNum === 0 ? defaultBase : baseNum + randomJump;
  
  return `INV-${nextNum}`;
}
