// ============================================================
// DABCLEAN BACKEND - Admin Routes (/api/admin)
// ============================================================
const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const serviceController = require('../controllers/serviceController');
const { verifyToken, adminRequired } = require('../middleware/authMiddleware');

// Tất cả các route admin đều yêu cầu đăng nhập và có quyền role = 'admin'
router.use(verifyToken, adminRequired);

// 1. Thống kê Dashboard
router.get('/stats', adminController.getStats);

// 2. Quản lý đơn đặt lịch & phân công nhân viên
router.get('/bookings', adminController.getAllBookings);
router.put('/bookings/:id/status', adminController.updateBookingStatus);
router.put('/bookings/:id/assign', adminController.assignBookingStaff);
router.patch('/bookings/:id/payout', adminController.payoutStaffWage);
router.post('/bookings/:id/payout', adminController.payoutStaffWage);
router.put('/bookings/:id/confirm-quote', adminController.confirmQuote);

// 2b. Cấu hình bảng giá dịch vụ vệ sinh sau xây dựng
router.get('/post-construction/config', adminController.getPostConstructionConfig);
router.put('/post-construction/config', adminController.updatePostConstructionConfig);

// 2c. Cấu hình tỷ lệ chiết khấu thù lao DabClean
router.get('/config/commission', adminController.getCommissionConfig);
router.put('/config/commission', adminController.updateCommissionConfig);

// 2d. Quản lý & đối soát thanh toán chiết khấu nhận ca
router.get('/commission/payments', adminController.getCommissionPayments);
router.post('/commission/confirm-bank-transfer', adminController.confirmBankTransferManual);
router.post('/commission/review-refund', adminController.reviewCommissionRefund);

// 3. Quản lý dịch vụ vệ sinh
router.get('/services', serviceController.getAllServices);
router.post('/services', adminController.createService);
router.put('/services/:id', adminController.updateService);
router.delete('/services/:id', adminController.deleteService);

// 4. Quản lý tài khoản người dùng (RBAC)
router.get('/users', adminController.getAllUsers);
router.get('/users/:id', adminController.getUserDetail);
router.patch('/users/:id', adminController.updateUser);
router.put('/users/:id', adminController.updateUser);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.delete('/users/:id', adminController.deleteUser);

// 5. Quản lý nhân viên (Staff Management)
router.get('/staff', adminController.getAllStaff);
router.post('/staff', adminController.createStaff);
router.patch('/staff/:id/status', adminController.toggleUserStatus);
router.get('/staff/:id/tasks', adminController.getStaffTasks);
router.post('/staff/:id/reputation', adminController.adjustStaffReputation);
router.get('/staff/:id/reputation-logs', adminController.getStaffReputationLogs);

// 6. Quản lý hồ sơ đối tác & tuyển dụng (Partner Applications)
router.get('/partners', adminController.getPartners);
router.get('/partners/:id', adminController.getPartnerDetail);
router.patch('/partners/:id/approve', adminController.approvePartner);
router.patch('/partners/:id/reject', adminController.rejectPartner);


// 8. Quản lý Sự cố & Khiếu nại tài sản (Dispute & Compensation)
const disputeService = require('../services/disputeService');
const inventoryService = require('../services/inventoryService');

router.get('/disputes', async (req, res, next) => {
  try {
    const list = await disputeService.getDisputes({ role: 'admin', status: req.query.status });
    res.json({ success: true, count: list.length, data: list });
  } catch (e) { next(e); }
});

router.post('/disputes/:id/resolve', async (req, res, next) => {
  try {
    const result = await disputeService.resolveDispute({
      disputeId: parseInt(req.params.id, 10),
      adminId: req.user.id,
      decision: req.body.decision,
      approvedAmount: req.body.approved_amount,
      compensationSource: req.body.compensation_source,
      adminNotes: req.body.admin_notes
    });
    res.json(result);
  } catch (e) { next(e); }
});

// 9. Quản lý Kho vật tư & Cấp phát dụng cụ cho Thợ (Inventory)
router.get('/inventory', async (req, res, next) => {
  try {
    const items = await inventoryService.getAllItems({ category: req.query.category });
    res.json({ success: true, count: items.length, data: items });
  } catch (e) { next(e); }
});

router.post('/inventory', async (req, res, next) => {
  try {
    const item = await inventoryService.addItem(req.body);
    res.status(201).json({ success: true, message: 'Thêm vật tư thành công', data: item });
  } catch (e) { next(e); }
});

router.put('/inventory/:id', async (req, res, next) => {
  try {
    const result = await inventoryService.updateItem(parseInt(req.params.id, 10), req.body);
    res.json(result);
  } catch (e) { next(e); }
});

router.get('/inventory/allocations', async (req, res, next) => {
  try {
    const allocations = await inventoryService.getAllocations({ staffId: req.query.staff_id });
    res.json({ success: true, count: allocations.length, data: allocations });
  } catch (e) { next(e); }
});

router.post('/inventory/allocate', async (req, res, next) => {
  try {
    const result = await inventoryService.allocateEquipment(req.body);
    res.status(201).json({ success: true, message: 'Đã cấp phát vật tư thành công', data: result });
  } catch (e) { next(e); }
});

module.exports = router;
