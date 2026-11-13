// ============================================================
// DABCLEAN BACKEND - Inventory Service
// Phân hệ Quản lý Vật tư, Hóa chất & Cấp phát dụng cụ cho Thợ
// ============================================================
const db = require('../config/db');

const inventoryService = {
  /**
   * Lấy toàn bộ danh mục vật tư trong kho
   */
  async getAllItems({ category = null, isActive = 1 } = {}) {
    let sql = 'SELECT * FROM equipment_inventory WHERE 1=1';
    const params = [];

    if (category) {
      sql += ' AND category = ?';
      params.push(category);
    }
    if (isActive !== null && isActive !== undefined) {
      sql += ' AND is_active = ?';
      params.push(isActive ? 1 : 0);
    }

    sql += ' ORDER BY id ASC';
    return await db.query(sql, params);
  },

  /**
   * Thêm vật tư mới vào kho
   */
  async addItem({ itemCode, itemName, category, unit, unitPrice = 0, stockQuantity = 0 }) {
    if (!itemCode || !itemName || !category || !unit) {
      const error = new Error('Thiếu thông tin vật tư bắt buộc.');
      error.statusCode = 400;
      throw error;
    }

    const result = await db.query(
      `INSERT INTO equipment_inventory (item_code, item_name, category, unit, unit_price, stock_quantity)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [itemCode, itemName, category, unit, parseFloat(unitPrice) || 0, parseInt(stockQuantity, 10) || 0]
    );

    return {
      id: result.insertId,
      item_code: itemCode,
      item_name: itemName,
      category,
      unit,
      unit_price: unitPrice,
      stock_quantity: stockQuantity
    };
  },

  /**
   * Cập nhật số lượng hoặc thông tin vật tư
   */
  async updateItem(id, { itemName, category, unit, unitPrice, stockQuantity, isActive }) {
    const items = await db.query('SELECT * FROM equipment_inventory WHERE id = ?', [id]);
    if (!items || items.length === 0) {
      const error = new Error('Không tìm thấy vật tư.');
      error.statusCode = 404;
      throw error;
    }

    const current = items[0];
    await db.query(
      `UPDATE equipment_inventory 
       SET item_name = ?, category = ?, unit = ?, unit_price = ?, stock_quantity = ?, is_active = ?
       WHERE id = ?`,
      [
        itemName || current.item_name,
        category || current.category,
        unit || current.unit,
        unitPrice !== undefined ? parseFloat(unitPrice) : current.unit_price,
        stockQuantity !== undefined ? parseInt(stockQuantity, 10) : current.stock_quantity,
        isActive !== undefined ? (isActive ? 1 : 0) : current.is_active,
        id
      ]
    );

    return { success: true, message: 'Đã cập nhật thông tin vật tư.' };
  },

  /**
   * Cấp phát vật tư cho nhân viên
   */
  async allocateEquipment({ staffId, itemId, quantity = 1, allocationType = 'free', notes = '' }) {
    const staffs = await db.query('SELECT * FROM users WHERE id = ? AND role = "staff"', [staffId]);
    if (!staffs || staffs.length === 0) {
      const error = new Error('Không tìm thấy nhân viên.');
      error.statusCode = 404;
      throw error;
    }

    const items = await db.query('SELECT * FROM equipment_inventory WHERE id = ?', [itemId]);
    if (!items || items.length === 0) {
      const error = new Error('Không tìm thấy vật tư.');
      error.statusCode = 404;
      throw error;
    }

    const item = items[0];
    const qty = parseInt(quantity, 10) || 1;
    if (item.stock_quantity < qty) {
      const error = new Error(`Kho không đủ số lượng tồn (Hiện còn: ${item.stock_quantity} ${item.unit}).`);
      error.statusCode = 400;
      throw error;
    }

    // Giảm tồn kho và ghi nhận cấp phát
    await db.query('UPDATE equipment_inventory SET stock_quantity = stock_quantity - ? WHERE id = ?', [qty, itemId]);

    const result = await db.query(
      `INSERT INTO staff_equipment_allocations (staff_id, item_id, quantity, allocated_date, allocation_type, status, notes)
       VALUES (?, ?, ?, CURDATE(), ?, 'holding', ?)`,
      [staffId, itemId, qty, allocationType || 'free', notes || '']
    );

    return {
      allocation_id: result.insertId,
      staff_id: staffId,
      item_name: item.item_name,
      quantity: qty,
      allocated_date: new Date().toISOString().split('T')[0],
      status: 'holding'
    };
  },

  /**
   * Lấy lịch sử cấp phát theo nhân viên hoặc toàn bộ
   */
  async getAllocations({ staffId = null } = {}) {
    let sql = `
      SELECT a.*, 
             u.name AS staff_name, u.phone AS staff_phone, u.email AS staff_email,
             eq.item_code, eq.item_name, eq.category, eq.unit, eq.unit_price
      FROM staff_equipment_allocations a
      JOIN users u ON a.staff_id = u.id
      JOIN equipment_inventory eq ON a.item_id = eq.id
      WHERE 1=1
    `;
    const params = [];

    if (staffId) {
      sql += ' AND a.staff_id = ?';
      params.push(staffId);
    }

    sql += ' ORDER BY a.id DESC';
    return await db.query(sql, params);
  }
};

module.exports = inventoryService;
