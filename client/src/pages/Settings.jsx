import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getUserSettings, updateUserSettings, updateProfile, changePassword } from '../api/dietApi';

const STORAGE_KEYS_NON_AUTH = ['diet_app_theme', 'latestDietResult', 'dietUserId', 'water_log', 'weight_log'];

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user, setUser } = useAuth();
  
  const [remindersEnabled, setRemindersEnabled] = useState(false);
  const [waterRemindersEnabled, setWaterRemindersEnabled] = useState(false);
  const [weeklyReportEnabled, setWeeklyReportEnabled] = useState(false);
  const [times, setTimes] = useState({
    breakfast_time: '08:00',
    lunch_time: '13:00',
    dinner_time: '20:00',
    water_start_time: '08:00',
    water_end_time: '22:00',
    water_interval: '2',
  });
  
  // Profile state
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  
  // Password state
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [settingsError, setSettingsError] = useState('');
  const [settingsSaved, setSettingsSaved] = useState('');
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    setLoadingSettings(true);
    getUserSettings()
      .then((res) => {
        if (res?.success && res.data) {
          setRemindersEnabled(Boolean(res.data.reminders_enabled));
          setWaterRemindersEnabled(Boolean(res.data.water_reminders_enabled));
          setTimes({
            breakfast_time: res.data.breakfast_time || '08:00',
            lunch_time: res.data.lunch_time || '13:00',
            dinner_time: res.data.dinner_time || '20:00',
            water_start_time: res.data.water_reminder_start_time || '08:00',
            water_end_time: res.data.water_reminder_end_time || '22:00',
            water_interval: String(res.data.water_reminder_interval_hours || '2'),
          });
          setWeeklyReportEnabled(Boolean(res.data.weekly_report_enabled));
        }
      })
      .catch((err) => {
        setSettingsError(err?.error?.message ?? 'Failed to load reminder settings.');
      })
      .finally(() => setLoadingSettings(false));
  }, []);

  const handleClearData = () => {
    if (!window.confirm('Clear local app data (saved plan, water log, weight log)? You will stay logged in.')) return;
    STORAGE_KEYS_NON_AUTH.forEach((k) => localStorage.removeItem(k));
    try {
      sessionStorage.removeItem('latestDietResult');
      sessionStorage.removeItem('dietUserId');
    } catch (_) {}
    setTheme(theme);
    window.alert('App data cleared. You are still logged in.');
  };

  const handleExportData = async () => {
    setSavingSettings(true);
    try {
      // Fetch data from API for a reliable export
      const [historyRes, complianceRes] = await Promise.all([
        getHistory({ limit: 1000 }),
        getCompliance({ limit: 1000 })
      ]);

      const weightLog = historyRes?.data || [];
      const complianceLog = complianceRes?.data || [];
      
      if (weightLog.length === 0 && complianceLog.length === 0) {
        setSettingsError('No health data found to export.');
        return;
      }

      let csvRows = ["Type,Date,Value,Status/Notes"];
      
      weightLog.forEach(row => {
        csvRows.push(`Weight,${row.date},${row.weight} kg,"${(row.notes || '').replace(/"/g, '""')}"`);
      });
      
      complianceLog.forEach(row => {
        const status = row.meals ? `Compliant: ${row.meals.filter(m => m.compliant).length}/${row.meals.length}` : 'Logged';
        csvRows.push(`Compliance,${row.log_date},${status},""`);
      });
      
      const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `diet_app_health_data_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSettingsSaved('Data exported successfully.');
    } catch (err) {
      setSettingsError('Failed to export data: ' + (err?.error?.message ?? err.message));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTimeChange = (key, value) => {
    setTimes((prev) => ({ ...prev, [key]: value }));
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSaved('');
    setSavingProfile(true);
    try {
      const res = await updateProfile({ name });
      if (res?.success) {
        setUser({ ...user, name });
        setSettingsSaved('Profile updated successfully.');
        setIsEditingProfile(false);
      } else {
        setSettingsError(res?.error?.message ?? 'Failed to update profile.');
      }
    } catch (err) {
      setSettingsError(err?.error?.message ?? 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setSettingsError('New passwords do not match.');
      return;
    }
    setSettingsError('');
    setSettingsSaved('');
    setSavingProfile(true);
    try {
      const res = await changePassword(currentPassword, newPassword);
      if (res?.success) {
        setSettingsSaved('Password changed successfully.');
        setShowPasswordChange(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        setSettingsError(res?.error?.message ?? 'Failed to change password.');
      }
    } catch (err) {
      setSettingsError(err?.error?.message ?? 'Failed to change password.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveReminders = async () => {
    setSettingsError('');
    setSettingsSaved('');
    setSavingSettings(true);
    try {
      const res = await updateUserSettings({
        breakfast_time: times.breakfast_time,
        lunch_time: times.lunch_time,
        dinner_time: times.dinner_time,
        water_reminder_start_time: times.water_start_time,
        water_reminder_end_time: times.water_end_time,
        water_reminder_interval_hours: parseInt(times.water_interval, 10),
        reminders_enabled: remindersEnabled,
        water_reminders_enabled: waterRemindersEnabled,
        weekly_report_enabled: weeklyReportEnabled,
      });
      if (res?.success) {
        setSettingsSaved('Reminder settings saved.');
      } else {
        setSettingsError(res?.error?.message ?? 'Failed to save reminder settings.');
      }
    } catch (err) {
      setSettingsError(err?.error?.message ?? 'Failed to save reminder settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  return (
    <div className="font-display">
      <div className="w-full max-w-3xl mx-auto px-8 py-8 space-y-8">
        <div className="mb-8">
          <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight">Settings</h1>
          <p className="text-slate-500 mt-1 font-medium">Manage your health journey and account preferences.</p>
        </div>

        <div className="space-y-6">
          {/* Account Section */}
          <section className="bg-white dark:bg-slate-800/40 border border-primary/10 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-primary/5 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50">
              <span className="material-symbols-outlined text-primary">person</span>
              <h2 className="font-bold text-slate-800 dark:text-slate-200">Account</h2>
            </div>
            <div className="p-6 space-y-4">
              {isEditingProfile ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Display Name</label>
                    <input 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-primary/10 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 dark:text-slate-100 focus:ring-4 focus:ring-primary/10 transition-all outline-none"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg" disabled={savingProfile}>
                      {savingProfile ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => setIsEditingProfile(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs font-bold rounded-lg">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className="size-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center text-primary">
                      <span className="text-xl font-black">{user?.name?.[0]?.toUpperCase() || 'U'}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{user?.name || 'User'}</p>
                      <p className="text-sm text-slate-500">{user?.email}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsEditingProfile(true)} className="material-symbols-outlined text-slate-400 hover:text-primary transition-colors cursor-pointer">edit</button>
                </div>
              )}

              <hr className="border-primary/5" />

              {showPasswordChange ? (
                <form onSubmit={handleChangePassword} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Current Password</label>
                      <input 
                        type="password"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-primary/10 rounded-xl px-4 py-2 text-sm outline-none"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">New Password</label>
                      <input 
                        type="password"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-primary/10 rounded-xl px-4 py-2 text-sm outline-none"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Confirm New Password</label>
                      <input 
                        type="password"
                        className="w-full bg-slate-50 dark:bg-slate-900 border border-primary/10 rounded-xl px-4 py-2 text-sm outline-none"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button type="submit" className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg" disabled={savingProfile}>
                      Update Password
                    </button>
                    <button type="button" onClick={() => setShowPasswordChange(false)} className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-500 text-xs font-bold rounded-lg">
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex items-center justify-between cursor-pointer group" onClick={() => setShowPasswordChange(true)}>
                  <div>
                    <p className="font-medium text-slate-900 dark:text-slate-100">Change Password</p>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Protect your account</p>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 group-hover:text-primary transition-colors">chevron_right</span>
                </div>
              )}
            </div>
          </section>

          {/* Notifications Section */}
          <section className="bg-white dark:bg-slate-800/40 border border-primary/10 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-primary/5 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">notifications_active</span>
                <h2 className="font-bold text-slate-800 dark:text-slate-200">Notifications</h2>
              </div>
              <button 
                onClick={handleSaveReminders}
                disabled={savingSettings}
                className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline disabled:opacity-50"
              >
                {savingSettings ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Meal Reminders</p>
                  <p className="text-xs text-slate-500">Get alerted when it's time for your planned meals.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={remindersEnabled} onChange={(e) => setRemindersEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {remindersEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Breakfast</label>
                    <input 
                      type="time" 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-primary/10 rounded-xl px-4 py-2 text-sm font-bold text-primary outline-none"
                      value={times.breakfast_time}
                      onChange={(e) => handleTimeChange('breakfast_time', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Lunch</label>
                    <input 
                      type="time" 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-primary/10 rounded-xl px-4 py-2 text-sm font-bold text-primary outline-none"
                      value={times.lunch_time}
                      onChange={(e) => handleTimeChange('lunch_time', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Dinner</label>
                    <input 
                      type="time" 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-primary/10 rounded-xl px-4 py-2 text-sm font-bold text-primary outline-none"
                      value={times.dinner_time}
                      onChange={(e) => handleTimeChange('dinner_time', e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Water Reminders</p>
                  <p className="text-xs text-slate-500">Nudges to keep you hydrated throughout the day.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={waterRemindersEnabled} onChange={(e) => setWaterRemindersEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>

              {waterRemindersEnabled && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 pb-4 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Start Time</label>
                    <input 
                      type="time" 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-primary/10 rounded-xl px-4 py-2 text-sm font-bold text-primary outline-none"
                      value={times.water_start_time}
                      onChange={(e) => handleTimeChange('water_start_time', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">End Time</label>
                    <input 
                      type="time" 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-primary/10 rounded-xl px-4 py-2 text-sm font-bold text-primary outline-none"
                      value={times.water_end_time}
                      onChange={(e) => handleTimeChange('water_end_time', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Every (Hours)</label>
                    <select 
                      className="w-full bg-slate-50 dark:bg-slate-900 border border-primary/10 rounded-xl px-4 py-2 text-sm font-bold text-primary outline-none appearance-none cursor-pointer"
                      value={times.water_interval}
                      onChange={(e) => handleTimeChange('water_interval', e.target.value)}
                    >
                      {[1, 2, 3, 4, 5, 6].map((h) => (
                        <option key={h} value={h}>{h} {h === 1 ? 'Hour' : 'Hours'}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Weekly Progress Report</p>
                  <p className="text-xs text-slate-500">Summary of your activity and nutrition every Monday.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={weeklyReportEnabled} onChange={(e) => setWeeklyReportEnabled(e.target.checked)} />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </section>

          {/* Data Management Section */}
          <section className="bg-white dark:bg-slate-800/40 border border-primary/10 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-6 py-4 border-b border-primary/5 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/50">
              <span className="material-symbols-outlined text-primary">data_usage</span>
              <h2 className="font-bold text-slate-800 dark:text-slate-200">Data Management</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Export Health Data</p>
                  <p className="text-xs text-slate-500">Download your history in CSV or JSON format.</p>
                </div>
                <button 
                  onClick={handleExportData}
                  className="px-4 py-2 border border-primary/30 text-primary font-bold text-xs rounded-xl hover:bg-primary/5 transition-colors"
                >
                  Export
                </button>
              </div>
              <hr className="border-primary/5" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900 dark:text-slate-100">Clear Cache</p>
                  <p className="text-xs text-slate-500">Free up space by removing temporary files.</p>
                </div>
                <button onClick={handleClearData} className="px-4 py-2 text-slate-500 font-bold text-xs rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">Clear</button>
              </div>
              <hr className="border-primary/5" />
              <div className="bg-red-50 dark:bg-red-950/20 p-5 rounded-2xl flex items-center justify-between mt-4 border border-red-100 dark:border-red-900/30">
                <div>
                  <p className="font-bold text-red-600 dark:text-red-400">Delete Account</p>
                  <p className="text-[10px] font-bold text-red-500 dark:text-red-500/80 uppercase tracking-tight">Permanently remove all your data.</p>
                </div>
                <button className="px-5 py-2.5 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all shadow-lg shadow-red-600/20">Delete</button>
              </div>
            </div>
          </section>
        </div>

        {settingsError && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/30 text-center animate-in zoom-in duration-300">
            <p className="text-xs font-bold text-red-600 dark:text-red-400">{settingsError}</p>
          </div>
        )}
        {settingsSaved && !settingsError && (
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 text-center animate-in zoom-in duration-300">
            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{settingsSaved}</p>
          </div>
        )}

      </div>
    </div>
  );
}
