// In-process simulation only. Mutations deliberately run synchronously, without await,
// so validation + debit + assignment cannot interleave between competing requests.
module.exports = function createDemoStore(data) {
  const wallets = [], transactions = [], payments = [];
  const suspended = new Set();
  const features = require('./demoFeatures')(data, { compensate, settle, isSuspended: id => suspended.has(id) });
  const clone = value => structuredClone(value);
  const fail = (message, statusCode = 400) => { const e = new Error(message); e.statusCode = statusCode; throw e; };
  const booking = id => data.bookings.find(b => b.id === Number(id)) || fail('Không tìm thấy đơn demo.', 404);
  const user = id => data.users.find(u => u.id === Number(id)) || fail('Không tìm thấy tài khoản demo.', 404);
  function wallet(id, type) {
    const owner = user(id);
    type ||= owner.role === 'staff' ? 'earnings' : 'customer';
    if (!['credit', 'earnings', 'customer'].includes(type)) fail('Loại ví không hợp lệ.');
    let w = wallets.find(w => w.user_id === Number(id) && w.wallet_type === type);
    if (!w) {
      w = { id: wallets.length + 1, user_id: Number(id), wallet_type: type, balance: type === 'earnings' ? 0 : 1000000, currency: 'VND', status: 'active' };
      wallets.push(w);
    }
    return w;
  }
  function record(w, amount, type, reference, description) {
    const before = w.balance;
    w.balance += amount;
    const tx = { id: transactions.length + 1, transaction_code: `DEMO-${transactions.length + 1}`, wallet_id: w.id, wallet_type: w.wallet_type, user_id: w.user_id, type, amount: Math.abs(amount), balance_before: before, balance_after: w.balance, status: 'completed', reference_id: String(reference), description: 'DEMO — ' + description, created_at: new Date() };
    transactions.push(tx);
    return tx;
  }
  function compensate(b, amount, large) {
    const debit = large ? 500000 : amount;
    const earnings = wallet(b.staff_id, 'earnings'), credit = wallet(b.staff_id, 'credit');
    const available = w => w.status === 'active' ? Math.max(0, w.balance) : 0;
    const fromEarnings = Math.min(debit, available(earnings));
    if (available(credit) < debit - fromEarnings) fail('Ví nhân viên không đủ số dư để khấu trừ. Khiếu nại vẫn đang mở.', 409);
    const customer = wallet(b.user_id, 'customer');
    if (fromEarnings) record(earnings, -fromEarnings, 'adjustment', b.id, 'Khấu trừ bồi thường');
    if (debit > fromEarnings) record(credit, -(debit - fromEarnings), 'adjustment', b.id, 'Khấu trừ bồi thường');
    record(customer, amount, 'refund', b.id, 'Bồi thường sự cố');
    if (large) suspended.add(b.staff_id);
    return { staffDebit: debit, insuranceContribution: amount - debit };
  }
  function staffWallets(id) {
    const credit = wallet(id, 'credit'), earnings = wallet(id, 'earnings');
    const rows = data.bookings.filter(b => b.staff_id === Number(id) && b.status === 'completed');
    const sum = key => rows.reduce((n, b) => n + (Number(b[key]) || 0), 0);
    return clone({ demo_mode: true, staff_id: Number(id), credit_wallet: { ...credit, min_threshold: 100000, is_eligible: credit.balance >= 100000, amount_needed: Math.max(0, 100000 - credit.balance), total_deposited: transactions.filter(t => t.wallet_id === credit.id && t.type === 'topup').reduce((n, t) => n + t.amount, 0), total_commission_deducted: transactions.filter(t => t.wallet_id === credit.id && t.type === 'commission_deduction').reduce((n, t) => n + t.amount, 0) }, earnings_wallet: { ...earnings, withdrawable_balance: earnings.balance, total_gross_earnings: sum('staff_wage'), total_net_earnings: sum('staff_net_wage'), total_withdrawn: 0, total_transferred_to_credit: 0 }, is_eligible_for_booking: credit.balance >= 100000, min_booking_threshold: 100000, amount_needed: Math.max(0, 100000 - credit.balance) });
  }
  function getTransactions(id, { type, wallet_type, limit = 20, offset = 0 } = {}) {
    limit = Math.max(1, Math.min(100, Number(limit) || 20));
    offset = Math.max(0, Number(offset) || 0);
    const rows = transactions.filter(t => t.user_id === Number(id) && (!type || t.type === type) && (!wallet_type || t.wallet_type === wallet_type)).slice().reverse();
    return clone({ transactions: rows.slice(offset, offset + limit), total: rows.length, limit, offset });
  }
  function accept({ bookingId, staffId, paymentMethod = 'wallet' }) {
    const b = booking(bookingId), staff = user(staffId);
    if (!['staff', 'admin'].includes(staff.role) || staff.status !== 'active') fail('Tài khoản không được nhận ca.', 403);
    if (['confirmed', 'arrived', 'in_progress'].includes(b.status) && b.staff_id === staff.id) return clone({ success: true, demo_mode: true, requires_bank_transfer: false, message: 'DEMO: Bạn đã nhận đơn này; không trừ ví lần hai.', data: { booking_id: b.id, status: b.status } });
    if (suspended.has(staffId)) fail('Tài khoản đang tạm dừng nhận ca để kiểm định.', 409);
    if (!['pending', 'assigned'].includes(b.status) || (b.staff_id != null && b.staff_id !== staff.id)) fail('Đơn không còn khả dụng hoặc đã được nhận bởi nhân viên khác.', 409);
    if (paymentMethod !== 'wallet') fail('DEMO chỉ dùng ví giả lập; không chuyển khoản ngân hàng thật.');
    features.enforceDispatch(b.id, staff.id);
    const total = Math.max(0, Math.round(Number(b.total_price) || 0));
    const gross = Math.max(0, Math.round(Number(b.staff_wage) || total * 0.8));
    const rate = b.commission_rate ? Number(b.commission_rate) : 0.20;
    const commission = Math.max(0, Math.round(Number(b.platform_commission) || gross * rate || total * 0.20));
    if (!commission) fail('Khoản chiết khấu demo không hợp lệ.');
    const w = wallet(staff.id, 'credit');
    if (w.status !== 'active' || w.balance < Math.max(100000, commission)) fail('Ví DEMO chưa đủ điều kiện. Có thể chuyển từ thu nhập giả lập hoặc khởi động lại demo để cấp lại ví (sẽ mất dữ liệu RAM).', 409);
    const tx = record(w, -commission, 'commission_deduction', b.id, 'Nhận ca ' + b.booking_code);
    const p = { id: payments.length + 1, booking_id: b.id, booking_code: b.booking_code, staff_id: staff.id,
      amount: commission, status: 'completed', payment_method: 'wallet', paid_at: tx.created_at };
    payments.push(p);
    Object.assign(b, { status: 'confirmed', staff_id: staff.id, staff_name: staff.name, assigned_at: new Date(), commission_status: 'paid', commission_payment_id: p.id, commission_payment_method: 'wallet', commission_paid_at: new Date() });
    const reserved = features.markPrebookConfirmed(b.id);
    data.bookingNotifications.push({ id: data.bookingNotifications.length + 1, user_id: b.user_id, booking_id: b.id, notification_type: 'staff_accepted_booking', title: reserved ? 'Nhân Viên Đã Xác Nhận Lịch Hẹn' : 'DEMO: Nhân viên đã nhận đơn ' + b.booking_code, message: `${staff.name} đã nhận đơn demo; không có giao dịch tiền thật.`, data: JSON.stringify({ bookingId: b.id, staffName: staff.name }), is_read: false, created_at: new Date() });
    return clone({ success: true, demo_mode: true, requires_bank_transfer: false, message: 'DEMO: Đã nhận ca và trừ chiết khấu giả lập.', data: { booking_id: b.id, booking_code: b.booking_code, status: b.status, commission_amount: commission, credit_balance_before: tx.balance_before, credit_balance_after: tx.balance_after, payment_method: 'wallet', payment_id: p.id } });
  }
  function promotePrebook(staffId) {
    const next = features.nextApproved(staffId);
    if (!next) return [];
    try {
      accept({ bookingId: next.id, staffId });
    } catch (err) {
      if (err.statusCode !== 409 && err.statusCode !== 403) throw err;
      features.decidePrebook({ id: staffId, role: 'staff' }, next.id, 'decline', 'Nhân viên chưa đủ điều kiện nhận ca đặt trước.');
    }
    return [next.user_id, staffId];
  }
  const idempotent = new Map();
  function topup({ userId, staffId, amount, idempotencyKey }, credit = false) {
    const id = userId ?? staffId;
    const n = Number(amount);
    if (!Number.isSafeInteger(n) || n <= 0 || n > 50000000) fail('Số tiền demo phải là số nguyên VND từ 1 đến 50.000.000.');
    const key = idempotencyKey ? `${id}:${credit ? 'credit' : 'customer'}:${idempotencyKey}` : null;
    if (key && idempotent.has(key)) return clone(idempotent.get(key));
    const w = wallet(id, credit ? 'credit' : undefined);
    const tx = record(w, n, 'topup', 'demo', 'Nạp tiền giả lập');
    const result = { demo_mode: true, success: true, amount: n, balance_before: tx.balance_before, balance_after: tx.balance_after, transaction_code: tx.transaction_code };
    if (key) idempotent.set(key, result);
    return clone(result);
  }
  function payBooking({ userId, bookingId }) {
    const b = booking(bookingId);
    if (b.user_id !== Number(userId)) fail('Không được thanh toán đơn này.', 403);
    if (b.status === 'cancelled') fail('Đơn đã hủy.', 409);
    if (b.payment_status === 'paid') return { demo_mode: true, booking_code: b.booking_code, isIdempotent: true };
    const w = wallet(userId, 'customer'), amount = Number(b.total_price);
    if (!Number.isSafeInteger(amount) || amount <= 0) fail('Giá đơn không hợp lệ.');
    if (w.balance < amount) fail('Ví demo không đủ tiền.', 409);
    record(w, -amount, 'payment', b.id, 'Thanh toán giả lập ' + b.booking_code);
    b.payment_status = 'paid'; b.paid_at = new Date();
    return { demo_mode: true, booking_code: b.booking_code, amount, balance_after: w.balance };
  }
  function settle({ bookingId }) {
    const b = booking(bookingId);
    if (b.status !== 'completed') fail('Chỉ quyết toán đơn đã hoàn thành.', 409);
    if (b.wage_status === 'paid') return { demo_mode: true, isIdempotent: true };
    features.enforceSettlement(b.id);
    const credit = wallet(b.staff_id, 'credit'), earnings = wallet(b.staff_id, 'earnings');
    const gross = Number(b.staff_wage) || 0, fee = Math.min(gross, Math.round(gross * (Number(b.commission_rate) || 0.2)));
    const net = Math.max(0, gross - fee);
    if (b.commission_status !== 'paid') record(credit, -fee, 'commission_deduction', b.id, 'Quyết toán giả lập');
    if (b.payment_method !== 'cash') record(earnings, net, 'wage', b.id, 'Thù lao giả lập');
    Object.assign(b, { wage_status: 'paid', wage_settled_at: new Date(), staff_net_wage: net, commission_status: 'paid' });
    return { demo_mode: true, success: true, booking_id: b.id, gross_wage: gross, net_wage: net, platform_commission: fee };
  }
  function refundBooking({ bookingId, reason }) {
    const b = booking(bookingId);
    if (b.payment_status === 'refunded') return { demo_mode: true, isIdempotent: true };
    if (b.payment_method !== 'wallet' || b.payment_status !== 'paid' || !['pending', 'assigned', 'confirmed', 'cancelled'].includes(b.status)) fail('Đơn demo không đủ điều kiện hoàn ví.', 409);
    const amount = Number(b.total_price);
    if (!Number.isSafeInteger(amount) || amount <= 0) fail('Giá hoàn không hợp lệ.');
    const w = wallet(b.user_id, 'customer');
    record(w, amount, 'refund', b.id, 'Hoàn tiền giả lập ' + b.booking_code);
    Object.assign(b, { payment_status: 'refunded', status: 'cancelled', cancel_reason: reason || 'Hoàn ví demo' });
    return { demo_mode: true, success: true, refund_amount: amount, booking_id: b.id };
  }
  function transfer({ staffId, amount, idempotencyKey }) {
    const n = Number(amount), source = wallet(staffId, 'earnings'), target = wallet(staffId, 'credit');
    const key = idempotencyKey ? `${staffId}:transfer:${idempotencyKey}` : null;
    if (key && idempotent.has(key)) return clone(idempotent.get(key));
    if (!Number.isSafeInteger(n) || n <= 0 || source.balance < n) fail('Số tiền chuyển phải là số nguyên dương và không vượt số dư thu nhập giả lập.', 409);
    record(source, -n, 'transfer', 'demo', 'Chuyển tiền giả lập sang tín dụng');
    record(target, n, 'transfer', 'demo', 'Nhận tiền giả lập từ thu nhập');
    const result = { demo_mode: true, success: true, amount: n, credit_balance_after: target.balance, earnings_balance_after: source.balance };
    if (key) idempotent.set(key, result);
    return clone(result);
  }
  function cancellation({ bookingId, cancelReason, fault }) {
    const b = booking(bookingId);
    const payment = payments.find(p => p.id === b.commission_payment_id && p.booking_id === b.id);
    if (b.commission_status !== 'paid' || payment?.status !== 'completed') {
      return { demo_mode: true, refunded: false, reason: 'Không có khoản chiết khấu demo đã thanh toán để hoàn.' };
    }

    b.commission_refund_reason = cancelReason;
    if (fault === 'staff') {
      payment.refund_status = b.commission_refund_status = 'rejected';
      return { demo_mode: true, refunded: false, reason: 'Hủy do lỗi nhân viên: không hoàn chiết khấu.' };
    }
    if (!['customer', 'admin', 'force_majeure', 'not_staff'].includes(fault)) {
      payment.refund_status = b.commission_refund_status = 'pending_review';
      return { demo_mode: true, refunded: false, reason: 'Cần quản trị viên xem xét hoàn chiết khấu demo.' };
    }

    const credit = wallet(payment.staff_id, 'credit');
    record(credit, payment.amount, 'refund', b.id, 'Hoàn chiết khấu ' + b.booking_code);
    payment.status = payment.refund_status = 'refunded';
    Object.assign(b, { commission_status: 'refunded', commission_refund_status: 'refunded', commission_refunded_at: new Date() });
    return { demo_mode: true, refunded: true, refund_method: 'wallet', amount: payment.amount, credit_balance_after: credit.balance };
  }
  function summary(id) {
    const w = staffWallets(id), rows = data.bookings.filter(b => b.staff_id === Number(id));
    const complete = rows.filter(b => b.status === 'completed');
    const sum = (key, filter = () => true) => complete.filter(filter).reduce((n, b) => n + (Number(b[key]) || 0), 0);
    const stats = { gross_earnings: sum('staff_wage'), commission_deducted: sum('platform_commission'), net_earnings: sum('staff_net_wage', b => b.wage_status === 'paid'), net_earnings_paid: sum('staff_net_wage', b => b.wage_status === 'paid'), pending_wages: sum('staff_net_wage', b => ['pending', 'approved'].includes(b.wage_status)), completed_jobs_count: complete.length, paid_jobs_count: complete.filter(b => b.wage_status === 'paid').length };
    return clone({ demo_mode: true, wallet: w.earnings_wallet, ...w, available_balance: w.earnings_wallet.balance, credit_balance: w.credit_wallet.balance, summary: stats, ...stats, bookings: rows, transactions: getTransactions(id).transactions });
  }
  function creditTip({ staffId, bookingId, bookingCode, amount }) {
    const n = Number(amount);
    if (!Number.isSafeInteger(n) || n <= 0) return { demo_mode: true, success: false };
    const earnings = wallet(staffId, 'earnings');
    const tx = record(earnings, n, 'wage', bookingId, `Tiền tip khách thưởng đơn #${bookingCode || bookingId}`);
    return clone({ demo_mode: true, success: true, amount: n, balance_after: tx.balance_after });
  }
  function exportFinance(from, to, kind) {
    const inRange = date => date >= from && date < to;
    if (kind === 'ledger') {
      return [
        ['Mã giao dịch', 'Ngày UTC', 'Mã tài khoản', 'Loại ví', 'Loại giao dịch', 'Số tiền', 'Số dư trước', 'Số dư sau'],
        ...transactions.filter(tx => inRange(tx.created_at)).map(tx => [
          tx.transaction_code, tx.created_at.toISOString(), tx.user_id, tx.wallet_type, tx.type,
          tx.amount, tx.balance_before, tx.balance_after
        ])
      ];
    }
    return [
      ['Mã đơn', 'Mã nhân viên', 'Ngày thu UTC', 'Chiết khấu đã thu', 'Trạng thái'],
      ...payments.filter(payment => inRange(payment.paid_at)).map(payment => [
        payment.booking_code, payment.staff_id, payment.paid_at.toISOString(), payment.amount,
        payment.refund_status || payment.status
      ])
    ];
  }
  return { features, exportFinance, promotePrebook, getWallet: (id, type) => clone(wallet(id, type)), staffWallets, getTransactions, summary, accept, topup, payBooking, refundBooking, transfer, settle, cancellation, creditTip };
};
