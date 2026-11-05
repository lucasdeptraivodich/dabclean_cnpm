// Customer booking payments only; staff commission bank details are separate.
// Quick Link specification: https://www.vietqr.io/qr-dong
function buildBookingVietQr(booking, demoMode = false) {
  if (!booking || booking.payment_method !== 'bank_transfer' || booking.payment_status !== 'unpaid' || booking.status === 'cancelled' || booking.quote_status === 'pending_survey') return null;
  const amount = Number(booking.total_price);
  if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 9999999999999) return null;
  if (typeof booking.booking_code !== 'string' || !/^[A-Za-z0-9-]{1,40}$/.test(booking.booking_code)) return null;
  const transferContent = 'DABCLEAN ' + booking.booking_code.replace(/-/g, '').toUpperCase();
  const url = new URL('https://img.vietqr.io/image/BIDV-8888444265-compact2.png');
  url.searchParams.set('amount', String(amount));
  url.searchParams.set('addInfo', transferContent);
  return {
    provider: 'vietqr', bank_id: 'BIDV', bank_name: 'BIDV', account_number: '8888444265',
    amount, currency: 'VND', transfer_content: transferContent, qr_url: url.href,
    demo_mode: demoMode === true, confirmation: 'bank_reconciliation_required'
  };
}
module.exports = { buildBookingVietQr };
