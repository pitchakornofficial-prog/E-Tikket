// Standard EMVCo Thai PromptPay QR Generator
// Supports Phone Number (Mobile), National ID / Tax ID, and optional exact amount.

function formatTlv(tag: string, value: string): string {
  const length = String(value.length).padStart(2, "0");
  return `${tag}${length}${value}`;
}

export function crc16(data: string): string {
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

export function sanitizePromptPayTarget(target: string): string {
  return target.replace(/[^0-9]/g, "");
}

export function formatPromptPayDisplay(target: string): string {
  const digits = sanitizePromptPayTarget(target);
  if (digits.length === 10) {
    // 08X-XXX-XXXX
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 13) {
    // X-XXXX-XXXXX-XX-X
    return `${digits.slice(0, 1)}-${digits.slice(1, 5)}-${digits.slice(5, 10)}-${digits.slice(10, 12)}-${digits.slice(12)}`;
  }
  return target;
}

export function generatePromptPayPayload(target: string, amount?: number): string {
  const digits = sanitizePromptPayTarget(target);

  // PromptPay Application ID (AID)
  const promptPayAid = formatTlv("00", "A000000677010111");
  let merchantAccountInfo = "";

  if (digits.length === 10) {
    // Mobile Number: replace leading 0 with 0066 (e.g. 0812345678 -> 0066812345678)
    const formattedMobile = `0066${digits.slice(1)}`;
    merchantAccountInfo = promptPayAid + formatTlv("01", formattedMobile);
  } else if (digits.length === 13) {
    // National ID or Tax ID
    merchantAccountInfo = promptPayAid + formatTlv("02", digits);
  } else if (digits.length === 15) {
    // E-Wallet ID
    merchantAccountInfo = promptPayAid + formatTlv("03", digits);
  } else {
    // Fallback: treat as mobile phone if possible
    const formattedMobile = digits.startsWith("0") ? `0066${digits.slice(1)}` : digits;
    merchantAccountInfo = promptPayAid + formatTlv("01", formattedMobile);
  }

  // Tag 00: Payload Format Indicator (01)
  const tag00 = formatTlv("00", "01");

  // Tag 01: Point of Initiation Method: 12 (Dynamic with amount), 11 (Static without amount)
  const isDynamic = typeof amount === "number" && amount > 0;
  const tag01 = formatTlv("01", isDynamic ? "12" : "11");

  // Tag 29: Merchant Account Information
  const tag29 = formatTlv("29", merchantAccountInfo);

  // Tag 53: Transaction Currency (764 = THB)
  const tag53 = formatTlv("53", "764");

  // Tag 54: Transaction Amount
  let tag54 = "";
  if (isDynamic) {
    const formattedAmount = (amount as number).toFixed(2);
    tag54 = formatTlv("54", formattedAmount);
  }

  // Tag 58: Country Code (TH)
  const tag58 = formatTlv("58", "TH");

  // Tag 63: Checksum header "6304"
  const rawPayload = `${tag00}${tag01}${tag29}${tag53}${tag54}${tag58}6304`;
  const checksum = crc16(rawPayload);

  return `${rawPayload}${checksum}`;
}
