module.exports = function createDemoFeatures(data, operations) {
  const records = new Map();
  const favorites = new Map();
  const savedStaff = new Map();
  const faceChecks = new Map();
  const trust = new Map();
  const staff = () => data.users.filter(user => user.role === 'staff' && user.status === 'active' && !operations.isSuspended(user.id));
  const chatStatuses = ['confirmed', 'arrived', 'in_progress'];
  const fail = (statusCode, message) => { throw Object.assign(new Error(message), { statusCode }); };
  function staffProfile(id) {
    const worker = data.users.find(user => user.id === id && user.role === 'staff');
    if (!worker) return null;
    const completed = data.bookings.filter(order => order.staff_id === id && order.status === 'completed');
    const scores = (data.reviews || []).filter(review => completed.some(order => order.id === review.booking_id))
      .map(review => Number(review.staff_rating)).filter(score => score >= 1 && score <= 5);
    return {
      id, name: worker.name, completedJobs: completed.length,
      rating: scores.length ? Math.round(scores.reduce((sum, score) => sum + score, 0) * 10 / scores.length) / 10 : null,
      faceVerified: faceChecks.has(id), experience: 'Nhân viên vệ sinh DabClean', trustScore: trust.get(id) ?? 100
    };
  }
  function directory(user) {
    if (user.role !== 'customer') fail(403, 'Chỉ khách hàng có thể mở danh sách nhân viên.');
    const served = new Set(data.bookings.filter(order => order.user_id === user.id && order.status === 'completed').map(order => order.staff_id));
    return staff().map(worker => ({
      ...staffProfile(worker.id), served: served.has(worker.id), busy: isStaffBusy(worker.id),
      favorite: savedStaff.get(user.id)?.has(worker.id) || favorites.get(user.id) === worker.id
    }));
  }
  function saveStaff(user, id, favorite) {
    if (user.role !== 'customer') fail(403, 'Chỉ khách hàng có thể lưu nhân viên yêu thích.');
    validateStaffChoice(id);
    if (typeof favorite !== 'boolean') fail(400, 'Trạng thái yêu thích không hợp lệ.');
    const saved = savedStaff.get(user.id) || new Set();
    if (favorite) saved.add(id);
    else {
      saved.delete(id);
      if (favorites.get(user.id) === id) favorites.delete(user.id);
    }
    savedStaff.set(user.id, saved);
  }
  function faceCheck(user, confirm = false) {
    if (user.role !== 'staff') fail(403, 'Chỉ nhân viên có thể xác thực hồ sơ của mình.');
    if (confirm && !faceChecks.has(user.id)) faceChecks.set(user.id, new Date());
    return { verifiedAt: faceChecks.get(user.id) || null, demo: true };
  }
  function validateStaffChoice(id) {
    if (!Number.isSafeInteger(id) || !staff().some(worker => worker.id === id)) fail(400, 'Nhân viên đã chọn không còn khả dụng.');
  }
  function isStaffBusy(id) {
    return data.bookings.some(row => row.staff_id === id && ['confirmed', 'arrived', 'in_progress'].includes(row.status));
  }
  function setStaffChoice(bookingId, id, prebook = false) {
    const booking = data.bookings.find(row => row.id === bookingId);
    if (!booking) return [];
    const entry = records.get(bookingId) || {};
    entry.requestedStaffId = id;
    if (prebook) {
      entry.prebook = { status: 'waiting', staffId: id, expiresAt: Date.now() + 30 * 60000 };
      delete entry.dispatch;
      records.set(bookingId, entry);
      return [id];
    }
    if (booking.status === 'pending' && booking.staff_id == null) {
      entry.dispatch = buildDispatch(booking, id);
    }
    records.set(bookingId, entry);
    return entry.dispatch?.candidates.map(worker => worker.id) || [];
  }
  function bookingStaff(booking, user) {
    const assigned = staffProfile(booking.staff_id);
    if (assigned && user.role === 'customer' && staff().some(worker => worker.id === assigned.id)) {
      assigned.favorite = savedStaff.get(user.id)?.has(assigned.id) || favorites.get(user.id) === assigned.id;
    }
    return {
      assigned,
      requested: staffProfile(records.get(booking.id)?.requestedStaffId),
      prebook: prebookState(records.get(booking.id)?.prebook)
    };
  }
  function text(value, max) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) fail(400, `Nội dung phải dài từ 1 đến ${max} ký tự.`);
    return value.trim();
  }
  function bookingFor(user, id) {
    const booking = data.bookings.find(row => row.id === Number(id));
    if (!booking) fail(404, 'Không tìm thấy đơn.');
    if (user.role !== 'admin' && !isParticipant(user, booking)) fail(403, 'Bạn không có quyền với đơn này.');
    return booking;
  }
  function isParticipant(user, booking) {
    return (user.role === 'customer' && booking.user_id === user.id)
      || (user.role === 'staff' && booking.staff_id === user.id);
  }
  function distanceKm(lat, lng, targetLat, targetLng) {
    const rad = value => value * Math.PI / 180;
    const a = Math.sin(rad(targetLat - lat) / 2) ** 2
      + Math.cos(rad(lat)) * Math.cos(rad(targetLat)) * Math.sin(rad(targetLng - lng) / 2) ** 2;
    return 12742 * Math.asin(Math.sqrt(Math.min(a, 1)));
  }
  function dashboard(user) {
    const rows = data.bookings.filter(booking => user.role === 'admin' || isParticipant(user, booking));
    const favoriteStaff = favorites.get(user.id) || null;
    const { points, tier, discountRate } = membership(user);
    return {
      role: user.role, points, tier, discountRate, favoriteStaff,
      staffTrust: user.role === 'staff' ? { score: trust.get(user.id) ?? 100, suspended: operations.isSuspended(user.id) } : undefined,
      identity: user.role === 'admin' ? identities[0] : undefined,
      offers: user.role === 'staff' ? data.bookings.flatMap(booking => {
        const entry = records.get(booking.id);
        const reservation = prebookState(entry?.prebook);
        if (booking.status === 'pending' && reservation?.staffId === user.id &&
          ['waiting', 'approved'].includes(reservation.status)) {
          return [{ id: booking.id, code: booking.booking_code, prebook: reservation.status }];
        }
        const dispatch = entry?.dispatch;
        if (!dispatch || booking.status !== 'pending' || booking.staff_id != null) return [];
        const candidate = dispatch.candidates.find(worker => worker.id === user.id);
        if (!candidate) return [];
        const isPriority = dispatch.priorityIds.includes(user.id);
        const canAccept = !dispatch.priorityIds.length || isPriority || dispatch.until <= Date.now();
        return [{ id: booking.id, code: booking.booking_code, km: candidate.km, isPriority, canAccept }];
      }) : [],
      staffOptions: user.role === 'customer'
        ? staff().filter(worker => rows.some(booking => booking.status === 'completed' && booking.staff_id === worker.id))
          .map(({ id, name }) => ({ id, name })) : [],
      bookings: rows.map(booking => {
        const entry = records.get(booking.id) || {};
        const assigned = isParticipant(user, booking);
        return {
          id: booking.id, code: booking.booking_code, status: booking.status, staffId: booking.staff_id,
          total: Number(booking.total_price), paymentStatus: booking.payment_status,
          paymentMethod: booking.payment_method,
          disputed: entry.dispute?.status === 'open',
          payment: user.role === 'staff' ? undefined : entry.payment,
          dispute: user.role === 'staff' && entry.dispute
            ? { status: entry.dispute.status, reason: entry.dispute.reason, statement: entry.dispute.statement }
            : entry.dispute,
          dispatch: user.role === 'admin' ? entry.dispatch : undefined,
          messages: assigned && chatStatuses.includes(booking.status)
            ? (entry.chatStaffId === booking.staff_id ? entry.messages : []) : undefined,
          location: assigned && chatStatuses.includes(booking.status) && entry.location
            && entry.location.staffId === booking.staff_id && Date.now() - entry.location.at < 30000
            ? entry.location : undefined,
          signature: entry.signature,
          prebook: user.role === 'staff' ? undefined : prebookState(entry.prebook),
          canRepeat: user.role === 'customer' && canRepeat(booking)
        };
      })
    };
  }
  function membership(user) {
    const points = user?.role === 'customer' ? data.bookings.reduce((sum, booking) => {
      if (booking.user_id !== user.id || booking.status !== 'completed' || booking.payment_status !== 'paid') return sum;
      return sum + Math.floor((Number(booking.total_price) - (records.get(booking.id)?.payment?.refunded || 0)) / 10000);
    }, 0) : 0;
    return { points, tier: points >= 200 ? 'Bạch Kim' : points >= 50 ? 'Vàng' : 'Bạc',
      discountRate: points >= 200 ? 0.10 : points >= 50 ? 0.05 : 0 };
  }
  function selectFavorite(user, staffId) {
    if (user.role !== 'customer') fail(403, 'Chỉ khách hàng có thể chọn nhân viên quen.');
    if (staffId === null) { favorites.delete(user.id); return; }
    if (!dashboard(user).staffOptions.some(worker => worker.id === staffId)) fail(400, 'Chọn nhân viên đã hoàn thành đơn của bạn.');
    favorites.set(user.id, staffId);
    saveStaff(user, staffId, true);
  }
  function canRepeat(booking) {
    const service = data.services.find(item => item.id === booking.service_id);
    return booking.status === 'completed' && (!booking.package_type || booking.package_type === 'hourly')
      && service?.category === 'cleaning' && Number(service.min_duration_hours || 0) < 2
      && service.id !== 5 && service.slug !== 've-sinh-sau-xay-dung' && !booking.area_m2;
  }
  function repeatInput(user, id, date) {
    const booking = bookingFor(user, id);
    if (user.role !== 'customer') fail(403, 'Chỉ khách hàng có thể đặt lại đơn của mình.');
    if (!canRepeat(booking)) fail(409, 'Đơn này chưa hỗ trợ đặt lại theo tuần.');
    return {
      service_id: booking.service_id, booking_date: date,
      booking_time: String(booking.booking_time).slice(0, 5),
      area_size: booking.area_size, duration_hours: booking.duration_hours,
      address: booking.address, phone: booking.phone, notes: booking.notes || '',
      frequency: 'weekly', payment_method: 'bank_transfer'
    };
  }
  function buildDispatch(booking, requestedStaffId = records.get(booking.id)?.requestedStaffId, freeOnly = false) {
    const lat = Number(booking.latitude ?? 21.0285), lng = Number(booking.longitude ?? 105.8542);
    const preferred = requestedStaffId ?? (['weekly', 'monthly'].includes(booking.frequency) ? favorites.get(booking.user_id) : null);
    const candidates = staff().map((worker, index) => ({
      id: worker.id, name: worker.name, km: distanceKm(lat, lng, 21.029 + index * 0.04, 105.855)
    })).filter(worker => !freeOnly || !isStaffBusy(worker.id))
      .sort((a, b) => Number(b.id === preferred) - Number(a.id === preferred) || a.km - b.km);
    const favorite = candidates.find(worker => worker.id === preferred);
    const priority = favorite ? [favorite] : candidates.filter(worker => worker.km <= 3);
    return { candidates, priorityIds: priority.map(worker => worker.id), until: Date.now() + 300000 };
  }
  const actions = {
    pay(user, booking, entry) {
      if (user.role !== 'customer') fail(403, 'Chỉ khách hàng có thể thanh toán đơn của mình.');
      if (entry.prebook && !['approved', 'confirmed'].includes(entry.prebook.status)) fail(409, 'Cần chờ nhân viên xác nhận trước khi thanh toán.');
      if (entry.payment && booking.status !== 'cancelled') return;
      if (!['pending', 'assigned', 'confirmed'].includes(booking.status) || booking.payment_status !== 'unpaid'
        || !['bank_transfer', 'momo', 'vnpay'].includes(booking.payment_method)) fail(409, 'Đơn chưa đủ điều kiện thanh toán trực tuyến demo.');
      const amount = Number(booking.total_price);
      if (!Number.isSafeInteger(amount) || amount <= 0 || booking.quote_status === 'pending_survey') fail(409, 'Đơn chưa có giá thanh toán hợp lệ.');
      if (booking.status === 'pending' && booking.staff_id == null && !entry.dispatch && !entry.prebook) entry.dispatch = buildDispatch(booking);
      entry.payment = { amount, refunded: 0, at: new Date() };
      booking.payment_status = 'paid';
      booking.paid_at = entry.payment.at;
    },
    message(user, booking, entry, body) {
      if (!isParticipant(user, booking)) fail(403, 'Chat chỉ dành cho khách và nhân viên phụ trách.');
      if (!chatStatuses.includes(booking.status)) fail(409, 'Chat đã đóng theo trạng thái đơn.');
      const content = body.photo && !body.text ? '' : text(body.text, 500);
      if (body.photo !== undefined && (
        typeof body.photo !== 'string' || body.photo.length > 64000
        || !/^data:image\/jpeg;base64,\/9j\/[A-Za-z0-9+/]+={0,2}$/.test(body.photo)
      )) fail(400, 'Chỉ nhận ảnh JPEG đã nén cho chat demo.');
      if (entry.chatStaffId !== booking.staff_id) {
        entry.chatStaffId = booking.staff_id;
        entry.messages = [];
      }
      entry.messages ||= [];
      if (entry.messages.length >= 100) fail(409, 'Đã đạt giới hạn 100 tin nhắn demo cho đơn này.');
      if (body.photo && entry.messages.filter(message => message.photo).length >= 10) fail(409, 'Đã đạt giới hạn 10 ảnh chat cho đơn này.');
      entry.messages.push({ role: user.role, text: content, ...(body.photo && { photo: body.photo }), at: new Date() });
    },
    location(user, booking, entry, body) {
      if (user.role !== 'staff') fail(403, 'Chỉ nhân viên phụ trách có thể chia sẻ vị trí.');
      if (!chatStatuses.includes(booking.status)) fail(409, 'Đơn đang không nhận cập nhật vị trí.');
      const { latitude, longitude } = body;
      if (!Number.isFinite(latitude) || Math.abs(latitude) > 90 || !Number.isFinite(longitude) || Math.abs(longitude) > 180) {
        fail(400, 'Tọa độ không hợp lệ.');
      }
      const sampleDestination = booking.latitude == null || booking.longitude == null;
      const lat = sampleDestination ? 21.0285 : Number(booking.latitude);
      const lng = sampleDestination ? 105.8542 : Number(booking.longitude);
      const etaMinutes = Math.ceil(distanceKm(latitude, longitude, lat, lng) * 3);
      entry.location = { staffId: user.id, latitude, longitude, etaMinutes, sampleDestination, at: new Date() };
    },
    stopLocation(user, booking, entry) {
      if (user.role !== 'staff') fail(403, 'Chỉ nhân viên phụ trách có thể dừng chia sẻ vị trí.');
      delete entry.location;
    },
    signature(user, booking, entry, body) {
      if (user.role !== 'staff') fail(403, 'Chỉ nhân viên phụ trách có thể lưu nghiệm thu.');
      if (!['in_progress', 'completed'].includes(booking.status) || entry.signature) fail(409, 'Không thể lưu nghiệm thu ở trạng thái này.');
      const strokes = body.strokes;
      if (!Array.isArray(strokes) || strokes.length < 1 || strokes.length > 30 ||
        strokes.some(line => !Array.isArray(line) || line.length < 2 || line.length > 500 ||
          line.some(point => !Array.isArray(point) || point.length !== 2 || point.some(v => !Number.isFinite(v) || v < 0 || v > 1)))) {
        fail(400, 'Chữ ký vẽ không hợp lệ.');
      }
      entry.signature = { strokes, at: new Date() };
    },
    dispute(user, booking, entry, body) {
      if (user.role !== 'customer') fail(403, 'Chỉ khách hàng có thể gửi khiếu nại.');
      if (!['confirmed', 'arrived', 'in_progress', 'completed', 'cancelled'].includes(booking.status) || entry.dispute) {
        fail(409, 'Đơn chưa đủ điều kiện hoặc đã có khiếu nại.');
      }
      const completedAt = booking.completed_at || booking.wage_settled_at || booking.paid_at || booking.created_at;
      if (booking.status === 'completed' && Date.now() - new Date(completedAt).getTime() > 48 * 3600000) {
        fail(409, 'Đã hết hạn gửi khiếu nại sau 48 giờ.');
      }
      const evidence = body.evidence;
      if (typeof evidence !== 'string' || evidence.length > 1400000 ||
        !/^data:(?:image\/(?:jpeg|png)|video\/(?:mp4|webm));base64,[A-Za-z0-9+/]+={0,2}$/.test(evidence)) {
        fail(400, 'Cần đính kèm ảnh JPEG/PNG hoặc video MP4/WebM tối đa 1 MB.');
      }
      const [header, encoded] = evidence.split(',');
      const bytes = Buffer.from(encoded, 'base64');
      const valid = header.includes('image/jpeg') ? bytes.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
        : header.includes('image/png') ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : header.includes('video/mp4') ? bytes.toString('ascii', 4, 8) === 'ftyp'
        : bytes.subarray(0, 4).equals(Buffer.from([26, 69, 223, 163]));
      if (bytes.length > 1000000 || !valid) fail(400, 'Định dạng hoặc dung lượng bằng chứng không hợp lệ.');
      entry.dispute = { status: 'open', reason: text(body.reason, 500), evidence, openedAt: new Date() };
    },
    statement(user, booking, entry, body) {
      if (user.role !== 'staff') fail(403, 'Chỉ nhân viên phụ trách có thể gửi bản tường trình.');
      if (entry.dispute?.status !== 'open') fail(409, 'Khiếu nại không còn mở.');
      entry.dispute.statement = text(body.statement, 1000);
    },
    verdict(user, booking, entry, body) {
      if (user.role !== 'admin') fail(403, 'Chỉ quản trị viên có thể ra phán quyết.');
      const dispute = entry.dispute;
      if (dispute?.status !== 'open') fail(409, 'Không có khiếu nại đang mở.');
      const note = text(body.note, 500);
      if (!['dismissed', 'staff_fault'].includes(body.decision)) fail(400, 'Phán quyết không hợp lệ.');
      if (body.decision === 'dismissed') {
        dispute.status = 'resolved';
        try {
          if (booking.status === 'completed' && booking.wage_status !== 'paid') operations.settle({ bookingId: booking.id });
        } catch (err) {
          dispute.status = 'open';
          throw err;
        }
        Object.assign(dispute, { decision: 'dismissed', note });
        return;
      }
      const amount = body.amount;
      if (!Number.isSafeInteger(amount) || amount <= 0) fail(400, 'Thiệt hại phải là số VND nguyên dương.');
      if (!booking.staff_id) fail(409, 'Đơn chưa có nhân viên để xử lý trách nhiệm.');
      if (amount > 50000000) {
        Object.assign(dispute, { decision: 'manual_review', note, amount });
        return;
      }
      const large = amount >= 500000;
      const compensation = operations.compensate(booking, amount, large);
      if (!large) trust.set(booking.staff_id, Math.max(0, (trust.get(booking.staff_id) ?? 100) - 10));
      Object.assign(dispute, { status: 'resolved', decision: large ? 'insurance' : 'staff_fault',
        note, amount, ...compensation });
    },
    resolve(user, booking, entry, body) {
      if (user.role !== 'admin') fail(403, 'Chỉ quản trị viên có thể xử lý khiếu nại.');
      if (entry.dispute?.status !== 'open') fail(409, 'Không có khiếu nại đang mở.');
      const note = text(body.note, 500);
      const amount = body.amount;
      const available = entry.payment ? entry.payment.amount - entry.payment.refunded : 0;
      if (!Number.isSafeInteger(amount) || amount < 0 || amount > available) fail(400, 'Số tiền hoàn vượt số tiền đã thanh toán demo.');
      if (amount > 0) {
        entry.payment.refunded += amount;
        if (entry.payment.refunded === entry.payment.amount) booking.payment_status = 'refunded';
      }
      Object.assign(entry.dispute, { status: 'resolved', note, amount });
    },
    dispatch(user, booking, entry) {
      if (user.role !== 'admin') fail(403, 'Chỉ quản trị viên có thể mở phân ca.');
      if (booking.status !== 'pending' || booking.staff_id != null || entry.dispatch || entry.prebook) fail(409, 'Đơn chưa đủ điều kiện phân ca.');
      entry.dispatch = buildDispatch(booking);
    },
    redispatch(user, booking, entry) {
      if (user.role !== 'customer') fail(403, 'Chỉ khách hàng có thể đổi phương án phân ca.');
      if (booking.status !== 'pending' || prebookState(entry.prebook)?.status !== 'declined') fail(409, 'Đơn chưa đủ điều kiện phân ca lại.');
      const dispatch = buildDispatch(booking, null, true);
      if (!dispatch.candidates.length) fail(409, 'Chưa có nhân viên đang rảnh để điều phối.');
      delete entry.prebook;
      delete entry.requestedStaffId;
      entry.dispatch = dispatch;
    },
    reselect(user, booking, entry, body) {
      if (user.role !== 'customer') fail(403, 'Chỉ khách hàng có thể chọn lại nhân viên.');
      if (booking.status !== 'pending' || prebookState(entry.prebook)?.status !== 'declined') fail(409, 'Đơn chưa đủ điều kiện chọn lại nhân viên.');
      validateStaffChoice(body.staffId);
      if (body.staffId === entry.prebook.staffId) fail(400, 'Hãy chọn nhân viên khác.');
      if (isStaffBusy(body.staffId)) fail(409, 'Nhân viên được chọn đang có ca dọn khác.');
      entry.requestedStaffId = body.staffId;
      entry.prebook = { status: 'waiting', staffId: body.staffId, expiresAt: Date.now() + 30 * 60000 };
    }
  };
  function update(user, id, action, body) {
    const booking = bookingFor(user, id);
    const entry = records.get(booking.id) || {};
    if (!Object.hasOwn(actions, action)) fail(404, 'Thao tác demo không tồn tại.');
    const previousDispatch = entry.dispatch;
    const previousStaff = entry.prebook?.staffId;
    actions[action](user, booking, entry, body);
    records.set(booking.id, entry);
    const invited = previousDispatch !== entry.dispatch ? entry.dispatch.candidates.map(worker => worker.id) : [];
    return [booking.user_id, booking.staff_id, ...invited, previousStaff !== entry.prebook?.staffId ? entry.prebook?.staffId : null];
  }
  function enforceDispatch(bookingId, staffId) {
    const reservation = records.get(bookingId)?.prebook;
    if (reservation && (reservation.staffId !== staffId || reservation.status !== 'approved' || isStaffBusy(staffId))) {
      fail(409, 'Ca đặt trước đang chờ xác nhận hoặc chờ nhân viên hoàn thành ca hiện tại.');
    }
    const dispatch = records.get(bookingId)?.dispatch;
    if (dispatch && !dispatch.candidates.some(worker => worker.id === staffId)) fail(409, 'Ca chưa mở cho nhân viên này.');
    if (dispatch?.priorityIds.length && dispatch.until > Date.now() && !dispatch.priorityIds.includes(staffId)) {
      fail(409, 'Đơn đang trong 5 phút ưu tiên cho nhân viên quen hoặc ở gần.');
    }
  }
  function decidePrebook(user, id, decision, reason) {
    const booking = data.bookings.find(row => row.id === Number(id));
    const prebook = records.get(Number(id))?.prebook;
    if (user.role !== 'staff' || prebook?.staffId !== user.id) fail(403, 'Bạn không được xử lý lịch đặt trước này.');
    if (booking?.status !== 'pending' || !['waiting', 'approved'].includes(prebookState(prebook).status)) fail(409, 'Lịch đặt trước đã được xử lý.');
    if (decision === 'decline') {
      const value = text(reason, 500);
      if (value.length < 5) fail(400, 'Lý do từ chối phải dài ít nhất 5 ký tự.');
      Object.assign(prebook, { status: 'declined', reason: value });
      data.bookingNotifications.push({
        id: data.bookingNotifications.length + 1, user_id: booking.user_id, booking_id: booking.id,
        notification_type: 'staff_declined_prebook', title: 'Nhân viên từ chối lịch đặt trước',
        message: value, is_read: false, created_at: new Date()
      });
    } else if (decision === 'approve') {
      prebook.status = 'approved';
    } else fail(400, 'Quyết định không hợp lệ.');
    return booking;
  }
  function prebookState(reservation) {
    if (reservation?.status === 'waiting' && reservation.expiresAt <= Date.now()) {
      return { ...reservation, status: 'declined', reason: 'Nhân viên chưa phản hồi trong 30 phút.' };
    }
    return reservation;
  }
  function nextApproved(staffId) {
    if (isStaffBusy(staffId)) return null;
    return data.bookings.find(row => {
      const prebook = records.get(row.id)?.prebook;
      return row.status === 'pending' && prebook?.staffId === staffId && prebook.status === 'approved';
    }) || null;
  }
  function markPrebookConfirmed(id) {
    const prebook = records.get(id)?.prebook;
    if (prebook?.status !== 'approved') return false;
    prebook.status = 'confirmed';
    return true;
  }
  function hasPendingPrebook(booking) {
    return booking.status === 'pending' && Boolean(records.get(booking.id)?.prebook);
  }
  function enforceSettlement(bookingId) {
    if (records.get(bookingId)?.dispute?.status === 'open') fail(409, 'Đang tạm giữ quyết toán vì có khiếu nại mở.');
  }
  function settlementHeld(bookingId) {
    return records.get(bookingId)?.dispute?.status === 'open';
  }
  function markCompletion(id) {
    const booking = data.bookings.find(item => item.id === id);
    if (booking?.status === 'completed') booking.completed_at = new Date();
  }
  function requiresSignature(booking) {
    const service = data.services.find(item => item.id === booking.service_id);
    return ['ve-sinh-sau-xay-dung', 'cham-soc-nguoi-cao-tuoi', 'cham-soc-nguoi-benh'].includes(service?.slug);
  }
  function enforceCompletionSignature(booking) {
    if (requiresSignature(booking) && !records.get(booking.id)?.signature) {
      throw Object.assign(new Error('Cần chữ ký nghiệm thu trước khi hoàn thành ca.'), {
        statusCode: 409, code: 'DEMO_SIGNATURE_REQUIRED'
      });
    }
  }
  const identities = [{ id: 1, name: 'Nguyễn Minh (hồ sơ mẫu)', document: 'DEMO-0001', status: 'pending' }];
  function identity(user, decision) {
    if (user.role !== 'admin') fail(403, 'Chỉ quản trị viên có thể xác minh hồ sơ mẫu.');
    const profile = identities[0];
    if (decision === undefined) return identities;
    if (!['scan', 'sign', 'verified', 'rejected'].includes(decision)) fail(400, 'Thao tác xác minh không hợp lệ.');
    if (profile.status !== 'pending') fail(409, 'Hồ sơ mẫu đã được xử lý.');
    if (decision === 'scan') {
      profile.extracted ||= { name: profile.name, document: profile.document };
      return identities;
    }
    if (decision === 'sign') {
      if (!profile.extracted) fail(409, 'Cần mô phỏng trích xuất giấy tờ trước khi ký.');
      profile.signedAt ||= new Date();
      return identities;
    }
    if (decision === 'verified' && !profile.signedAt) fail(409, 'Cần ký hợp đồng mẫu trước khi xác minh.');
    profile.status = decision;
    return identities;
  }
  function finance({ from, to, daily = false }) {
    const formatDate = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short' });
    const groups = new Map();
    if (!daily) groups.set('', {});
    for (const booking of data.bookings) {
      const created = new Date(booking.created_at);
      if ((from && created < from) || (to && created > to)) continue;
      const date = daily ? formatDate.format(created) : '';
      const total = Number(booking.total_price) || 0;
      const payment = records.get(booking.id)?.payment;
      const gross = payment?.amount ?? (['paid', 'refunded'].includes(booking.payment_status) ? total : 0);
      const refunds = payment?.refunded ?? (booking.payment_status === 'refunded' ? total : 0);
      const wages = booking.status === 'completed' || booking.wage_status === 'paid';
      const values = {
        total_bookings: 1, booking_count: 1, gross_booking_value: total,
        gross_payments: gross, refunds,
        cash_payments: booking.payment_method === 'cash' ? gross : 0,
        online_payments: booking.payment_method !== 'cash' ? gross : 0,
        paid_count: Number(booking.payment_status === 'paid'),
        paid_bookings_count: Number(booking.payment_status === 'paid'),
        cancelled_count: Number(booking.status === 'cancelled'),
        cancelled_bookings_count: Number(booking.status === 'cancelled'),
        completed_bookings_count: Number(booking.status === 'completed'),
        pending_bookings: Number(booking.status === 'pending'),
        in_progress_bookings: Number(booking.status === 'in_progress'),
        staff_gross_wages: wages ? Number(booking.staff_wage) || 0 : 0,
        platform_commission: wages ? Number(booking.platform_commission) || 0 : 0,
        staff_net_wages: wages ? Number(booking.staff_net_wage) || 0 : 0,
        staff_payable: booking.status === 'completed' && ['pending', 'approved'].includes(booking.wage_status)
          ? Number(booking.staff_net_wage) || 0 : 0,
        staff_settled: booking.wage_status === 'paid' ? Number(booking.staff_net_wage) || 0 : 0
      };
      const row = groups.get(date) || { date };
      for (const [name, value] of Object.entries(values)) row[name] = (row[name] || 0) + value;
      groups.set(date, row);
    }
    return [...groups.keys()].sort().map(date => groups.get(date));
  }
  return { dashboard, update, repeatInput, selectFavorite, enforceDispatch, enforceSettlement, identity, finance,
    directory, saveStaff, faceCheck, validateStaffChoice, setStaffChoice, bookingStaff,
    membership, enforceCompletionSignature, isStaffBusy, decidePrebook, nextApproved, markPrebookConfirmed, hasPendingPrebook,
    settlementHeld, markCompletion };
};
