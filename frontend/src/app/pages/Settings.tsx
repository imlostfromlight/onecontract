import { useState } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuth } from '../hooks/useAuth';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

export function Settings() {
  const { user, token, setAuth } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [profileMsg, setProfileMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [passMsg, setPassMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [passLoading, setPassLoading] = useState(false);

  const inputClass =
    'w-full bg-white border border-[#A6C5D7] px-4 py-3 rounded-xl text-sm text-[#0D1B2A] placeholder-[#A6C5D7] focus:outline-none focus:ring-2 focus:ring-[#0F52BA]/30 focus:border-[#0F52BA] transition-colors';

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg(null);
    try {
      const res = await fetch(`${API_BASE}/api/auth/profile/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ first_name: firstName, last_name: lastName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка');
      setAuth({ token: token!, user: data });
      setProfileMsg({ text: 'Имя обновлено', ok: true });
    } catch (err: any) {
      setProfileMsg({ text: err.message, ok: false });
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);
    if (newPassword !== newPassword2) {
      setPassMsg({ text: 'Пароли не совпадают', ok: false });
      return;
    }
    setPassLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/change-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка');
      if (data.token) setAuth({ token: data.token, user: user! });
      setPassMsg({ text: 'Пароль изменён', ok: true });
      setOldPassword('');
      setNewPassword('');
      setNewPassword2('');
    } catch (err: any) {
      setPassMsg({ text: err.message, ok: false });
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-xl space-y-8">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Настройки</h2>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>

        {/* Profile */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-5">Имя</h3>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">Имя</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className={inputClass} placeholder="Имя" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">Фамилия</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} className={inputClass} placeholder="Фамилия" />
            </div>
            {profileMsg && (
              <div className={`px-4 py-3 rounded-xl text-sm border ${profileMsg.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {profileMsg.text}
              </div>
            )}
            <button
              type="submit"
              disabled={profileLoading}
              className="bg-[#0F52BA] hover:bg-[#0a3d8f] disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              {profileLoading ? 'Сохранение...' : 'Сохранить'}
            </button>
          </form>
        </div>

        {/* Password */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-base font-semibold text-gray-900 mb-5">Изменить пароль</h3>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">Текущий пароль</label>
              <input value={oldPassword} onChange={e => setOldPassword(e.target.value)} className={inputClass} type="password" placeholder="••••••••" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">Новый пароль</label>
              <input value={newPassword} onChange={e => setNewPassword(e.target.value)} className={inputClass} type="password" placeholder="••••••••" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">Повторите новый пароль</label>
              <input value={newPassword2} onChange={e => setNewPassword2(e.target.value)} className={inputClass} type="password" placeholder="••••••••" required />
            </div>
            {passMsg && (
              <div className={`px-4 py-3 rounded-xl text-sm border ${passMsg.ok ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                {passMsg.text}
              </div>
            )}
            <button
              type="submit"
              disabled={passLoading}
              className="bg-[#0F52BA] hover:bg-[#0a3d8f] disabled:opacity-60 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-colors"
            >
              {passLoading ? 'Сохранение...' : 'Изменить пароль'}
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
