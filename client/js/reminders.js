/**
 * VaxaGuard Reminders & Notification Center Logic
 * Fetches real in-app alerts, handles preference toggles, and marks notifications as read.
 */

document.addEventListener('DOMContentLoaded', async () => {
  Components.initCommon('reminders');

  // Load current user preferences
  const user = API.getUser();
  if (user && user.preferences) {
    const prefs = user.preferences;
    document.getElementById('pref-email-toggle').checked = prefs.emailNotifications !== false;
    document.getElementById('pref-sms-toggle').checked = !!prefs.smsNotifications;
    if (prefs.reminderTimingDays) {
      document.getElementById('pref-timing-select').value = prefs.reminderTimingDays;
    }
    if (prefs.notes) {
      document.getElementById('pref-notes-input').value = prefs.notes;
    }
  }

  // Preference Form Submit
  const prefForm = document.getElementById('reminder-settings-form');
  if (prefForm) {
    prefForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('pref-email-toggle').checked;
      const sms = document.getElementById('pref-sms-toggle').checked;
      const timing = document.getElementById('pref-timing-select').value;
      const notes = document.getElementById('pref-notes-input').value.trim();
      const saveBtn = document.getElementById('save-pref-btn');

      try {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';

        const res = await API.put('/notifications/preferences', {
          emailNotifications: email,
          smsNotifications: sms,
          reminderTimingDays: timing,
          notes
        });

        // Update local session
        if (user) {
          user.preferences = res.data;
          API.setUser(user);
        }

        Toast.success('Notification preferences updated successfully!');
      } catch (err) {
        Toast.error('Failed to update preferences.');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Save Preferences';
      }
    });
  }

  // Mark all read button
  const markAllBtn = document.getElementById('mark-all-read-btn');
  if (markAllBtn) {
    markAllBtn.addEventListener('click', async () => {
      try {
        await API.put('/notifications/read-all');
        Toast.success('All alerts marked as read.');
        await loadNotifications();
      } catch (err) {
        Toast.error('Failed to update alerts.');
      }
    });
  }

  await loadNotifications();
});

async function loadNotifications() {
  try {
    const res = await API.get('/notifications');
    const notifs = res.data || [];
    const unreadCount = res.unreadCount || 0;

    const pill = document.getElementById('unread-count-pill');
    if (pill) {
      if (unreadCount > 0) {
        pill.textContent = `${unreadCount} Unread`;
        pill.classList.remove('hidden');
      } else {
        pill.classList.add('hidden');
      }
    }

    const container = document.getElementById('notifications-list-container');
    if (!container) return;

    if (notifs.length === 0) {
      container.innerHTML = `
        <div class="p-8 text-center bg-slate-50 rounded-2xl border border-slate-100 space-y-2">
          <i data-lucide="bell-off" class="w-8 h-8 text-slate-300 mx-auto"></i>
          <p class="text-xs font-bold text-slate-700">No active alerts</p>
          <p class="text-[11px] text-slate-400">All immunization reminders have been acknowledged.</p>
        </div>
      `;
      if (window.lucide) lucide.createIcons({ root: container });
      return;
    }

    container.innerHTML = notifs.map(n => {
      const isUnread = !n.readAt;
      const isOverdue = n.type === 'overdue';

      let iconClass = 'bg-sky-100 text-sky-600';
      let iconName = 'bell';

      if (isOverdue) {
        iconClass = 'bg-rose-100 text-rose-600';
        iconName = 'alert-triangle';
      } else if (n.type === 'due_soon') {
        iconClass = 'bg-amber-100 text-amber-600';
        iconName = 'clock';
      }

      const timeAgo = formatTimeAgo(n.sentAt || n.createdAt);

      return `
        <div class="p-4 rounded-2xl border transition-all ${isUnread ? 'bg-sky-50/50 border-sky-100' : 'bg-slate-50/50 border-slate-100'} flex items-start justify-between gap-3">
          <div class="flex items-start gap-3">
            <div class="w-9 h-9 rounded-xl ${iconClass} flex items-center justify-center flex-shrink-0 mt-0.5">
              <i data-lucide="${iconName}" class="w-4 h-4"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="text-xs font-bold text-slate-900">${n.title}</h4>
                ${isUnread ? `<span class="w-2 h-2 rounded-full bg-rose-500"></span>` : ''}
              </div>
              <p class="text-xs text-slate-600 mt-1 leading-snug">${n.message}</p>
              <span class="text-[10px] text-slate-400 mt-1 block">${timeAgo}</span>
            </div>
          </div>

          ${isUnread ? `
            <button onclick="handleMarkSingleRead('${n._id}')" title="Mark as read"
              class="p-1 rounded-lg text-slate-400 hover:text-sky-600 flex-shrink-0 transition-colors">
              <i data-lucide="check" class="w-4 h-4"></i>
            </button>
          ` : ''}
        </div>
      `;
    }).join('');

    if (window.lucide) {
      lucide.createIcons({ root: container });
    }
  } catch (err) {
    console.error('Failed to load notifications:', err);
  }
}

window.handleMarkSingleRead = async function(id) {
  try {
    await API.put(`/notifications/${id}/read`);
    await loadNotifications();
  } catch (err) {
    Toast.error('Could not update notification.');
  }
};

function formatTimeAgo(dateString) {
  if (!dateString) return 'Recently';
  const diff = Date.now() - new Date(dateString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
