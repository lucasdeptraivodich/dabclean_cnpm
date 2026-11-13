(() => {
  'use strict';
  const make = (tag, text) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    return node;
  };
  let dialog;
  const eligible = booking => Boolean(booking && booking.prebook !== true
    && !['waiting', 'declined'].includes(booking.staff_profiles?.prebook?.status)
    && booking.payment_method === 'bank_transfer' && booking.payment_status === 'unpaid'
    && booking.status !== 'cancelled' && booking.quote_status !== 'pending_survey');
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
      const amount = make('p', payment.amount.toLocaleString('vi-VN') + ' ₫');
      amount.className = 'booking-qr-amount';
      const image = make('img');
      image.alt = `VietQR ${payment.bank_name}, số tài khoản ${payment.account_number}, số tiền ${payment.amount} VND`;
      image.width = 320;
      image.height = 414;
      image.referrerPolicy = 'no-referrer';
      image.addEventListener('load', () => {
        state.textContent = payment.demo_mode ? 'Mã VietQR dùng để trình diễn.' : 'Quét bằng ứng dụng ngân hàng. Số tiền và nội dung chuyển khoản đã được điền sẵn.';
      });
      image.addEventListener('error', () => {
        image.hidden = true;
        state.textContent = 'Không tải được ảnh QR. Bạn có thể bấm Tải lại QR để thử lại.';
      });
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
      const note = make('p', payment.demo_mode
        ? 'Không chuyển tiền thật. Đơn này không được đối soát với ngân hàng.'
        : 'Vui lòng kiểm tra tên người thụ hưởng trong ứng dụng ngân hàng trước khi chuyển. Đơn chỉ được xác nhận thanh toán sau khi khoản tiền được đối soát.');
      note.className = 'booking-qr-footnote';
      target.append(amount, image, state, details, retry, note);
      load();
    } else {
      target.append(state);
    }
    return true;
  }
  function open(booking, { fromHistory = false } = {}) {
    if (!eligible(booking)) return false;
    if (!dialog) {
      dialog = make('dialog');
      dialog.className = 'booking-qr-dialog';
      dialog.setAttribute('aria-labelledby', 'booking-qr-title');
      dialog.addEventListener('cancel', event => {
        if (dialog.dataset.fromHistory === 'true') return;
        event.preventDefault();
        window.location.href = 'my-bookings.html';
      });
      document.body.append(dialog);
    }
    dialog.dataset.fromHistory = String(fromHistory);
    render(booking, dialog, fromHistory ? 'Thanh toán chuyển khoản VietQR' : 'Đặt lịch thành công');
    const view = make(fromHistory ? 'button' : 'a', fromHistory ? 'Đóng' : 'Xem đơn đã đặt');
    if (fromHistory) {
      view.type = 'button';
      view.addEventListener('click', () => dialog.close());
    } else {
      view.href = 'my-bookings.html';
    }
    view.className = 'booking-qr-primary';
    dialog.append(view);
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('h2').focus({ preventScroll: true });
    dialog.scrollTop = 0;
    return true;
  }
  function addPaymentButton(booking, target) {
    if (!eligible(booking)) return false;
    const button = make('button', 'Mã Thanh Toán');
    button.type = 'button';
    button.className = 'booking-qr-primary';
    button.addEventListener('click', () => open(booking, { fromHistory: true }));
    target.append(button);
    return true;
  }
  window.DabCleanBookingQr = { open, addPaymentButton };
})();
