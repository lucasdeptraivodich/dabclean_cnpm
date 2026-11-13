// ============================================================
// DABCLEAN BACKEND - Booking Routes (/api/bookings)
// ============================================================
const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/bookingController');
const { verifyToken } = require('../middleware/authMiddleware');
const db = require('../config/db');

// Lấy danh sách đánh giá công khai (không bắt buộc token)
router.get('/reviews/all', bookingController.getAllReviews);
router.get('/staff-candidates', bookingController.getStaffCandidates);

// Tính toán báo giá nhanh (Công khai hoặc kiểm tra ưu đãi)
router.post('/quote', (req, res, next) => {
  if (db.demo && req.headers.authorization) return verifyToken(req, res, next);
  next();
}, bookingController.getQuote);

// Tất cả các route đặt lịch bên dưới đều yêu cầu đăng nhập
router.use(verifyToken);

// Tạo đơn đặt lịch dịch vụ mới
router.post('/', bookingController.createBooking);

// Lấy danh sách đơn của người dùng hiện tại (hỗ trợ cả /my và /my-bookings)
router.get('/my-bookings', bookingController.getMyBookings);
router.get('/my', bookingController.getMyBookings);
router.get('/notifications', bookingController.getMyNotifications);
router.patch('/notifications/:notificationId/read', bookingController.markNotificationRead);

// Xem chi tiết một đơn
router.get('/:id', bookingController.getBookingDetail);

// Hủy đơn đặt lịch
router.put('/:id/cancel', bookingController.cancelBooking);

// Khách hàng đổi lịch thực hiện dịch vụ
router.put('/:id/reschedule', bookingController.rescheduleBooking);

// Gửi đánh giá cho đơn hoàn thành
router.post('/:id/review', bookingController.createReview);
router.post('/:id/tip', bookingController.addTip);

// Xem đánh giá của một đơn
router.get('/:id/review', bookingController.getBookingReview);


// Tạo khiếu nại đền bù từ phía Khách hàng
const disputeService = require('../services/disputeService');
router.post('/:id/dispute', async (req, res, next) => {
  try {
    const bookingId = parseInt(req.params.id, 10);
    const { dispute_type, title, description, evidence_photos, claimed_amount } = req.body;
    const result = await disputeService.createDispute({
      bookingId,
      customerId: req.user.id,
      disputeType: dispute_type,
      title,
      description,
      evidencePhotos: evidence_photos,
      claimedAmount: claimed_amount
    });
    res.status(201).json({ success: true, message: 'Gửi khiếu nại thành công! Bộ phận CSKH DabClean sẽ liên hệ và giải quyết trong vòng 2 giờ.', data: result });
  } catch (e) { next(e); }
});

router.get('/:id/disputes', async (req, res, next) => {
  try {
    const list = await disputeService.getDisputes({ role: req.user.role, userId: req.user.id });
    const bookingDisputes = list.filter(d => d.booking_id === parseInt(req.params.id, 10));
    res.json({ success: true, count: bookingDisputes.length, data: bookingDisputes });
  } catch (e) { next(e); }
});

module.exports = router;
