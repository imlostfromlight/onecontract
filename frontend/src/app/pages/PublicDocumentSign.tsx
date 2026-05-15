import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Shield, ChevronDown, ChevronUp, Download, CheckCircle, Phone, KeyRound, QrCode, Fingerprint } from 'lucide-react';
import ncalayer from '../lib/ncalayer';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

interface DocumentField { name: string; type: string; }
interface Doc {
  id: number; title: string; file_name: string;
  status: 'DRAFT' | 'CLOSED'; uuid: string; signature_count: number;
  org_signed_at?: string;
  client_fields: Array<DocumentField | string>;
  manager_fields: Record<string, string>;
  client_phone: string;
  signing_methods: string[];
}

type Step = 'fill' | 'method' | 'phone' | 'otp' | 'ecp' | 'egov' | 'done';

const inputClass = 'w-full bg-white border border-[#A6C5D7] px-4 py-3 rounded-xl text-sm text-[#0D1B2A] placeholder-[#A6C5D7] focus:outline-none focus:ring-2 focus:ring-[#0F52BA]/30 focus:border-[#0F52BA] transition-colors';

export function PublicDocumentSign() {
  const { uuid } = useParams();
  const [document, setDocument] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>('fill');

  // Fill step
  const [clientValues, setClientValues] = useState<Record<string, string>>({});
  const [filling, setFilling] = useState(false);
  const [agreed1, setAgreed1] = useState(false);
  const [agreed2, setAgreed2] = useState(false);

  // SMS step
  const [phone, setPhone] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otp, setOtp] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [debugCode, setDebugCode] = useState<string | null>(null);

  // ECP step
  const [ecpLoading, setEcpLoading] = useState(false);

  // eGov QR step
  const [sigexSession, setSigexSession] = useState<{ id: string; qr_image: string; expire_at: number; launch_link?: string } | null>(null);
  const [sigexStatus, setSigexStatus] = useState<'LOADING' | 'WAITING' | 'SIGNED' | 'EXPIRED' | 'ERROR'>('LOADING');
  const sigexPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Preview
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => { if (uuid) fetchDocument(); }, [uuid]);

  const normalizedFields = (document?.client_fields ?? []).map(f =>
    typeof f === 'string' ? { name: f, type: 'text' } : f
  );

  useEffect(() => {
    if (document) {
      if (localStorage.getItem(`signed_${document.uuid}`)) {
        setStep('done');
        return;
      }
      if (normalizedFields.length === 0) setStep('method');
      else {
        const init: Record<string, string> = {};
        normalizedFields.forEach(f => { init[f.name] = ''; });
        setClientValues(init);
        setStep('fill');
      }
    }
  }, [document]);

  // Start Sigex session when entering egov step
  useEffect(() => {
    if (step === 'egov' && !sigexSession) {
      initSigex();
    }
    return () => {
      if (sigexPollRef.current) clearInterval(sigexPollRef.current);
    };
  }, [step]);

  const fetchDocument = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/documents/public/${uuid}/`);
      if (res.ok) setDocument(await res.json());
      else setError('Документ не найден или ссылка устарела.');
    } catch { setError('Не удалось загрузить документ.'); }
    finally { setLoading(false); }
  };

  const handleFillFields = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document) return;
    setFilling(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/documents/public/${uuid}/fill/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: clientValues }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Ошибка');
      const data = await res.json();
      setDocument(data.document);
      setStep('method');
    } catch (e: any) { setError(e.message); }
    finally { setFilling(false); }
  };

  // ── SMS ──────────────────────────────────────────────────────────────────

  const handleVerifyPhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document) return;
    setVerifying(true); setError(null); setDebugCode(null);
    try {
      const res = await fetch(`${API_BASE}/api/documents/public/${document.uuid}/verify-phone/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка');
      if (data.debug_code) setDebugCode(data.debug_code);
      setStep('otp');
    } catch (e: any) { setError(e.message); }
    finally { setVerifying(false); }
  };

  const handleConfirmOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!document) return;
    setConfirming(true); setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/documents/public/${document.uuid}/confirm-otp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, code: otp }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка');
      if (document) localStorage.setItem(`signed_${document.uuid}`, '1');
      setStep('done');
      fetchDocument();
    } catch (e: any) { setError(e.message); }
    finally { setConfirming(false); }
  };

  // ── ECP ──────────────────────────────────────────────────────────────────

  const handleECP = async () => {
    if (!document) return;
    setEcpLoading(true); setError(null);
    try {
      const dataToSign = btoa(document.uuid);
      const signature = await ncalayer.signFile(dataToSign);
      const res = await fetch(`${API_BASE}/api/documents/public/${document.uuid}/sign-ecp/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signed_data: dataToSign, signature_key: signature }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка');
      if (document) localStorage.setItem(`signed_${document.uuid}`, '1');
      setStep('done');
      fetchDocument();
    } catch (e: any) { setError(e.message); }
    finally { setEcpLoading(false); }
  };

  // ── Sigex eGov QR ────────────────────────────────────────────────────────

  const initSigex = async () => {
    if (!document) return;
    setSigexStatus('LOADING');
    try {
      const res = await fetch(`${API_BASE}/api/documents/public/${document.uuid}/sigex-init/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка');
      setSigexSession(data);
      setSigexStatus('WAITING');
      startSigexPolling(data.id);
    } catch (e: any) {
      setSigexStatus('ERROR');
      setError(e.message);
    }
  };

  const startSigexPolling = (sessionId: string) => {
    if (sigexPollRef.current) clearInterval(sigexPollRef.current);
    sigexPollRef.current = setInterval(async () => {
      if (!document) return;
      try {
        const res = await fetch(`${API_BASE}/api/documents/public/${document.uuid}/sigex-status/?session_id=${sessionId}`);
        const data = await res.json();
        if (data.status === 'SIGNED') {
          clearInterval(sigexPollRef.current!);
          await recordEgovSign(data.iin || '');
        } else if (data.status === 'CANCELED') {
          clearInterval(sigexPollRef.current!);
          setSigexStatus('ERROR');
          setError('Подписание отменено в eGov Mobile');
        } else if (data.status === 'EXPIRED' || data.status === 'ERROR') {
          clearInterval(sigexPollRef.current!);
          setSigexStatus(data.status);
        }
      } catch { /* ignore poll errors */ }
    }, 2000);
  };

  const recordEgovSign = async (iin: string) => {
    if (!document) return;
    try {
      const res = await fetch(`${API_BASE}/api/documents/public/${document.uuid}/sign-egov/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ iin }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Ошибка');
      setSigexStatus('SIGNED');
      if (document) localStorage.setItem(`signed_${document.uuid}`, '1');
      setStep('done');
      fetchDocument();
    } catch (e: any) { setError(e.message); }
  };

  const handleMockSigex = async () => {
    if (!sigexSession || !document) return;
    await fetch(`${API_BASE}/api/documents/public/${document.uuid}/sigex-mock-confirm/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session_id: sigexSession.id, iin: '123456789012' }),
    });
  };

  // ─────────────────────────────────────────────────────────────────────────

  const fileUrl = document ? `${API_BASE}/api/documents/public/${document.uuid}/file/` : '';
  const previewUrl = document ? `${API_BASE}/api/documents/public/${document.uuid}/file/?inline=1` : '';
  const isPdf = document?.file_name?.toLowerCase().endsWith('.pdf');
  const isDocx = document?.file_name?.toLowerCase().endsWith('.docx');
  const managerFieldEntries = Object.entries(document?.manager_fields || {});
  const formValid = normalizedFields.every(f => clientValues[f.name]?.trim()) && agreed1 && agreed2;
  const hasPhone = !!document?.client_phone;
  const allowedMethods = document?.signing_methods?.length ? document.signing_methods : ['sms', 'ecp', 'egov'];
  const showSms = allowedMethods.includes('sms');
  const showEcp = allowedMethods.includes('ecp');
  const showEgov = allowedMethods.includes('egov');

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  if (error && !document) return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4"><span className="text-2xl">⚠️</span></div>
        <h2 className="text-lg font-bold text-[#000926] mb-2">Документ не найден</h2>
        <p className="text-sm text-[#6B7E92]">{error}</p>
      </div>
    </div>
  );

  if (!document) return null;

  return (
    <div className="min-h-screen bg-[#F5F8FF] flex flex-col">
      <Header />
      <main className="flex-grow pt-24 pb-12 px-4">
        <div className="mx-auto max-w-lg">
          <div className="flex items-center justify-center gap-2 mb-5 bg-[#D6E6F3] text-[#0F52BA] text-xs font-semibold px-4 py-2 rounded-full w-fit mx-auto">
            <Shield className="w-3.5 h-3.5" />
            ПЭП — юридически значимо по ГК РК ст.152
          </div>

          <div className="bg-white rounded-2xl border border-[#D6E6F3] shadow-sm overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-[#D6E6F3]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-[#000926] tracking-tight">{document.title}</h1>
                  <p className="text-xs text-[#6B7E92] mt-1">Документ для подписания</p>
                </div>
                <span className={`shrink-0 text-xs font-semibold px-3 py-1 rounded-full ${document.status === 'CLOSED' ? 'bg-gray-100 text-gray-500' : 'bg-[#D6E6F3] text-[#0F52BA]'}`}>
                  {document.status === 'CLOSED' ? 'Закрыт' : `Активен · ${document.signature_count} подп.`}
                </span>
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {document.org_signed_at && (
                <div className="flex items-center gap-2 text-xs text-[#0F7B55] bg-green-50 border border-green-200 rounded-xl px-4 py-2.5">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  Организация подписала: {new Date(document.org_signed_at).toLocaleString('ru-RU')}
                </div>
              )}

              {/* Preview */}
              <div className="border border-[#D6E6F3] rounded-xl overflow-hidden">
                <button type="button" onClick={() => setPreviewOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-[#0D1B2A] hover:bg-[#F5F8FF] transition-colors">
                  <span>Посмотреть договор</span>
                  {previewOpen ? <ChevronUp className="w-4 h-4 text-[#6B7E92]" /> : <ChevronDown className="w-4 h-4 text-[#6B7E92]" />}
                </button>
                {previewOpen && (
                  <div className="border-t border-[#D6E6F3]">
                    {isPdf ? (
                      <iframe src={previewUrl} className="w-full" style={{ height: '500px' }} title="Предпросмотр" />
                    ) : isDocx ? (
                      <DocxPreview url={fileUrl} />
                    ) : (
                      <div className="p-6 text-center">
                        <a href={fileUrl} download className="inline-flex items-center gap-2 text-sm font-medium text-[#0F52BA] hover:underline">
                          <Download className="w-4 h-4" /> Скачать и открыть
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {document.status === 'CLOSED' ? (
                <div className="py-3 px-4 bg-gray-50 border border-gray-200 rounded-xl text-center text-sm text-gray-500">
                  Документ закрыт — подписание недоступно
                </div>

              ) : step === 'done' ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-[#0F7B55]" />
                  </div>
                  <h3 className="text-lg font-bold text-[#000926] mb-1">Договор подписан!</h3>
                  <p className="text-sm text-[#6B7E92] mb-6">Ваша подпись успешно добавлена</p>
                  <div className="flex flex-col gap-3">
                    <a href={fileUrl} download className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#0F52BA] rounded-xl text-sm font-medium text-white hover:bg-[#0D47A1] transition-colors">
                      <Download className="w-4 h-4" /> Скачать документ
                    </a>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert('Ссылка скопирована');
                      }}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border border-[#A6C5D7] rounded-xl text-sm font-medium text-[#0D1B2A] hover:bg-[#D6E6F3] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
                      Поделиться ссылкой
                    </button>
                  </div>
                </div>

              ) : step === 'fill' ? (
                <form onSubmit={handleFillFields} className="space-y-5">
                  {managerFieldEntries.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-3">Заполнено организацией</h3>
                      <div className="rounded-xl border border-[#D6E6F3] overflow-hidden divide-y divide-[#D6E6F3]">
                        {managerFieldEntries.map(([key, val]) => (
                          <div key={key} className="flex items-center justify-between px-4 py-2.5 text-sm">
                            <span className="text-[#6B7E92] capitalize">{key.replace(/_/g, ' ')}</span>
                            <span className="font-medium text-[#0D1B2A]">{val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <h3 className="text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-1">Заполните ваши данные</h3>
                    <p className="text-xs text-[#A6C5D7] mb-3">Эти данные будут внесены в договор</p>
                    <div className="space-y-3">
                      {normalizedFields.map(f => (
                        <div key={f.name}>
                          <label className="block text-xs font-semibold text-[#6B7E92] mb-1.5 capitalize">
                            {f.name.replace(/_/g, ' ')} <span className="text-red-400">*</span>
                          </label>
                          <input
                            required
                            type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                            inputMode={['number', 'iin', 'phone'].includes(f.type) ? 'numeric' : undefined}
                            maxLength={f.type === 'iin' ? 12 : undefined}
                            value={clientValues[f.name] || ''}
                            onChange={e => setClientValues({ ...clientValues, [f.name]: e.target.value })}
                            placeholder={f.type === 'iin' ? '123456789012' : f.type === 'phone' ? '+7 (___) ___-__-__' : `Введите ${f.name.replace(/_/g, ' ')}`}
                            className={inputClass}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {[
                      { id: 'a1', checked: agreed1, set: setAgreed1, label: 'Я ознакомился с содержанием договора' },
                      { id: 'a2', checked: agreed2, set: setAgreed2, label: 'Я согласен с условиями и подтверждаю правильность данных' },
                    ].map(({ id, checked, set, label }) => (
                      <label key={id} className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" checked={checked} onChange={e => set(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#0F52BA]" />
                        <span className="text-xs text-[#6B7E92] leading-relaxed">{label}</span>
                      </label>
                    ))}
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
                  <button type="submit" disabled={filling || !formValid}
                    className="w-full bg-[#0F52BA] hover:bg-[#0a3d8f] disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                    {filling ? 'Сохранение...' : 'Подтвердить данные →'}
                  </button>
                </form>

              ) : step === 'method' ? (
                /* Method selection */
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[#000926] mb-4">Выберите способ подписания</p>
                  {showSms && (
                    <button onClick={() => setStep('phone')}
                      className="w-full flex items-center gap-4 px-5 py-4 border-2 border-[#D6E6F3] rounded-xl hover:border-[#0F52BA] hover:bg-[#D6E6F3] transition-colors text-left">
                      <Phone className="w-6 h-6 text-[#0F52BA] shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-[#000926]">SMS-код</p>
                        <p className="text-xs text-[#6B7E92]">Получите код на номер из договора</p>
                      </div>
                    </button>
                  )}
                  {showEcp && (
                    <button onClick={() => setStep('ecp')}
                      className="w-full flex items-center gap-4 px-5 py-4 border-2 border-[#D6E6F3] rounded-xl hover:border-[#0F52BA] hover:bg-[#D6E6F3] transition-colors text-left">
                      <Fingerprint className="w-6 h-6 text-[#0F52BA] shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-[#000926]">ЭЦП (NCALayer)</p>
                        <p className="text-xs text-[#6B7E92]">Подпишите с помощью ЭЦП через приложение NCALayer</p>
                      </div>
                    </button>
                  )}
                  {showEgov && (
                    <button onClick={() => setStep('egov')}
                      className="w-full flex items-center gap-4 px-5 py-4 border-2 border-[#D6E6F3] rounded-xl hover:border-[#0F52BA] hover:bg-[#D6E6F3] transition-colors text-left">
                      <QrCode className="w-6 h-6 text-[#0F52BA] shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-[#000926]">eGov Mobile (Sigex)</p>
                        <p className="text-xs text-[#6B7E92]">Сканируйте QR-код через приложение eGov Mobile</p>
                      </div>
                    </button>
                  )}
                </div>

              ) : step === 'phone' ? (
                <form onSubmit={handleVerifyPhone} className="space-y-4">
                  <div className="flex items-center gap-3 bg-[#D6E6F3] rounded-xl px-4 py-3">
                    <Phone className="w-5 h-5 text-[#0F52BA] shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#000926]">Подтверждение по SMS</p>
                      <p className="text-xs text-[#6B7E92]">Введите номер, указанный в договоре</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">Номер телефона</label>
                    <input type="tel" required value={phone} onChange={e => setPhone(e.target.value)}
                      placeholder="+7 (___) ___-__-__" className={inputClass} />
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
                  <button type="submit" disabled={verifying || !phone}
                    className="w-full bg-[#0F52BA] hover:bg-[#0a3d8f] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                    {verifying ? 'Отправка...' : 'Получить SMS код →'}
                  </button>
                  <button type="button" onClick={() => { setStep('method'); setError(null); }}
                    className="w-full text-xs text-[#6B7E92] hover:text-[#0F52BA] transition-colors py-1">← Назад</button>
                </form>

              ) : step === 'otp' ? (
                <form onSubmit={handleConfirmOtp} className="space-y-4">
                  <div className="flex items-center gap-3 bg-[#D6E6F3] rounded-xl px-4 py-3">
                    <KeyRound className="w-5 h-5 text-[#0F52BA] shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#000926]">Введите код из SMS</p>
                      <p className="text-xs text-[#6B7E92]">Отправлен на {phone}. Действителен 10 минут.</p>
                    </div>
                  </div>
                  {debugCode && (
                    <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2.5 rounded-xl text-xs font-mono">
                      🔧 DEV: SMS код = <strong>{debugCode}</strong>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">6-значный код</label>
                    <input type="text" required inputMode="numeric" maxLength={6}
                      value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      placeholder="______" className={`${inputClass} tracking-widest text-center text-lg font-bold`} />
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
                  <button type="submit" disabled={confirming || otp.length !== 6}
                    className="w-full bg-[#0F52BA] hover:bg-[#0a3d8f] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm">
                    {confirming ? 'Подписание...' : 'Подтвердить и подписать'}
                  </button>
                  <button type="button" onClick={() => { setStep('phone'); setOtp(''); setError(null); }}
                    className="w-full text-xs text-[#6B7E92] hover:text-[#0F52BA] transition-colors py-1">← Изменить номер</button>
                </form>

              ) : step === 'ecp' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-[#D6E6F3] rounded-xl px-4 py-3">
                    <Fingerprint className="w-5 h-5 text-[#0F52BA] shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#000926]">Подписание через ЭЦП</p>
                      <p className="text-xs text-[#6B7E92]">Убедитесь что приложение NCALayer запущено на вашем компьютере</p>
                    </div>
                  </div>
                  {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error}</div>}
                  <button onClick={handleECP} disabled={ecpLoading}
                    className="w-full bg-[#0F52BA] hover:bg-[#0a3d8f] disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors text-sm flex items-center justify-center gap-2">
                    {ecpLoading ? (
                      <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Ожидание NCALayer...</>
                    ) : (
                      <><Fingerprint className="w-4 h-4" /> Подписать через NCALayer</>
                    )}
                  </button>
                  <button type="button" onClick={() => { setStep('method'); setError(null); }}
                    className="w-full text-xs text-[#6B7E92] hover:text-[#0F52BA] transition-colors py-1">← Назад</button>
                </div>

              ) : step === 'egov' ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-[#D6E6F3] rounded-xl px-4 py-3">
                    <QrCode className="w-5 h-5 text-[#0F52BA] shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-[#000926]">eGov Mobile (Sigex)</p>
                      <p className="text-xs text-[#6B7E92]">Откройте eGov Mobile и сканируйте QR-код</p>
                    </div>
                  </div>

                  {sigexStatus === 'LOADING' && (
                    <div className="flex justify-center py-8">
                      <div className="w-8 h-8 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  {sigexStatus === 'WAITING' && sigexSession && (
                    <div className="flex flex-col items-center gap-4">
                      {/* Mobile: show launch link button prominently */}
                      {sigexSession.launch_link && (
                        <a
                          href={sigexSession.launch_link}
                          className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 bg-[#0F52BA] text-white text-sm font-semibold rounded-xl hover:bg-[#0D47A1] transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          Открыть в eGov Mobile
                        </a>
                      )}
                      {/* Divider */}
                      <div className="flex items-center gap-3 w-full">
                        <div className="flex-1 h-px bg-[#D6E6F3]" />
                        <span className="text-xs text-[#A6C5D7]">или сканируйте QR-код</span>
                        <div className="flex-1 h-px bg-[#D6E6F3]" />
                      </div>
                      {/* QR for desktop */}
                      <div className="bg-white p-4 rounded-xl border-2 border-[#D6E6F3] shadow-sm">
                        <img
                          src={`data:image/png;base64,${sigexSession.qr_image}`}
                          alt="QR код для подписания"
                          width={200}
                          height={200}
                        />
                      </div>
                      <p className="text-xs text-[#6B7E92] text-center">Сканируйте QR-код камерой телефона через приложение eGov Mobile</p>
                    </div>
                  )}

                  {sigexStatus === 'EXPIRED' && (
                    <div className="text-center py-4">
                      <p className="text-sm text-red-600 mb-3">QR-код истёк</p>
                      <button onClick={() => { setSigexSession(null); initSigex(); }}
                        className="text-sm text-[#0F52BA] hover:underline">Обновить QR-код</button>
                    </div>
                  )}

                  {sigexStatus === 'ERROR' && (
                    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">{error || 'Ошибка соединения'}</div>
                  )}

                  <button type="button" onClick={() => { setStep('method'); setError(null); if (sigexPollRef.current) clearInterval(sigexPollRef.current); setSigexSession(null); setSigexStatus('LOADING'); }}
                    className="w-full text-xs text-[#6B7E92] hover:text-[#0F52BA] transition-colors py-1">← Назад</button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function DocxPreview({ url }: { url: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url);
        const buffer = await res.arrayBuffer();
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        if (!cancelled) setHtml(result.value);
      } catch {
        if (!cancelled) setHtml('<p style="color:#6B7E92;padding:16px">Не удалось загрузить предпросмотр</p>');
      } finally { if (!cancelled) setBusy(false); }
    })();
    return () => { cancelled = true; };
  }, [url]);
  if (busy) return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" /></div>;
  return <div className="p-6 max-h-[500px] overflow-y-auto prose prose-sm max-w-none text-[#0D1B2A]" dangerouslySetInnerHTML={{ __html: html || '' }} />;
}
