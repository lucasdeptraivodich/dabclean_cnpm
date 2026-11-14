// ============================================================
// DABCLEAN BACKEND - Dispute & Compensation Service
// Phân hệ Giải quyết Khiếu nại, Đền bù Tài sản & Chế tài Nhân viên
// ============================================================
const db = require('../config/db');
const reputationService = require('./reputationService');
const socketService = require('./socketService');

/**
 * Ma trận đền bù & chế tài:
 * Tier 1 (Nhẹ, < 200.000 VNĐ):
 *  - Nguồn tiền: 100% Ví Thu Nhập của Thợ
 *  - Chế tài: Trừ 5 điểm tín nhiệm, cảnh cáo nội bộ
 *  - Khách hàng: Hoàn tiền về ví DabClean
 *
 * Tier 2 (Trung bình, 200.000đ - 500.000đ):
 *  - Nguồn tiền: Khấu trừ Ví Thu Nhập (nếu không đủ trừ sang Ví Tín Dụng)
 *  - Chế tài: Trừ 10 điểm tín nhiệm, phạt Hạng Cam 7 ngày (hoặc hạ cấp điểm)
 *  - Khách hàng: Hoàn tiền về ví hoặc chuyển khoản ngân hàng
 *
 * Tier 3 (Nặng, > 500.000đ - 50.000.000đ):
 *  - Nguồn tiền: Quỹ Bảo Hiểm Rủi Ro DabClean bảo trợ
 *  - Chế tài: Thợ bồi thường phần trách nhiệm tối thiểu (500.000đ), trừ 20 điểm & khóa nhận việc
 *  - Khách hàng: Bồi thường bảo hiểm sau giám định
 */

