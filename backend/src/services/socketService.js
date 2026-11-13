// ============================================================
// DABCLEAN BACKEND - Real-time Socket.IO Notification Service
// Quản lý kết nối WebSocket, phân luồng phòng (User, Staff, Admin)
// và phát thông báo tức thì (Push Notifications & Live Updates)
// ============================================================
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const { getJwtSecret } = require('../config/jwt');

let io = null;

/**
 * Khởi tạo Socket.IO server gắn vào HTTP server
 * @param {import('http').Server} server 
 */
function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: '*', // Hỗ trợ kết nối từ mọi frontend origin (localhost:5500, LAN, mobile web)
      methods: ['GET', 'POST'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true
    },
    pingTimeout: 30000,
    pingInterval: 25000
  });

  // Middleware xác thực token khi client kết nối qua socket
  io.use((socket, next) => {
    try {
      const token = socket.handshake.auth?.token 
        || socket.handshake.query?.token 
        || (socket.handshake.headers?.authorization || '').replace('Bearer ', '');

      if (!token) {
        // Cho phép kết nối dưới tư cách khách (guest) để nhận thông báo công khai
        socket.user = null;
        return next();
      }

      const secret = getJwtSecret();
      const decoded = jwt.verify(token, secret);
      socket.user = decoded;
      return next();
    } catch (err) {
      // Nếu token hết hạn hoặc không hợp lệ, vẫn cho kết nối tư cách guest
      socket.user = null;
      return next();
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    if (user && user.id) {
      // 1. Gia nhập phòng riêng của User: user_{id}
      socket.join(`user_${user.id}`);

      // 2. Gia nhập phòng theo Role: role_{role}
      if (user.role) {
        socket.join(`role_${user.role}`);
      }

      console.log(`[Socket.io] 🟢 Người dùng #${user.id} (${user.role}) đã kết nối (Socket ID: ${socket.id})`);
    } else {
      console.log(`[Socket.io] ⚪ Khách chưa đăng nhập đã kết nối (Socket ID: ${socket.id})`);
    }

    // Lắng nghe sự kiện xác thực sau khi kết nối (khi user vừa login trên frontend)
    socket.on('authenticate', (token) => {
      try {
        if (!token) return;
        const secret = getJwtSecret();
        const decoded = jwt.verify(token, secret);
        socket.user = decoded;
        socket.join(`user_${decoded.id}`);
        if (decoded.role) {
          socket.join(`role_${decoded.role}`);
        }
        socket.emit('authenticated', { success: true, user: { id: decoded.id, role: decoded.role } });
        console.log(`[Socket.io] 🔑 Xác thực thành công Socket #${socket.id} cho User #${decoded.id} (${decoded.role})`);
      } catch (err) {
        socket.emit('authenticated', { success: false, message: 'Token xác thực không hợp lệ.' });
      }
    });

    // Lắng nghe sự kiện tham gia theo dõi đơn hàng cụ thể (Xác thực quyền sở hữu tránh rò rỉ dữ liệu)
    socket.on('join_booking', async (bookingId) => {
      if (!bookingId || !socket.user) return;
      try {
        const BookingModel = require('../models/bookingModel');
        const booking = await BookingModel.getById(bookingId);
        if (booking && (booking.user_id === socket.user.id || booking.staff_id === socket.user.id || socket.user.role === 'admin')) {
          socket.join(`booking_${bookingId}`);
        }
      } catch (e) {
        // Bỏ qua lỗi truy vấn an toàn
      }
    });

    // Rời phòng đơn hàng
    socket.on('leave_booking', (bookingId) => {
      if (bookingId) {
        socket.leave(`booking_${bookingId}`);
      }
    });

    socket.on('disconnect', (reason) => {
      if (user && user.id) {
        console.log(`[Socket.io] 🔴 Người dùng #${user.id} đã ngắt kết nối (${reason})`);
      }
    });
  });

  console.log('[Socket.io] ✅ Socket.IO Real-time Engine đã khởi động thành công!');
  return io;
}

/**
 * Lấy instance của Socket.IO
 */
function getIO() {
  return io;
}

/**
 * Gửi thông báo đến 1 người dùng cụ thể
 * @param {number|string} userId 
 * @param {object} notification 
 */
function notifyUser(userId, notification) {
  if (!io || !userId) return;
  const payload = {
    id: notification.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: notification.type || 'info',
    title: notification.title || 'Thông báo mới',
    message: notification.message || '',
    data: notification.data || null,
    sound: notification.sound || 'chime',
    created_at: new Date().toISOString()
  };
  io.to(`user_${userId}`).emit('notification', payload);
}

/**
 * Gửi thông báo đến tất cả người dùng thuộc một Role (e.g. 'staff', 'admin', 'customer')
 * @param {string} role 
 * @param {object} notification 
 */
function notifyRole(role, notification) {
  if (!io || !role) return;
  const payload = {
    id: notification.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: notification.type || 'info',
    title: notification.title || 'Thông báo hệ thống',
    message: notification.message || '',
    data: notification.data || null,
    sound: notification.sound || (role === 'staff' ? 'new_order' : 'chime'),
    created_at: new Date().toISOString()
  };
  io.to(`role_${role}`).emit('notification', payload);
}

/**
 * Gửi thông báo đến tất cả mọi người đang online
 * @param {object} notification 
 */
