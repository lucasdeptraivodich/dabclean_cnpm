// ============================================================
// CLEANOVA - TEST SUITE: CREDIT SCORE & REPUTATION ENGINE
// Kiểm thử toàn diện 4 phần: Engine, Tiers, Backend Hooks, UI APIs
// ============================================================
const assert = require('node:assert/strict');
const reputationService = require('./src/services/reputationService');
const db = require('./src/config/db');

async function runTests() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ: CREDIT SCORE & REPUTATION ENGINE');
  console.log('====================================================\n');

  let passed = 0;

  // ------------------------------------------------------------
  // PHẦN 1: UNIT TESTS PHÂN HẠNG CẤP BẬC (TIER ENGINE)
  // ------------------------------------------------------------
  console.log('--- PHẦN 1: UNIT TESTS PHÂN HẠNG CẤP BẬC ---');

  // Test 1.1: Hạng Vàng (>= 120 điểm)
  assert.equal(reputationService.calculateTier(120), 'gold', '120 điểm phải là gold');
  assert.equal(reputationService.calculateTier(150), 'gold', '150 điểm phải là gold');
  assert.equal(reputationService.getCommissionRateForTier('gold'), 0.18, 'Hạng Vàng chiết khấu 18%');
  console.log('  ✅ [PASS] 1.1. Hạng Vàng: >= 120 điểm, tỷ lệ hoa hồng ưu đãi 18%');
  passed++;

  // Test 1.2: Hạng Bạc (80 - 119 điểm)
  assert.equal(reputationService.calculateTier(119), 'silver', '119 điểm phải là silver');
  assert.equal(reputationService.calculateTier(100), 'silver', '100 điểm phải là silver');
  assert.equal(reputationService.calculateTier(80), 'silver', '80 điểm phải là silver');
  assert.equal(reputationService.getCommissionRateForTier('silver'), 0.20, 'Hạng Bạc chiết khấu chuẩn 20%');
  console.log('  ✅ [PASS] 1.2. Hạng Bạc: 80 - 119 điểm, tỷ lệ hoa hồng chuẩn 20%');
  passed++;

  // Test 1.3: Hạng Cam (60 - 79 điểm)
  assert.equal(reputationService.calculateTier(79), 'bronze', '79 điểm phải là bronze');
  assert.equal(reputationService.calculateTier(60), 'bronze', '60 điểm phải là bronze');
  assert.equal(reputationService.getCommissionRateForTier('bronze'), 0.20, 'Hạng Cam chiết khấu 20%');
  console.log('  ✅ [PASS] 1.3. Hạng Cam (Warning Tier): 60 - 79 điểm');
  passed++;

  // Test 1.4: Hạng Đỏ (< 60 điểm)
  assert.equal(reputationService.calculateTier(59), 'suspended', '59 điểm phải là suspended');
  assert.equal(reputationService.calculateTier(0), 'suspended', '0 điểm phải là suspended');
  console.log('  ✅ [PASS] 1.4. Hạng Đỏ (Suspended Tier): < 60 điểm, tự động đóng băng');
  passed++;

  // ------------------------------------------------------------
  // PHẦN 2: KIỂM THỬ BIẾN ĐỘNG ĐIỂM VÀ LỊCH SỬ REPUTATION LOGS
  // ------------------------------------------------------------
  console.log('\n--- PHẦN 2: KIỂM THỬ BIẾN ĐỘNG ĐIỂM & LOGS VỚI DATABASE ---');

  // Đảm bảo kết nối database sẵn sàng
  if (db.initDatabase) await db.initDatabase();

  // Khởi tạo điểm cho staff #3 (Trần Văn Bảo)
  await db.query('UPDATE users SET reputation_score = 100, reputation_tier = "silver", suspended_until = NULL, consecutive_completed_tasks = 0 WHERE id = 3');

  // Test 2.1: Cộng điểm khi đánh giá 5 sao (+2)
  const log5Star = await reputationService.recordChange({
    staffId: 3,
    bookingId: null,
    changeAmount: 2,
    reason: 'rating_5_star'
  });
  assert.equal(log5Star.score_after, 102, 'Điểm sau khi đánh giá 5 sao phải là 102');
  assert.equal(log5Star.tier_after, 'silver');
  console.log('  ✅ [PASS] 2.1. Khách đánh giá 5 sao: +2 điểm -> Số dư mới 102đ');
  passed++;

  // Test 2.2: Trừ điểm khi đánh giá 1-2 sao (-5)
  const logLowStar = await reputationService.recordChange({
    staffId: 3,
    bookingId: null,
    changeAmount: -5,
    reason: 'rating_low_star'
  });
  assert.equal(logLowStar.score_after, 97, 'Điểm sau khi đánh giá thấp phải là 97');
  console.log('  ✅ [PASS] 2.2. Khách đánh giá 1-2 sao: -5 điểm -> Số dư mới 97đ');
  passed++;

  // Test 2.3: Thợ hủy ca trước > 4h (-5 điểm)
  const logCancelAdv = await reputationService.recordChange({
    staffId: 3,
    bookingId: null,
    changeAmount: -5,
    reason: 'advance_cancellation'
  });
  assert.equal(logCancelAdv.score_after, 92);
  console.log('  ✅ [PASS] 2.3. Nhân viên hủy ca báo trước > 4h: -5 điểm -> Số dư 92đ');
  passed++;

  // Test 2.4: Thợ hủy ca sát giờ 1 - 4h (-10 điểm)
  const logCancelLate = await reputationService.recordChange({
    staffId: 3,
    bookingId: null,
    changeAmount: -10,
    reason: 'late_cancellation'
  });
  assert.equal(logCancelLate.score_after, 82);
  console.log('  ✅ [PASS] 2.4. Nhân viên hủy ca sát giờ (1-4h): -10 điểm -> Số dư 82đ');
  passed++;

  // Test 2.5: Thợ hủy ca cực gấp < 1h (-20 điểm) -> Rớt xuống Hạng Cam (62 điểm)
  const logCancelUrgent = await reputationService.recordChange({
    staffId: 3,
    bookingId: null,
    changeAmount: -20,
    reason: 'urgent_cancellation'
  });
  assert.equal(logCancelUrgent.score_after, 62);
  assert.equal(logCancelUrgent.tier_after, 'bronze', '62 điểm phải là Hạng Cam (bronze)');
  console.log('  ✅ [PASS] 2.5. Nhân viên hủy ca cực gấp (<1h): -20 điểm -> Số dư 62đ (Hạng Cam)');
  passed++;

  // Test 2.6: Điểm tụt xuống < 60 -> Tự động vào Hạng Đỏ & set suspended_until 24h
  const logSuspend = await reputationService.recordChange({
    staffId: 3,
    bookingId: null,
    changeAmount: -5,
    reason: 'urgent_cancellation'
  });
  assert.equal(logSuspend.score_after, 57);
  assert.equal(logSuspend.tier_after, 'suspended', '57 điểm phải là suspended (Hạng Đỏ)');
  assert.ok(logSuspend.suspended_until, 'Phải có thời hạn phạt suspended_until');
  const repStatus = await reputationService.getStaffReputation(3);
  assert.equal(repStatus.is_suspended, true, 'is_suspended phải là true khi điểm < 60');
  console.log('  ✅ [PASS] 2.6. Điểm tụt xuống < 60: Tự động phạt khóa 24h (Hạng Đỏ)');
  passed++;

  // Test 2.7: Streak Bonus - 10 ca liên tiếp không hủy (+5 điểm)
  await db.query('UPDATE users SET reputation_score = 115, reputation_tier = "silver", suspended_until = NULL, consecutive_completed_tasks = 9 WHERE id = 3');
  const streakResult = await reputationService.handleTaskCompletionStreak(3, null);
  assert.equal(streakResult.bonus_applied, true, 'Hoàn thành ca thứ 10 phải được thưởng streak');
  assert.equal(streakResult.consecutive_completed_tasks, 0, 'Chuỗi được reset về 0 sau khi nhận thưởng');
  const staffAfterStreak = await reputationService.getStaffReputation(3);
  assert.equal(staffAfterStreak.reputation_score, 120, '115 + 5 = 120 điểm');
  assert.equal(staffAfterStreak.reputation_tier, 'gold', '120 điểm phải lên Hạng Vàng 🥇');
  console.log('  ✅ [PASS] 2.7. Streak Bonus: Hoàn thành 10 ca liên tiếp -> +5 điểm & Thăng hạng Vàng 🥇');
  passed++;

  // Test 2.8: Reset Streak khi hủy ca
  await db.query('UPDATE users SET consecutive_completed_tasks = 7 WHERE id = 3');
  await reputationService.resetStreak(3);
  const staffReset = await reputationService.getStaffReputation(3);
  assert.equal(staffReset.consecutive_completed_tasks, 0, 'Streak phải về 0 sau khi hủy');
  console.log('  ✅ [PASS] 2.8. Reset Streak: Chuỗi ca hoàn thành về 0 khi có sự cố hủy');
  passed++;

  // Test 2.9: Lấy danh sách logs minh bạch
  const logs = await reputationService.getReputationLogs(3, 10);
  assert.ok(Array.isArray(logs) && logs.length > 0, 'Phải truy xuất được danh sách logs');
  console.log(`  ✅ [PASS] 2.9. Lịch sử biến động: Truy xuất thành công ${logs.length} bản ghi`);
  passed++;

  // Khôi phục dữ liệu nhân viên về trạng thái ban đầu sạch
  await db.query('UPDATE users SET reputation_score = 100, reputation_tier = "silver", suspended_until = NULL, consecutive_completed_tasks = 0 WHERE id = 3');

  console.log('\n====================================================');
  console.log(`🎉 TẤT CẢ ${passed}/9 TEST CASES ĐÃ PASS THÀNH CÔNG!`);
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('\n❌ TEST RUN FAILED:', err);
  process.exit(1);
});
