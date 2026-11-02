(() => {
  'use strict';
  const make = (tag, text) => {
    const node = document.createElement(tag);
    if (text) node.textContent = text;
    return node;
  };
  window.DabCleanStaffJobs = {
    create({ api, onAccepted, onCancelled }) {
      const section = make('section');
      section.className = 'card';
      section.style.marginBottom = '24px';
      section.setAttribute('aria-label', 'Đơn chờ nhận');
      const title = make('h2', 'Đơn chờ nhận');
      const hint = make('p', 'Đơn khách vừa đặt sẽ xuất hiện ở đây. Nhận ca theo điều kiện ví và chiết khấu hiện hành; bản đồ mở sau khi nhận thành công.');
      const list = make('div');
      section.append(title, hint, list);
      document.getElementById('tasks-container').before(section);
      let sequence = 0;
      async function refresh() {
        const current = ++sequence;
        try {
          const result = await api.getAvailableBookings();
          if (current !== sequence) return;
          if (!result?.success || !Array.isArray(result.data)) throw new Error(result?.message || 'Không tải được đơn chờ nhận.');
          // Assigned work already appears in My Tasks. Do not mix completed/other work into this list.
          const bookings = result.data.filter(b => b.status === 'pending' && b.staff_id == null);
          list.replaceChildren();
          if (!bookings.length) list.append(make('p', 'Chưa có đơn mới chờ nhận.'));
          for (const booking of bookings) {
            const card = make('article');
            card.className = 'task-card';
            card.append(make('h3', '#' + booking.booking_code + ' · ' + (booking.service_name || 'Dịch vụ vệ sinh')));
            card.append(make('p', `${String(booking.booking_date || '').slice(0, 10)} · ${String(booking.booking_time || '').slice(0, 5)}`));
            card.append(make('p', 'Địa chỉ: ' + (booking.address || 'Chưa có địa chỉ')));
            const commission = Math.round(Number(booking.platform_commission) || Number(booking.staff_wage || 0) * 0.20 || Number(booking.total_price || 0) * 0.20);
            const accept = make('button', `Nhận ca (chiết khấu: ${commission.toLocaleString('vi-VN')} đ)`);
            accept.type = 'button';
            accept.className = 'btn btn-primary';
            const error = make('p');
            error.setAttribute('role', 'status');
            accept.addEventListener('click', async () => {
              if (accept.disabled) return;
              accept.disabled = true;
              error.textContent = 'Đang xử lý nhận ca…';
              try {
                const response = await api.acceptBooking(booking.id);
                if (!response?.success) throw new Error(response?.message || 'Không thể nhận ca.');
                error.textContent = response.message || '';
                await onAccepted(response);
              } catch (err) {
                error.textContent = err.message || 'Không thể nhận ca. Vui lòng thử lại.';
              } finally { accept.disabled = false; }
            });
            card.append(accept, error);
            list.append(card);
          }
        } catch (err) {
          if (current !== sequence) return;
          list.replaceChildren(make('p', 'Không tải được đơn chờ nhận: ' + err.message));
        }
      }

      // Native prompt is unavailable in some embedded browsers. Use an accessible form instead.
      const dialog = make('dialog');
      dialog.className = 'staff-navigation';
      dialog.setAttribute('aria-label', 'Hủy công việc');
      document.body.append(dialog);
      let submitting = false;
      const close = () => { if (!submitting) { dialog.close(); dialog.replaceChildren(); } };
      dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
      document.addEventListener('click', event => {
        const trigger = event.target.closest('.btn-cancel-task');
        if (!trigger || dialog.open || !/^\d+$/.test(trigger.dataset.id)) return;
        const id = Number(trigger.dataset.id);
        const form = make('form');
        const heading = make('h2', 'Hủy công việc');
        const label = make('label', 'Lý do hủy (bắt buộc, từ 5 đến 500 ký tự)');
        const reason = make('textarea');
        reason.id = 'staff-cancel-reason';
        reason.className = 'form-control';
        reason.required = true;
        reason.minLength = 5;
        reason.maxLength = 500;
        reason.rows = 4;
        label.htmlFor = reason.id;
        const status = make('p');
        status.setAttribute('role', 'status');
        const back = make('button', 'Quay lại');
        back.type = 'button';
        back.className = 'btn btn-secondary';
        back.addEventListener('click', close);
        const submit = make('button', 'Xác nhận hủy công việc');
        submit.type = 'submit';
        submit.className = 'btn btn-danger';
        form.append(heading, label, reason, status, back, submit);
        form.addEventListener('submit', async event => {
          event.preventDefault();
          if (submitting) return;
          const text = reason.value.trim();
          if (text.length < 5 || text.length > 500) {
            status.textContent = 'Vui lòng nhập lý do từ 5 đến 500 ký tự.';
            return;
          }
          submitting = true;
          submit.disabled = back.disabled = true;
          status.textContent = 'Đang gửi yêu cầu hủy…';
          try {
            const result = await api.updateTaskStatus(id, 'cancelled', '', text);
            if (!result?.success) throw new Error(result?.message || 'Không thể hủy công việc.');
            submitting = false;
            close();
            await onCancelled();
          } catch (err) { status.textContent = err.message || 'Không thể hủy công việc.'; }
          finally { submitting = false; submit.disabled = back.disabled = false; }
        });
        dialog.replaceChildren(form);
        dialog.showModal();
        reason.focus();
      });
      return { refresh };
    }
  };
})();