const disputeService = {
  /**
   * Tạo khiếu nại mới từ phía Khách hàng
   */
  async createDispute({ bookingId, customerId, disputeType, title, description, evidencePhotos = [], claimedAmount = 0 }) {
    if (!bookingId || !customerId || !title || !description) {
      const error = new Error('Vui lòng cung cấp đầy đủ thông tin khiếu nại.');
      error.statusCode = 400;
      throw error;
    }

    const bookings = await db.query('SELECT * FROM bookings WHERE id = ? LIMIT 1', [bookingId]);
    const booking = bookings && bookings[0] ? bookings[0] : null;
    if (!booking) {
      const error = new Error('Không tìm thấy đơn hàng liên quan.');
      error.statusCode = 404;
      throw error;
    }

    if (booking.user_id !== customerId) {
      const error = new Error('Bạn không có quyền khiếu nại đơn hàng này.');
      error.statusCode = 403;
      throw error;
    }

    if (!booking.staff_id) {
      const error = new Error('Đơn hàng chưa có nhân viên phụ trách để khiếu nại.');
      error.statusCode = 400;
      throw error;
    }

    const photosJson = JSON.stringify(evidencePhotos || []);
    const claimed = parseFloat(claimedAmount) || 0;

    const result = await db.query(
      `INSERT INTO booking_disputes 
        (booking_id, customer_id, staff_id, dispute_type, title, description, evidence_photos, claimed_amount, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [bookingId, customerId, booking.staff_id, disputeType || 'damage_property', title, description, photosJson, claimed]
    );

    const disputeId = result.insertId;

    // Gửi thông báo real-time tới Admin
    try {
      socketService.notifyRole('admin', {
        type: 'new_dispute',
        title: '⚠️ Có khiếu nại sự cố mới cần xử lý',
        message: `Đơn #${booking.booking_code}: ${title} - Thiệt hại yêu cầu: ${claimed.toLocaleString('vi-VN')} đ`,
        data: { disputeId, bookingId, claimedAmount: claimed }
      });
    } catch (e) {}

    return {
      dispute_id: disputeId,
      booking_id: bookingId,
      status: 'pending',
      claimed_amount: claimed
    };
  },

  /**
   * Lấy danh sách khiếu nại cho Admin hoặc User
   */
  async getDisputes({ role, userId, status = null } = {}) {
    let sql = `
      SELECT d.*, 
             b.booking_code, b.booking_date, b.service_name,
             cust.name AS customer_name, cust.phone AS customer_phone,
             st.name AS staff_name, st.phone AS staff_phone, st.reputation_score, st.reputation_tier
      FROM booking_disputes d
      JOIN bookings b ON d.booking_id = b.id
      JOIN users cust ON d.customer_id = cust.id
      JOIN users st ON d.staff_id = st.id
      WHERE 1=1
    `;
    const params = [];

    if (role === 'customer') {
      sql += ' AND d.customer_id = ?';
      params.push(userId);
    } else if (role === 'staff') {
      sql += ' AND d.staff_id = ?';
      params.push(userId);
    }

    if (status && status !== 'all') {
      sql += ' AND d.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY d.id DESC';
    return await db.query(sql, params);
  },

  /**
   * Admin xử lý phán quyết & chi trả bồi thường theo Ma trận bồi thường (Tier 1, Tier 2, Tier 3)
   */
  async resolveDispute({ disputeId, adminId, decision, approvedAmount, compensationSource, adminNotes }) {
    const disputes = await db.query('SELECT * FROM booking_disputes WHERE id = ? LIMIT 1', [disputeId]);
    const dispute = disputes && disputes[0] ? disputes[0] : null;
    if (!dispute) {
      const error = new Error('Không tìm thấy khiếu nại.');
      error.statusCode = 404;
      throw error;
    }

    if (dispute.status === 'resolved' || dispute.status === 'rejected') {
      const error = new Error('Khiếu nại này đã được xử lý trước đó.');
      error.statusCode = 409;
      throw error;
    }

    if (decision === 'rejected') {
      await db.query(
        `UPDATE booking_disputes 
         SET status = 'rejected', resolved_by = ?, admin_notes = ?, resolved_at = NOW()
         WHERE id = ?`,
        [adminId, adminNotes || 'Bác bỏ khiếu nại sau khi đối chiếu hồ sơ và ảnh nghiệm thu Before/After.', disputeId]
      );

      // Báo socket cho khách
      socketService.notifyUser(dispute.customer_id, {
        type: 'dispute_rejected',
        title: 'Khiếu nại đơn hàng đã được xem xét',
        message: adminNotes || 'Khiếu nại của bạn không đủ căn cứ giải quyết sau khi rà soát ảnh Before/After.'
      });

      return { success: true, status: 'rejected', message: 'Đã từ chối khiếu nại.' };
    }

    // Quyết định chấp thuận bồi thường (approved)
    const amount = parseFloat(approvedAmount) || 0;
    if (amount <= 0) {
      const error = new Error('Số tiền bồi thường phải lớn hơn 0.');
      error.statusCode = 400;
      throw error;
    }

    let source = compensationSource || 'staff_wallet';
    let reputationDeduction = 5;
    let staffPenaltyAmount = amount;
    let insuranceCoveredAmount = 0;
    let penaltyMessage = '';

    if (amount < 200000) {
      // TIER 1: Sự cố nhẹ (< 200k)
      source = 'staff_wallet';
      reputationDeduction = 5;
      staffPenaltyAmount = amount;
      penaltyMessage = 'Sự cố nhẹ (Tier 1): Khấu trừ 100% ví thu nhập, trừ 5 điểm tín nhiệm.';
    } else if (amount <= 500000) {
      // TIER 2: Sự cố trung bình (200k - 500k)
      source = 'staff_wallet';
      reputationDeduction = 10;
      staffPenaltyAmount = amount;
      penaltyMessage = 'Sự cố trung bình (Tier 2): Khấu trừ ví thợ, trừ 10 điểm tín nhiệm và chuyển Hạng Cam cảnh báo.';
    } else {
      // TIER 3: Sự cố nặng (> 500k đến 50.000.000đ)
      source = 'platform_insurance';
      staffPenaltyAmount = 500000; // Thợ chịu mức khấu trừ tối thiểu 500k
      insuranceCoveredAmount = amount - staffPenaltyAmount;
      reputationDeduction = 20;
      penaltyMessage = `Sự cố nặng (Tier 3): Quỹ Bảo Hiểm DabClean chi trả ${insuranceCoveredAmount.toLocaleString('vi-VN')} đ, thợ bồi thường phần trách nhiệm 500.000 đ, trừ 20 điểm tín nhiệm và tạm khóa nhận ca.`;
    }

    // 1. Khấu trừ ví thợ (Khấu trừ ví Thu nhập, nếu không đủ trừ tiếp sang ví Tín dụng)
    if (staffPenaltyAmount > 0) {
      try {
        const wageWallets = await db.query('SELECT id, balance FROM wallets WHERE user_id = ? AND wallet_type = "wage" LIMIT 1', [dispute.staff_id]);
        const creditWallets = await db.query('SELECT id, balance FROM wallets WHERE user_id = ? AND wallet_type = "credit" LIMIT 1', [dispute.staff_id]);

        const wageWallet = wageWallets && wageWallets[0] ? wageWallets[0] : null;
        const creditWallet = creditWallets && creditWallets[0] ? creditWallets[0] : null;

        let remainingPenalty = staffPenaltyAmount;

        if (wageWallet) {
          const currentWage = Number(wageWallet.balance || 0);
          const deductFromWage = Math.min(Math.max(0, currentWage), remainingPenalty);
          if (deductFromWage > 0 || !creditWallet) {
            const actualWageDeduct = creditWallet ? deductFromWage : remainingPenalty;
            const balAfter = currentWage - actualWageDeduct;
            const codeTx = 'PENALTY-WAGE-' + Date.now() + '-' + dispute.id;
            await db.query(
              `INSERT INTO wallet_transactions (wallet_id, user_id, transaction_code, amount, balance_before, balance_after, type, status, description)
               VALUES (?, ?, ?, ?, ?, ?, 'adjustment', 'completed', ?)`,
              [wageWallet.id, dispute.staff_id, codeTx, -actualWageDeduct, currentWage, balAfter, `Khấu trừ đền bù sự cố đơn #${dispute.booking_id} từ ví thu nhập`]
            );
            await db.query('UPDATE wallets SET balance = balance - ? WHERE id = ?', [actualWageDeduct, wageWallet.id]);
            remainingPenalty -= actualWageDeduct;
          }
        }

        if (remainingPenalty > 0 && creditWallet) {
          const currentCredit = Number(creditWallet.balance || 0);
          const balAfter = currentCredit - remainingPenalty;
          const codeTx = 'PENALTY-CREDIT-' + Date.now() + '-' + dispute.id;
          await db.query(
            `INSERT INTO wallet_transactions (wallet_id, user_id, transaction_code, amount, balance_before, balance_after, type, status, description)
             VALUES (?, ?, ?, ?, ?, ?, 'adjustment', 'completed', ?)`,
            [creditWallet.id, dispute.staff_id, codeTx, -remainingPenalty, currentCredit, balAfter, `Khấu trừ phần đền bù còn lại sự cố đơn #${dispute.booking_id} từ ví tín dụng`]
          );
          await db.query('UPDATE wallets SET balance = balance - ? WHERE id = ?', [remainingPenalty, creditWallet.id]);
        }
      } catch (wErr) {
        console.error('[Dispute] Lỗi ghi transaction trừ ví thợ:', wErr.message);
      }
    }

    // 2. Cộng tiền đền bù vào ví của Khách hàng
    try {
      let custWallets = await db.query('SELECT id, balance FROM wallets WHERE user_id = ? LIMIT 1', [dispute.customer_id]);
      if (!custWallets || custWallets.length === 0) {
        // Tạo ví customer nếu chưa có
        const ins = await db.query('INSERT INTO wallets (user_id, wallet_type, balance, status) VALUES (?, "customer", 0, "active")', [dispute.customer_id]);
        custWallets = [{ id: ins.insertId, balance: 0 }];
      }
      const custWalletId = custWallets[0].id;
      const balBeforeCust = Number(custWallets[0].balance || 0);
      const balAfterCust = balBeforeCust + amount;

      const codeTxCust = 'REFUND-' + Date.now() + '-' + dispute.id;
      await db.query(
        `INSERT INTO wallet_transactions (wallet_id, user_id, transaction_code, amount, balance_before, balance_after, type, status, description)
         VALUES (?, ?, ?, ?, ?, ?, 'refund', 'completed', ?)`,
        [custWalletId, dispute.customer_id, codeTxCust, amount, balBeforeCust, balAfterCust, `Bồi thường thiệt hại sự cố đơn #${dispute.booking_id} (${source === 'platform_insurance' ? 'Quỹ bảo hiểm DabClean' : 'Hoàn từ thợ'})`]
      );
      await db.query('UPDATE wallets SET balance = balance + ? WHERE id = ?', [amount, custWalletId]);
    } catch (cErr) {
      console.error('[Dispute] Lỗi hoàn tiền ví khách:', cErr.message);
    }

    // 3. Thi hành chế tài điểm tín nhiệm & Cấp bậc thợ
    try {
      await reputationService.recordChange({
        staffId: dispute.staff_id,
        bookingId: dispute.booking_id,
        changeAmount: -reputationDeduction,
        reason: 'damage_compensation'
      });

      // Nếu Tier 3, phạt khóa nhận việc 48h
      if (amount > 500000) {
        await db.query(
          `UPDATE users SET suspended_until = NOW() + INTERVAL 48 HOUR, reputation_tier = 'suspended' WHERE id = ?`,
          [dispute.staff_id]
        );
      }
    } catch (repErr) {
      console.error('[Dispute] Lỗi trừ điểm tín nhiệm thợ:', repErr.message);
    }

    // 4. Cập nhật bảng booking_disputes
    await db.query(
      `UPDATE booking_disputes 
       SET status = 'resolved',
           approved_amount = ?,
           compensation_source = ?,
           resolved_by = ?,
           admin_notes = ?,
           resolved_at = NOW()
       WHERE id = ?`,
      [amount, source, adminId, `${adminNotes || ''} [Chế tài: ${penaltyMessage}]`, disputeId]
    );

    // 5. Gửi thông báo thời gian thực cho cả 2 bên
    socketService.notifyUser(dispute.customer_id, {
      type: 'dispute_resolved',
      title: '✅ Đã giải ngân bồi thường sự cố',
      message: `CleanNova đã hoàn trả ${amount.toLocaleString('vi-VN')} đ vào ví tài khoản của bạn. Cảm ơn quý khách đã tin dùng dịch vụ.`,
      data: { disputeId, amount }
    });

    socketService.notifyUser(dispute.staff_id, {
      type: 'dispute_penalty',
      title: '⚠️ Thông báo quyết định bồi thường sự cố',
      message: penaltyMessage,
      data: { disputeId, penaltyAmount: staffPenaltyAmount, reputationDeducted: reputationDeduction }
    });

    return {
      success: true,
      status: 'resolved',
      approved_amount: amount,
      source,
      penalty_message: penaltyMessage
    };
  }
};

module.exports = disputeService;
