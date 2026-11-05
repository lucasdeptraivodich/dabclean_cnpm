(() => {
  'use strict';
  const make = (tag, text) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let dialog;
  const eligible = booking => Boolean(booking && booking.payment_method === 'bank_transfer' && booking.payment_status === 'unpaid' && booking.status !== 'cancelled' && booking.quote_status !== 'pending_survey');
  function render(booking, target, title = 'Thanh toán chuyển khoản VietQR') {
    target.replaceChildren();
    if (!eligible(booking)) return false;
    const header = make('h2', title);
    if (target === dialog) header.id = 'booking-qr-title';
    header.tabIndex = -1;
    target.append(header, make('p', 'Mã đơn: ' + (booking.booking_code || 'Đã ghi nhận')));
    const payment = booking.payment_qr;
    const state = make('p');
    state.setAttribute('role', 'status');
    let url;
    try {
      if (!payment || !Number.isSafeInteger(payment.amount) || payment.amount <= 0 || payment.amount !== Number(booking.total_price)) throw new Error('Invalid payment');
      url = new URL(payment.qr_url);
      if (url.protocol !== 'https:' || url.hostname !== 'img.vietqr.io' || url.searchParams.get('amount') !== String(payment.amount)) throw new Error('Invalid QR URL');
    } catch {
      url = null;
      state.textContent = 'Đơn đã tạo, nhưng chưa tải được thông tin QR. Không đặt lại đơn; hãy xem đơn đã đặt để kiểm tra.';
    }
    if (url) {
      const badge = make('p', payment.demo_mode ? 'DEMO — Không chuyển tiền thật vào mã QR này.' : 'Chờ thanh toán chuyển khoản');
      badge.className = 'booking-qr-notice';
      const amount = make('p', payment.amount.toLocaleString('vi-VN') + ' ₫');
      amount.className = 'booking-qr-amount';
      const image = make('img');
      image.alt = `VietQR ${payment.bank_name}, số tài khoản ${payment.account_number}, số tiền ${payment.amount} VND`;
      image.width = 320;
      image.height = 380;
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('load', () => { state.textContent = 'Quét bằng ứng dụng ngân hàng. Số tiền và nội dung chuyển khoản đã được điền sẵn.'; });
      image.addEventListener('error', () => { image.hidden = true; state.textContent = 'Không tải được ảnh QR. Bạn có thể thử lại hoặc chuyển khoản theo thông tin bên dưới.'; });
      state.textContent = 'Đang tải mã VietQR…';
      const details = make('dl');
      for (const [label, value] of [['Ngân hàng', payment.bank_name], ['Số tài khoản', payment.account_number], ['Số tiền', amount.textContent], ['Nội dung', payment.transfer_content]]) {
        details.append(make('dt', label), make('dd', value));
      }
      const retry = make('button', 'Tải lại QR');
      retry.type = 'button';
      retry.className = 'booking-qr-secondary';
      const load = () => { image.hidden = false; state.textContent = 'Đang tải mã VietQR…'; image.src = url.href; };
      retry.addEventListener('click', load);
      const note = make('p', 'Vui lòng kiểm tra tên người thụ hưởng trong ứng dụng ngân hàng trước khi chuyển. Đơn chỉ được xác nhận thanh toán sau khi khoản tiền được đối soát; hiển thị hoặc quét QR không đồng nghĩa đã thanh toán.');
      note.className = 'booking-qr-footnote';
      target.append(badge, amount, image, state, details, retry, note);
      load();
    } else {
      target.append(state);
    }
    return true;
  }
  function open(booking) {
    if (!eligible(booking)) return false;
    if (!dialog) {
      dialog = make('dialog');
      dialog.className = 'booking-qr-dialog';
      dialog.setAttribute('aria-labelledby', 'booking-qr-title');
      dialog.addEventListener('cancel', event => {
        event.preventDefault();
        window.location.href = 'my-bookings.html';
      });
      document.body.append(dialog);
    }
    render(booking, dialog, 'Đặt lịch thành công');
    const view = make('a', 'Xem đơn đã đặt');
    view.href = 'my-bookings.html';
    view.className = 'booking-qr-primary';
    dialog.append(view);
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('h2').focus({ preventScroll: true });
    dialog.scrollTop = 0;
    return true;
  }
  window.DabCleanBookingQr = { open, render };
})();
