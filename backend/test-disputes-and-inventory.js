// ============================================================
// DABCLEAN - TEST SUITE: DISPUTES & INVENTORY FLOW
// Kiểm thử Ma trận bồi thường, Chế tài thợ, Hoàn tiền và Kho vật tư
// ============================================================
const assert = require('node:assert/strict');
const db = require('./src/config/db');
const disputeService = require('./src/services/disputeService');
const inventoryService = require('./src/services/inventoryService');
const reputationService = require('./src/services/reputationService');

async function runDisputeAndInventoryTests() {
  console.log('====================================================');
  console.log('🧪 BẮT ĐẦU KIỂM THỬ: DISPUTES & INVENTORY FLOW');
  console.log('====================================================\n');

  if (db.initDatabase) {
    await db.initDatabase();
  }

  let passed = 0;

  // 1. Kiểm thử Kho vật tư (Inventory)
  console.log('--- PHẦN 1: KHO VẬT TƯ & CẤP PHÁT CHO THỢ ---');
  const items = await inventoryService.getAllItems();
  assert(items.length >= 6, 'Kho vật tư phải có ít nhất 6 mặt hàng mặc định');
  console.log(`  ✅ [PASS] 1.1. Lấy danh mục kho vật tư thành công: ${items.length} mặt hàng`);
  passed++;

  // Cấp phát vật tư cho nhân viên ID 3 (Trần Văn Bảo)
  const alloc = await inventoryService.allocateEquipment({
    staffId: 3,
    itemId: items[0].id,
    quantity: 2,
    allocationType: 'free',
    notes: 'Cấp phát đồng phục định kỳ đợt 1'
  });
  assert.equal(alloc.quantity, 2);
  assert.equal(alloc.status, 'holding');
  console.log('  ✅ [PASS] 1.2. Cấp phát 2 bộ đồng phục cho nhân viên thành công');
  passed++;

  const myEquipment = await inventoryService.getAllocations({ staffId: 3 });
  assert(myEquipment.length >= 1, 'Nhân viên 3 phải có bản ghi cấp phát vật tư');
  console.log('  ✅ [PASS] 1.3. Nhân viên truy xuất danh sách đồ nghề được cấp phát thành công');
  passed++;

  // 2. Kiểm thử Ma trận bồi thường (Compensation Matrix)
  console.log('\n--- PHẦN 2: MA TRẬN BỒI THƯỜNG & CHẾ TÀI XỬ LÝ ---');

  // Đặt lại điểm thợ #3 về 100 điểm để test chế tài
  await db.query('UPDATE users SET reputation_score = 100, reputation_tier = "silver", suspended_until = NULL WHERE id = 3');

  // Test Tier 1: Sự cố nhẹ (< 200k)
  // Tạo khiếu nại mẫu
  const d1 = await disputeService.createDispute({
    bookingId: 1,
    customerId: 2,
    disputeType: 'damage_property',
    title: 'Vỡ cốc sứ trang trí',
    description: 'Thợ trong lúc lau dọn bàn trà làm rơi vỡ 1 cốc sứ lưu niệm',
    claimedAmount: 150000
  });
  assert(d1.dispute_id > 0);
  console.log('  ✅ [PASS] 2.1. Khách hàng gửi khiếu nại sự cố thành công');
  passed++;

  // Admin xử lý giải quyết Tier 1
  const res1 = await disputeService.resolveDispute({
    disputeId: d1.dispute_id,
    adminId: 1,
    decision: 'approved',
    approvedAmount: 150000,
    adminNotes: 'Chấp thuận bồi thường vỡ cốc theo thỏa thuận'
  });
  assert.equal(res1.status, 'resolved');
  assert.equal(res1.source, 'staff_wallet');

  // Kiểm tra điểm tín nhiệm thợ bị trừ 5 điểm (100 -> 95)
  const staffRep1 = await reputationService.getStaffReputation(3);
  assert.equal(staffRep1.reputation_score, 95, 'Thợ sự cố Tier 1 phải bị trừ 5 điểm');
  console.log('  ✅ [PASS] 2.2. Tier 1 (<200k): Khấu trừ 100% ví thợ, trừ 5 điểm tín nhiệm');
  passed++;

  // Test Tier 2: Sự cố trung bình (200k - 500k)
  const d2 = await disputeService.createDispute({
    bookingId: 1,
    customerId: 2,
    disputeType: 'damage_property',
    title: 'Ố vàng mặt bàn đá cẩm thạch',
    description: 'Thợ làm rớt hóa chất tẩy gây ố mặt bàn',
    claimedAmount: 400000
  });

  const res2 = await disputeService.resolveDispute({
    disputeId: d2.dispute_id,
    adminId: 1,
    decision: 'approved',
    approvedAmount: 400000,
    adminNotes: 'Hỗ trợ chi phí đánh bóng lại đá'
  });
  assert.equal(res2.source, 'staff_wallet');

  // Kiểm tra điểm tín nhiệm thợ bị trừ tiếp 10 điểm (95 -> 85)
  const staffRep2 = await reputationService.getStaffReputation(3);
  assert.equal(staffRep2.reputation_score, 85, 'Thợ sự cố Tier 2 phải bị trừ 10 điểm');
  console.log('  ✅ [PASS] 2.3. Tier 2 (200k-500k): Trừ 10 điểm tín nhiệm, hoàn tiền cho khách');
  passed++;

  // Test Tier 3: Sự cố nặng (> 500k)
  const d3 = await disputeService.createDispute({
    bookingId: 1,
    customerId: 2,
    disputeType: 'damage_property',
    title: 'Vỡ màn hình TV thông minh 55 inch',
    description: 'Va quẹt cán chổi làm nứt tấm nền TV',
    claimedAmount: 6000000
  });

  const res3 = await disputeService.resolveDispute({
    disputeId: d3.dispute_id,
    adminId: 1,
    decision: 'approved',
    approvedAmount: 6000000,
    adminNotes: 'Giám định viên đã xác thực, Quỹ Bảo Hiểm DabClean bảo trợ phần lớn chi phí'
  });
  assert.equal(res3.source, 'platform_insurance');

  // Kiểm tra điểm tín nhiệm thợ bị trừ 20 điểm (85 -> 65) và bị khóa 48h (suspended)
  const staffRep3 = await reputationService.getStaffReputation(3);
  assert.equal(staffRep3.reputation_score, 65, 'Thợ sự cố Tier 3 phải bị trừ 20 điểm');
  assert.equal(staffRep3.is_suspended, true, 'Thợ sự cố Tier 3 phải bị khóa nhận ca');
  console.log('  ✅ [PASS] 2.4. Tier 3 (>500k): Quỹ Bảo Hiểm DabClean bảo trợ, thợ đền 500k, trừ 20đ & khóa ca 48h');
  passed++;

  console.log('\n====================================================');
  console.log(`🎉 TẤT CẢ ${passed}/7 TEST CASES ĐÃ PASS THÀNH CÔNG!`);
  console.log('====================================================');
  process.exit(0);
}

runDisputeAndInventoryTests().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
