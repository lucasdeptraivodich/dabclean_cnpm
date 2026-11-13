// ============================================================
// CLEANOVA - Reputation Service (Credit Score & Tier Engine)
// Quản lý điểm tín nhiệm nhân viên, phân hạng cấp bậc và xử phạt
// ============================================================
const db = require('../config/db');

/**
 * Xác định phân hạng cấp bậc dựa trên điểm tín nhiệm:
 * - Điểm >= 120: gold (Hạng Vàng)
 * - 80 <= Điểm <= 119: silver (Hạng Bạc)
 * - 60 <= Điểm <= 79: bronze (Hạng Cam)
 * - Điểm < 60: suspended (Hạng Đỏ)
 */
function calculateTier(score) {
  const s = Number(score);
  if (s >= 120) return 'gold';
  if (s >= 80) return 'silver';
  if (s >= 60) return 'bronze';
  return 'suspended';
}

/**
 * Tỷ lệ hoa hồng nền tảng CleanNova dựa trên tier thợ:
 * - Hạng Vàng: 18% (thợ nhận 82%)
 * - Các hạng khác: 20% (thợ nhận 80%)
 */
function getCommissionRateForTier(tier) {
  return tier === 'gold' ? 0.18 : 0.20;
}

const ReputationService = {
  calculateTier,
  getCommissionRateForTier,

  /**
   * Lấy thông tin uy tín hiện tại của thợ
   */
  async getStaffReputation(staffId) {
    const rows = await db.query(
      `SELECT id, name, email, role, reputation_score, reputation_tier, suspended_until, consecutive_completed_tasks
       FROM users WHERE id = ? LIMIT 1`,
      [staffId]
    );
    if (!rows || rows.length === 0) return null;
    const u = rows[0];
    const score = Number(u.reputation_score !== undefined && u.reputation_score !== null ? u.reputation_score : 100);
    const tier = u.reputation_tier || calculateTier(score);
    const suspendedUntil = u.suspended_until ? new Date(u.suspended_until) : null;
    const isSuspended = suspendedUntil ? (suspendedUntil.getTime() > Date.now()) : (tier === 'suspended');

    return {
      staff_id: u.id,
      name: u.name,
      email: u.email,
      reputation_score: score,
      reputation_tier: tier,
      suspended_until: u.suspended_until,
      is_suspended: isSuspended,
      consecutive_completed_tasks: Number(u.consecutive_completed_tasks || 0)
    };
  },

  /**
   * Biến động điểm tín nhiệm thợ (Áp dụng cho MySQL Pool & Transaction an toàn)
   * @param {object} param0
   * @param {number} param0.staffId
   * @param {number|null} param0.bookingId
   * @param {number} param0.changeAmount
   * @param {string} param0.reason
   * @param {object|null} param0.connection
   */
  async recordChange({ staffId, bookingId = null, changeAmount, reason, connection = null }) {
    const isExternalConn = Boolean(connection);
    let conn = connection;
    let pool = null;

    if (!isExternalConn && db.isMySQLConnected && db.isMySQLConnected()) {
      pool = db.getPool();
      if (pool) {
        conn = await pool.getConnection();
        await conn.beginTransaction();
      }
    }

    try {
      let currentScore = 100;
      let currentSuspendedUntil = null;
      let consecutiveCompleted = 0;

      if (conn) {
        const [rows] = await conn.query(
          `SELECT id, reputation_score, reputation_tier, suspended_until, consecutive_completed_tasks
           FROM users WHERE id = ? FOR UPDATE`,
          [staffId]
        );
        if (!rows || rows.length === 0) {
          throw new Error(`Không tìm thấy nhân viên #${staffId} để ghi nhận điểm uy tín.`);
        }
        currentScore = Number(rows[0].reputation_score !== undefined && rows[0].reputation_score !== null ? rows[0].reputation_score : 100);
        currentSuspendedUntil = rows[0].suspended_until;
        consecutiveCompleted = Number(rows[0].consecutive_completed_tasks || 0);
      } else {
        const rows = await db.query(
          `SELECT id, reputation_score, reputation_tier, suspended_until, consecutive_completed_tasks
           FROM users WHERE id = ? LIMIT 1`,
          [staffId]
        );
        if (!rows || rows.length === 0) {
          throw new Error(`Không tìm thấy nhân viên #${staffId} để ghi nhận điểm uy tín.`);
        }
        currentScore = Number(rows[0].reputation_score !== undefined && rows[0].reputation_score !== null ? rows[0].reputation_score : 100);
        currentSuspendedUntil = rows[0].suspended_until;
        consecutiveCompleted = Number(rows[0].consecutive_completed_tasks || 0);
      }

      const delta = Number(changeAmount) || 0;
      const newScore = Math.max(0, currentScore + delta);
      const newTier = calculateTier(newScore);

      let newSuspendedUntil = currentSuspendedUntil;
      // Nếu điểm tụt xuống < 60: Tự động phạt khóa 24 giờ
      if (newScore < 60) {
        const penaltyEnd = new Date(Date.now() + 24 * 60 * 60 * 1000);
        if (!newSuspendedUntil || new Date(newSuspendedUntil).getTime() < penaltyEnd.getTime()) {
          newSuspendedUntil = penaltyEnd;
        }
      }

      // Cập nhật users
      if (conn) {
        await conn.query(
          `UPDATE users
           SET reputation_score = ?,
               reputation_tier = ?,
               suspended_until = ?
           WHERE id = ?`,
          [newScore, newTier, newSuspendedUntil, staffId]
        );

        // Ghi log vào reputation_logs
        await conn.query(
          `INSERT INTO reputation_logs (staff_id, booking_id, change_amount, balance_after, reason)
           VALUES (?, ?, ?, ?, ?)`,
          [staffId, bookingId, delta, newScore, reason]
        );
      } else {
        await db.query(
          `UPDATE users
           SET reputation_score = ?,
               reputation_tier = ?,
               suspended_until = ?
           WHERE id = ?`,
          [newScore, newTier, newSuspendedUntil, staffId]
        );

        await db.query(
          `INSERT INTO reputation_logs (staff_id, booking_id, change_amount, balance_after, reason)
           VALUES (?, ?, ?, ?, ?)`,
          [staffId, bookingId, delta, newScore, reason]
        );
      }

      if (!isExternalConn && conn && pool) {
        await conn.commit();
      }

      return {
        staff_id: staffId,
        booking_id: bookingId,
        change_amount: delta,
        score_before: currentScore,
        score_after: newScore,
        tier_after: newTier,
        suspended_until: newSuspendedUntil,
        reason
      };
    } catch (err) {
      if (!isExternalConn && conn && pool) {
        await conn.rollback();
      }
      throw err;
    } finally {
      if (!isExternalConn && conn && pool) {
        conn.release();
      }
    }
  },

  /**
   * Xử lý chuỗi ca hoàn thành liên tiếp (Streak Bonus: 10 ca liên tiếp không hủy -> +5 điểm)
   */
  async handleTaskCompletionStreak(staffId, bookingId = null, connection = null) {
    const isExternalConn = Boolean(connection);
    let conn = connection;
    let pool = null;

    if (!isExternalConn && db.isMySQLConnected && db.isMySQLConnected()) {
      pool = db.getPool();
      if (pool) {
        conn = await pool.getConnection();
        await conn.beginTransaction();
      }
    }

    try {
      let streak = 0;
      if (conn) {
        const [rows] = await conn.query('SELECT consecutive_completed_tasks FROM users WHERE id = ? FOR UPDATE', [staffId]);
        streak = Number((rows[0] && rows[0].consecutive_completed_tasks) || 0) + 1;
      } else {
        const rows = await db.query('SELECT consecutive_completed_tasks FROM users WHERE id = ? LIMIT 1', [staffId]);
        streak = Number((rows[0] && rows[0].consecutive_completed_tasks) || 0) + 1;
      }

      let bonusApplied = false;
      let logResult = null;

      if (streak >= 10) {
        streak = 0; // Reset chuỗi sau khi đạt mốc 10
        bonusApplied = true;
        logResult = await this.recordChange({
          staffId,
          bookingId,
          changeAmount: 5,
          reason: 'streak_bonus',
          connection: conn
        });
      }

      if (conn) {
        await conn.query('UPDATE users SET consecutive_completed_tasks = ? WHERE id = ?', [streak, staffId]);
      } else {
        await db.query('UPDATE users SET consecutive_completed_tasks = ? WHERE id = ?', [streak, staffId]);
      }

      if (!isExternalConn && conn && pool) {
        await conn.commit();
      }

      return {
        consecutive_completed_tasks: streak,
        bonus_applied: bonusApplied,
        log: logResult
      };
    } catch (err) {
      if (!isExternalConn && conn && pool) {
        await conn.rollback();
      }
      throw err;
    } finally {
      if (!isExternalConn && conn && pool) {
        conn.release();
      }
    }
  },

  /**
   * Reset chuỗi ca hoàn thành khi thợ hủy đơn
   */
  async resetStreak(staffId, connection = null) {
    if (connection) {
      await connection.query('UPDATE users SET consecutive_completed_tasks = 0 WHERE id = ?', [staffId]);
    } else {
      await db.query('UPDATE users SET consecutive_completed_tasks = 0 WHERE id = ?', [staffId]);
    }
  },

  /**
   * Lấy lịch sử biến động điểm tín nhiệm của một nhân viên
   */
  async getReputationLogs(staffId, limit = 50) {
    return await db.query(
      `SELECT rl.*, b.booking_code
       FROM reputation_logs rl
       LEFT JOIN bookings b ON rl.booking_id = b.id
       WHERE rl.staff_id = ?
       ORDER BY rl.created_at DESC, rl.id DESC
       LIMIT ?`,
      [staffId, limit]
    );
  }
};

module.exports = ReputationService;
