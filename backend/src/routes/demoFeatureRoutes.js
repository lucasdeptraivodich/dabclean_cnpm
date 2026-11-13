const router = require('express').Router();
const db = require('../config/db');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');
const { notifyDemoFeaturesChanged, notifyUser, notifyRole } = require('../services/socketService');
const { createBooking } = require('../controllers/bookingController');

router.use((req, res, next) => db.demo ? next() : res.sendStatus(404));
router.use(verifyToken, requireRole(['customer', 'staff', 'admin']));
router.use((req, res, next) => {
  if (req.user.status !== 'active') return res.sendStatus(403);
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/', (req, res) => res.json({ data: db.demo.features.dashboard(req.user) }));
router.get('/membership', requireRole(['customer']), (req, res) => res.json({ data: db.demo.features.membership(req.user) }));
router.get('/staff-directory', (req, res) => res.json({ data: db.demo.features.directory(req.user) }));
router.post('/staff-directory/favorite', (req, res) => {
  db.demo.features.saveStaff(req.user, req.body.staffId, req.body.favorite);
  res.sendStatus(204);
});
router.get('/face-check', (req, res) => res.json({ data: db.demo.features.faceCheck(req.user) }));
router.post('/face-check', (req, res) => res.json({ data: db.demo.features.faceCheck(req.user, true) }));
router.post('/favorite', (req, res) => {
  db.demo.features.selectFavorite(req.user, req.body.staffId);
  res.sendStatus(204);
});
router.get('/identity', (req, res) => res.json({ data: db.demo.features.identity(req.user) }));
router.post('/identity', (req, res) => {
  res.json({ data: db.demo.features.identity(req.user, req.body.decision ?? null) });
});
router.get('/finance/:kind', requireRole(['admin']), (req, res) => {
  const { kind } = req.params;
  const { from, to } = req.query;
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && new Date(value).toJSON()?.slice(0, 10) === value;
  if (!['ledger', 'commission'].includes(kind) || !validDate(from) || !validDate(to) || from > to) {
    return res.status(400).json({ message: 'Chọn loại báo cáo và khoảng ngày hợp lệ.' });
  }
  const start = new Date(`${from}T00:00:00+07:00`);
  const end = new Date(new Date(`${to}T00:00:00+07:00`).getTime() + 86400000);
  const rows = db.demo.exportFinance(start, end, kind);
  const csvCell = value => {
    const raw = String(value ?? '');
    const safe = typeof value !== 'number' && /^[\s]*[=+@-]/.test(raw) ? "'" + raw : raw;
    return '"' + safe.replaceAll('"', '""') + '"';
  };
  res.attachment(`dabclean-${kind}-${from}-${to}.csv`);
  res.type('text/csv').send('\uFEFF' + rows.map(row => row.map(csvCell).join(',')).join('\r\n'));
});
router.post('/repeat/:id', (req, res, next) => {
  req.body = db.demo.features.repeatInput(req.user, req.params.id, req.body.date);
  return createBooking(req, res, next);
});
router.post('/prebook/:id/decision', requireRole(['staff']), (req, res) => {
  const { decision, reason } = req.body;
  const booking = db.demo.features.decidePrebook(req.user, req.params.id, decision, reason);
  const promoted = decision === 'approve' ? db.demo.promotePrebook(req.user.id) : [];
  notifyDemoFeaturesChanged([booking.user_id, req.user.id, ...promoted]);
  const state = db.demo.features.bookingStaff(booking, req.user).prebook;
  notifyUser(booking.user_id, {
    type: 'reservation_updated',
    title: state.status === 'declined' ? 'Lịch đặt trước chưa được nhận' : 'Nhân Viên Đã Xác Nhận Lịch Hẹn',
    message: state.reason || `Đơn ${booking.booking_code}`,
    data: { bookingId: booking.id }
  });
  res.sendStatus(204);
});
router.post('/bookings/:id/:action', (req, res) => {
  const participants = db.demo.features.update(req.user, req.params.id, req.params.action, req.body);
  notifyDemoFeaturesChanged(participants);
  if (req.params.action === 'dispute') {
    const event = { type: 'booking_dispute', title: 'Có khiếu nại mới cần đối soát', data: { bookingId: Number(req.params.id) } };
    notifyRole('admin', event);
    if (participants[1]) notifyUser(participants[1], event);
  }
  if (req.params.action === 'verdict') {
    const event = { type: 'booking_dispute', title: 'Đã cập nhật phán quyết khiếu nại', data: { bookingId: Number(req.params.id) } };
    for (const id of participants.slice(0, 2).filter(Boolean)) notifyUser(id, event);
  }
  res.sendStatus(204);
});

module.exports = router;