function notifyAll(notification) {
  if (!io) return;
  const payload = {
    id: notification.id || `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: notification.type || 'broadcast',
    title: notification.title || 'Thông báo chung',
    message: notification.message || '',
    data: notification.data || null,
    sound: notification.sound || 'chime',
    created_at: new Date().toISOString()
  };
  io.emit('notification', payload);
}

/**
 * Bắn cập nhật trạng thái đơn hàng theo thời gian thực
 * @param {number|string} bookingId 
 * @param {string} eventName 
 * @param {object} data 
 */
function notifyBooking(bookingId, eventName, data) {
  if (!io || !bookingId) return;
  io.to(`booking_${bookingId}`).emit(eventName, data);
  // Bắn đồng thời sự kiện chung cho toàn hệ thống để các trang cập nhật danh sách
  io.emit('booking_event', { bookingId, eventName, data, timestamp: new Date().toISOString() });
}

function notifyDemoFeaturesChanged(userIds) {
  const rooms = [...new Set(userIds.filter(id => Number.isSafeInteger(id) && id > 0))].map(id => `user_${id}`);
  if (rooms.length) io?.to(rooms).emit('demo_features_changed');
}


/**
 * Phân luồng nổ đơn mới (Dispatch New Booking Alert):
 * - Hạng Vàng: Nhận thông báo NGAY LẬP TỨC.
 * - Hạng Bạc & Khác: Nhận thông báo sau 30 GIÂY.
 * - Hạng Cam (60-79đ): Không nhận thông báo tức thời, phải sau 60 GIÂY nếu chưa ai nhận.
 * - Hạng Đỏ (<60đ): Chặn không gửi thông báo việc mới.
 * @param {object} booking
 */
async function dispatchNewBookingAlert(booking) {
  if (!io || !booking) return;

  try {
    const UserModel = require('../models/userModel');
    const staffList = await UserModel.getStaffList();
    const now = Date.now();

    const activeStaff = staffList.filter(st => {
      if (st.status !== 'active') return false;
      if (st.suspended_until && new Date(st.suspended_until).getTime() > now) return false;
      if (st.reputation_tier === 'suspended' || Number(st.reputation_score || 100) < 60) return false;
      return true;
    });

    const goldStaff = [];
    const standardStaff = []; // Hạng Bạc
    const warningStaff = [];  // Hạng Cam

    activeStaff.forEach(st => {
      const score = Number(st.reputation_score !== undefined && st.reputation_score !== null ? st.reputation_score : 100);
      if (score >= 120 || st.reputation_tier === 'gold') {
        goldStaff.push(st.id);
      } else if (score >= 80 || st.reputation_tier === 'silver') {
        standardStaff.push(st.id);
      } else if (score >= 60 || st.reputation_tier === 'bronze') {
        warningStaff.push(st.id);
      }
    });

    const payload = {
      id: `notif_order_${booking.id}_${Date.now()}`,
      type: 'new_booking',
      title: '🔔 Có đơn dịch vụ mới trên sàn!',
      message: `${booking.service_name || 'Dịch vụ'} tại ${booking.address}. Tiền công dự kiến: ${Number(booking.staff_net_wage || booking.staff_wage || 0).toLocaleString('vi-VN')} đ`,
      data: booking,
      sound: 'new_order',
      created_at: new Date().toISOString()
    };

    // 1. Hạng Vàng: Bắn thông báo NGAY LẬP TỨC (ưu tiên trước 30 giây)
    goldStaff.forEach(staffId => {
      notifyUser(staffId, { ...payload, title: '🥇 [VIP Ưu Tiên Sớm] Có đơn mới!' });
    });

    // 2. Hạng Bạc: Đẩy thông báo sau 30 giây
    setTimeout(async () => {
      try {
        const BookingModel = require('../models/bookingModel');
        const currentBooking = await BookingModel.getById(booking.id);
        // Nếu đơn đã được ai nhận (confirmed) hoặc bị hủy, không thông báo nữa
        if (!currentBooking || currentBooking.status !== 'pending') return;

        standardStaff.forEach(staffId => {
          notifyUser(staffId, payload);
        });
      } catch (e) {
        console.error('[Socket Delay 30s Error]', e.message);
      }
    }, 30000);

    // 3. Hạng Cam: Đẩy thông báo sau 60 giây (nếu đơn vẫn còn trống)
    setTimeout(async () => {
      try {
        const BookingModel = require('../models/bookingModel');
        const currentBooking = await BookingModel.getById(booking.id);
        if (!currentBooking || currentBooking.status !== 'pending') return;

        warningStaff.forEach(staffId => {
          notifyUser(staffId, payload);
        });
      } catch (e) {
        console.error('[Socket Delay 60s Error]', e.message);
      }
    }, 60000);

  } catch (err) {
    console.error('[Dispatch New Booking Error]', err.message);
    // Fallback nếu có lỗi
    notifyRole('staff', {
      type: 'new_booking',
      title: '🔔 Có đơn dịch vụ mới trên sàn!',
      message: `${booking.service_name || 'Dịch vụ'} tại ${booking.address}.`,
      data: booking,
      sound: 'new_order'
    });
  }
}

module.exports = {
  dispatchNewBookingAlert,
  initSocket,
  getIO,
  notifyUser,
  notifyRole,
  notifyAll,
  notifyBooking,
  notifyDemoFeaturesChanged
};
