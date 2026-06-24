export function toWhatsAppNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("972")) return digits;
  if (digits.startsWith("0")) return "972" + digits.slice(1);
  // No leading 0 and no existing 972 prefix: assume a local Israeli
  // number missing its leading 0 (e.g. exported/copy-pasted without it)
  // rather than a foreign number, since all current lead data is
  // Israeli (see REVIEW.md). Prepend 972 directly.
  if (digits.length > 0) return "972" + digits;
  return digits;
}

export function buildWhatsAppMessage(partnerName: string): string {
  return encodeURIComponent(
    `שלום, אני ${partnerName} מסוכנות O-I. ראיתי את העסק שלכם וחשבתי שנוכל לעזור לכם להגדיל את הנוכחות הדיגיטלית שלכם. האם תהיו פנויים לשיחה קצרה?`
  );
}
