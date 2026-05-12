import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Plus, Trash2, FileText, Send, X, Copy, Check, Pencil, UserCheck, Building2, Eye, Upload, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

type FieldType = 'text' | 'date' | 'number' | 'phone' | 'iin';

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Текст' },
  { value: 'date', label: 'Дата' },
  { value: 'number', label: 'Число / Сумма' },
  { value: 'phone', label: 'Телефон' },
  { value: 'iin', label: 'ИИН' },
];

function autoType(name: string): FieldType {
  const n = name.toLowerCase();
  if (/дата|date|күн/.test(n)) return 'date';
  if (/иин|жсн|iin/.test(n)) return 'iin';
  if (/тел|phone/.test(n)) return 'phone';
  if (/сумм|цен|стоимост|оплат/.test(n)) return 'number';
  return 'text';
}

function autoCategory(name: string): string {
  const n = name.toLowerCase();
  if (/имя|аты|фами|жөн|иин|жсн|тел|адрес|email|заказчик|клиент|ученик/.test(n)) return 'ДАННЫЕ ЗАКАЗЧИКА';
  if (/сумм|цен|стоимост|оплат|тариф/.test(n)) return 'ОПЛАТА';
  return 'УСЛОВИЯ ДОГОВОРА';
}

function humanize(name: string) { return name.replace(/_/g, ' '); }

function groupByCategory(fields: FieldState[]): Record<string, FieldState[]> {
  const groups: Record<string, FieldState[]> = {};
  for (const f of fields) {
    const cat = autoCategory(f.name);
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(f);
  }
  return groups;
}

const CAT_COLORS: Record<string, { dot: string; text: string; bg: string; border: string }> = {
  'ДАННЫЕ ЗАКАЗЧИКА': { dot: 'bg-[#0F52BA]', text: 'text-[#0F52BA]', bg: 'bg-[#D6E6F3]', border: 'border-[#A6C5D7]' },
  'ОПЛАТА': { dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
  'УСЛОВИЯ ДОГОВОРА': { dot: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
};
function catColor(cat: string) {
  return CAT_COLORS[cat] || { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' };
}

interface FieldState { name: string; type: FieldType; isClient: boolean; value: string; }
interface Template { id: number; title: string; description: string; file: string; file_name: string; template_fields: string[]; created_at: string; }
interface UseTemplateModal { template: Template; docTitle: string; fields: FieldState[]; }
interface CreatedDoc { uuid: string; title: string; }

/* ── DOCX Preview Component ── */
function DocxPreview({ url, token, className = '' }: { url: string; token: string | null; className?: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setBusy(true);
    setHtml(null);
    (async () => {
      try {
        const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
        if (!res.ok) throw new Error('fetch failed');
        const buffer = await res.arrayBuffer();
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        if (!cancelled) setHtml(result.value || '<p style="color:#6B7E92">Документ пустой</p>');
      } catch {
        if (!cancelled) setHtml('<p style="color:#6B7E92;padding:12px">Предпросмотр недоступен</p>');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [url]);

  if (busy) return (
    <div className={`flex items-center justify-center py-16 ${className}`}>
      <div className="flex flex-col items-center gap-2">
        <div className="w-6 h-6 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-[#6B7E92]">Загрузка предпросмотра...</span>
      </div>
    </div>
  );

  return (
    <div
      className={`prose prose-sm max-w-none text-[#0D1B2A] overflow-y-auto ${className}`}
      style={{ fontSize: '13px', lineHeight: '1.6' }}
      dangerouslySetInnerHTML={{ __html: html || '' }}
    />
  );
}

/* ── Local file preview (before upload) ── */
function LocalDocxPreview({ file }: { file: File }) {
  const [html, setHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const buffer = await file.arrayBuffer();
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
        if (!cancelled) setHtml(result.value);
      } catch {
        if (!cancelled) setHtml('<p style="color:#6B7E92">Предпросмотр недоступен</p>');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, [file]);

  if (busy) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div
      className="prose prose-sm max-w-none text-[#0D1B2A] overflow-y-auto p-4 max-h-[400px]"
      style={{ fontSize: '13px', lineHeight: '1.6' }}
      dangerouslySetInnerHTML={{ __html: html || '' }}
    />
  );
}

/* ── Main Component ── */
export function Templates() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [justCreated, setJustCreated] = useState<Template | null>(null);
  const [modal, setModal] = useState<UseTemplateModal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdDoc, setCreatedDoc] = useState<CreatedDoc | null>(null);
  const [copied, setCopied] = useState(false);

  const isAllowed = user?.role === 'ORGANIZATION' || user?.role === 'SUPERADMIN' || user?.role === 'MANAGER';

  useEffect(() => { fetchTemplates(); }, [token]);

  const fetchTemplates = async () => {
    if (!token) return;
    const res = await fetch(`${API_BASE}/api/documents/templates/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setTemplates(await res.json());
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !file) return;
    setLoading(true); setError(null);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title || file.name);
    formData.append('description', description);
    try {
      const res = await fetch(`${API_BASE}/api/documents/templates/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Ошибка загрузки');
      const tmpl = await res.json();
      setTemplates([tmpl, ...templates]);
      setJustCreated(tmpl);
      setFile(null); setTitle(''); setDescription('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!token || !confirm('Удалить шаблон?')) return;
    await fetch(`${API_BASE}/api/documents/templates/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setTemplates(templates.filter(t => t.id !== id));
  };

  const openModal = (tmpl: Template) => {
    const fields: FieldState[] = tmpl.template_fields.map(name => ({
      name, type: autoType(name), isClient: true, value: '',
    }));
    setModal({ template: tmpl, docTitle: tmpl.title, fields });
    setCreatedDoc(null);
  };

  const updateField = (name: string, update: Partial<FieldState>) => {
    setModal(m => m ? { ...m, fields: m.fields.map(f => f.name === name ? { ...f, ...update } : f) } : null);
  };

  const handleUseTemplate = async () => {
    if (!modal || !token) return;
    setSubmitting(true);
    try {
      const managerFields: Record<string, string> = {};
      const clientFields: { name: string; type: FieldType }[] = [];
      for (const f of modal.fields) {
        if (f.isClient) clientFields.push({ name: f.name, type: f.type });
        else managerFields[f.name] = f.value;
      }
      const res = await fetch(`${API_BASE}/api/documents/templates/${modal.template.id}/use/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: modal.docTitle, fields: managerFields, client_fields: clientFields, client_phone: (modal as any).clientPhone || '' }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Ошибка');
      const doc = await res.json();
      setCreatedDoc({ uuid: doc.uuid, title: doc.title });
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!createdDoc) return;
    navigator.clipboard.writeText(`${window.location.origin}/sign/${createdDoc.uuid}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const inputClass = 'w-full bg-white border border-[#A6C5D7] px-4 py-2.5 rounded-xl text-sm text-[#0D1B2A] placeholder-[#A6C5D7] focus:outline-none focus:ring-2 focus:ring-[#0F52BA]/30 focus:border-[#0F52BA] transition-colors';

  if (!isAllowed) return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow pt-28 flex items-center justify-center">
        <p className="text-[#6B7E92]">Доступ запрещён.</p>
      </main>
      <Footer />
    </div>
  );

  const isDocx = file?.name.toLowerCase().endsWith('.docx');

  return (
    <div className="flex flex-col min-h-screen bg-[#F5F8FF]">
      <Header />
      <main className="flex-grow pt-28 pb-12 px-4">
        <div className="container mx-auto max-w-5xl">

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-[#000926] tracking-tight">Шаблоны договоров</h1>
            <p className="text-sm text-[#6B7E92] mt-1">Загрузите DOCX шаблон с плейсхолдерами вида <code className="bg-[#D6E6F3] px-1 rounded text-[#0F52BA]">{'{{поле}}'}</code></p>
          </div>

          {/* Upload card — two-column when file selected */}
          <div className="bg-white rounded-2xl border border-[#D6E6F3] shadow-sm mb-8 overflow-hidden">
            <div className="px-6 py-4 border-b border-[#D6E6F3]">
              <h2 className="text-base font-semibold text-[#000926]">Добавить шаблон</h2>
            </div>

            <div className={`flex ${file && isDocx ? 'flex-col lg:flex-row' : 'flex-col'}`}>
              {/* Left: form */}
              <form onSubmit={handleUpload} className={`p-6 space-y-4 ${file && isDocx ? 'lg:w-1/2 lg:border-r lg:border-[#D6E6F3]' : 'w-full'}`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-1.5">Название</label>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Договор аренды" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-1.5">Описание</label>
                    <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Краткое описание" className={inputClass} />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-1.5">Файл (.docx / .pdf)</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-[#A6C5D7] rounded-xl cursor-pointer hover:border-[#0F52BA] hover:bg-[#F5F8FF] transition-colors">
                    <Upload className="w-6 h-6 text-[#A6C5D7] mb-2" />
                    {file ? (
                      <span className="text-sm font-medium text-[#0F52BA]">{file.name}</span>
                    ) : (
                      <span className="text-sm text-[#6B7E92]">Перетащите или <span className="text-[#0F52BA] font-medium">выберите файл</span></span>
                    )}
                    <input type="file" accept=".docx,.pdf,.doc" onChange={e => setFile(e.target.files?.[0] || null)} className="hidden" required />
                  </label>
                </div>

                {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 px-4 py-2 rounded-xl">{error}</div>}

                <button
                  type="submit"
                  disabled={!file || loading}
                  className="flex items-center gap-2 bg-[#0F52BA] hover:bg-[#0a3d8f] disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-xl transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" />
                  {loading ? 'Сохранение...' : 'Добавить шаблон'}
                </button>

                {/* Just-created result */}
                {justCreated && (
                  <div className="border border-[#D6E6F3] rounded-xl p-4 bg-[#F5F8FF]">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-semibold text-[#0F7B55] flex items-center gap-1.5">
                        <Check className="w-4 h-4" /> «{justCreated.title}» создан
                      </p>
                      <button onClick={() => setJustCreated(null)}><X className="w-4 h-4 text-[#6B7E92]" /></button>
                    </div>
                    {justCreated.template_fields.length > 0 ? (
                      <>
                        <p className="text-xs text-[#6B7E92] mb-2">Поля ({justCreated.template_fields.length}):</p>
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {justCreated.template_fields.map(f => {
                            const clr = catColor(autoCategory(f));
                            return (
                              <span key={f} className={`text-xs px-2 py-0.5 rounded-full font-mono ${clr.bg} ${clr.text}`}>
                                {`{{${f}}}`}
                              </span>
                            );
                          })}
                        </div>
                        <button
                          onClick={() => { openModal(justCreated); setJustCreated(null); }}
                          className="flex items-center gap-1.5 text-sm font-semibold text-[#0F52BA] hover:underline"
                        >
                          <Send className="w-3.5 h-3.5" /> Настроить и создать договор
                        </button>
                      </>
                    ) : (
                      <p className="text-xs text-[#6B7E92] italic">Плейсхолдеры не найдены.</p>
                    )}
                  </div>
                )}
              </form>

              {/* Right: DOCX preview */}
              {file && isDocx && (
                <div className="lg:w-1/2 border-t lg:border-t-0 border-[#D6E6F3]">
                  <div className="px-4 py-3 border-b border-[#D6E6F3] flex items-center gap-2 bg-[#F5F8FF]">
                    <Eye className="w-4 h-4 text-[#0F52BA]" />
                    <span className="text-xs font-semibold text-[#6B7E92] uppercase tracking-wider">Предпросмотр</span>
                  </div>
                  <LocalDocxPreview file={file} />
                </div>
              )}
            </div>
          </div>

          {/* Templates list */}
          <div className="bg-white rounded-2xl border border-[#D6E6F3] shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-[#D6E6F3]">
              <h2 className="text-base font-semibold text-[#000926]">Мои шаблоны</h2>
            </div>
            <div className="divide-y divide-[#D6E6F3]">
              {templates.map(tmpl => (
                <div key={tmpl.id} className="flex items-center gap-4 px-6 py-4 hover:bg-[#F5F8FF] transition-colors">
                  <div className="w-9 h-9 bg-[#D6E6F3] rounded-xl flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4 text-[#0F52BA]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#000926] truncate">{tmpl.title}</p>
                    {tmpl.description && <p className="text-xs text-[#6B7E92] truncate">{tmpl.description}</p>}
                    <div className="flex flex-wrap gap-1 mt-1">
                      {tmpl.template_fields.slice(0, 4).map(f => (
                        <span key={f} className="text-[10px] bg-[#D6E6F3] text-[#0F52BA] px-1.5 py-0.5 rounded font-mono">{`{{${f}}}`}</span>
                      ))}
                      {tmpl.template_fields.length > 4 && (
                        <span className="text-[10px] text-[#6B7E92]">+{tmpl.template_fields.length - 4}</span>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-[#6B7E92] shrink-0 hidden sm:block">
                    {new Date(tmpl.created_at).toLocaleDateString('ru-RU')}
                  </p>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openModal(tmpl)}
                      className="flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0a3d8f] text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Send className="w-3 h-3" /> Использовать
                    </button>
                    <button
                      onClick={() => handleDelete(tmpl.id)}
                      className="p-1.5 border border-red-200 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              {templates.length === 0 && (
                <div className="px-6 py-16 text-center">
                  <FileText className="w-10 h-10 text-[#D6E6F3] mx-auto mb-3" />
                  <p className="text-sm text-[#6B7E92]">Нет шаблонов. Загрузите первый шаблон выше.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      {/* Use Template Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col" style={{ maxHeight: '92vh' }}>
            <button onClick={() => setModal(null)} className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#D6E6F3] text-[#6B7E92] transition-colors">
              <X className="w-4 h-4" />
            </button>

            {createdDoc ? (
              /* Success screen */
              <div className="p-8 text-center">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Check className="w-7 h-7 text-[#0F7B55]" />
                </div>
                <h3 className="text-xl font-bold text-[#000926] mb-1">Договор создан!</h3>
                <p className="text-sm text-[#6B7E92] mb-6">{createdDoc.title}</p>
                <div className="bg-[#F5F8FF] border border-[#D6E6F3] rounded-xl px-4 py-3 mb-5 text-left">
                  <p className="text-xs text-[#6B7E92] mb-1">Ссылка для клиента:</p>
                  <p className="text-sm font-mono break-all text-[#000926]">{window.location.origin}/sign/{createdDoc.uuid}</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={handleCopyLink} className="flex-1 flex items-center justify-center gap-2 bg-[#0F52BA] hover:bg-[#0a3d8f] text-white font-semibold py-2.5 rounded-xl text-sm transition-colors">
                    {copied ? <><Check className="w-4 h-4" />Скопировано</> : <><Copy className="w-4 h-4" />Скопировать ссылку</>}
                  </button>
                  <button onClick={() => navigate('/documents')} className="flex-1 border border-[#A6C5D7] text-[#0D1B2A] font-semibold py-2.5 rounded-xl text-sm hover:bg-[#D6E6F3] transition-colors">
                    К договорам
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Modal header */}
                <div className="px-6 py-4 border-b border-[#D6E6F3] shrink-0">
                  <h3 className="text-lg font-bold text-[#000926]">Создать договор из шаблона</h3>
                  <p className="text-sm text-[#6B7E92]">Шаблон: <strong className="text-[#0D1B2A]">{modal.template.title}</strong></p>
                </div>

                <div className="flex flex-1 overflow-hidden min-h-0">
                  {/* Left: field config */}
                  <div className="w-1/2 flex flex-col overflow-y-auto border-r border-[#D6E6F3] p-6 gap-5">
                    <div>
                      <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-1.5">Название договора *</label>
                      <input
                        value={modal.docTitle}
                        onChange={e => setModal({ ...modal, docTitle: e.target.value })}
                        className="w-full border border-[#A6C5D7] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F52BA]/30 focus:border-[#0F52BA]"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-1.5">
                        Телефон клиента <span className="text-[#A6C5D7] font-normal normal-case">(для SMS подтверждения)</span>
                      </label>
                      <input
                        type="tel"
                        value={(modal as any).clientPhone || ''}
                        onChange={e => setModal({ ...modal, clientPhone: e.target.value } as any)}
                        placeholder="+7 (___) ___-__-__"
                        className="w-full border border-[#A6C5D7] px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#0F52BA]/30 focus:border-[#0F52BA]"
                      />
                      <p className="text-[10px] text-[#A6C5D7] mt-1">Клиент должен ввести этот номер перед подписанием</p>
                    </div>

                    {modal.fields.length > 0 ? (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-xs font-semibold text-[#6B7E92] uppercase tracking-wider">Поля ({modal.fields.length})</label>
                          <span className="text-xs text-[#6B7E92] flex items-center gap-2">
                            <UserCheck className="w-3 h-3" /> клиент
                            <Building2 className="w-3 h-3 ml-1" /> менеджер
                          </span>
                        </div>
                        {Object.entries(groupByCategory(modal.fields)).map(([cat, catFields]) => {
                          const clr = catColor(cat);
                          return (
                            <div key={cat} className="mb-5">
                              <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-2 ${clr.bg}`}>
                                <span className={`w-2 h-2 rounded-full shrink-0 ${clr.dot}`} />
                                <span className={`text-xs font-semibold uppercase tracking-wide ${clr.text}`}>{cat} ({catFields.length})</span>
                              </div>
                              <div className="space-y-2">
                                {catFields.map(f => (
                                  <div key={f.name} className={`border rounded-xl p-3 ${clr.border}`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${clr.dot}`} />
                                        <span className="text-sm font-medium text-[#000926] truncate">{humanize(f.name)}</span>
                                        <span className="text-xs text-[#A6C5D7] font-mono shrink-0">{`{{${f.name}}}`}</span>
                                      </div>
                                      <label className="flex items-center gap-1 cursor-pointer shrink-0 ml-2">
                                        <input
                                          type="checkbox"
                                          checked={f.isClient}
                                          onChange={() => updateField(f.name, { isClient: !f.isClient, value: '' })}
                                          className="w-3.5 h-3.5 accent-[#0F52BA]"
                                        />
                                        <UserCheck className="w-3.5 h-3.5 text-[#0F52BA]" />
                                      </label>
                                    </div>
                                    <div className="flex gap-2">
                                      <select
                                        value={f.type}
                                        onChange={e => updateField(f.name, { type: e.target.value as FieldType })}
                                        className="text-xs border border-[#D6E6F3] rounded-lg px-2 py-1.5 bg-[#F5F8FF] focus:outline-none focus:ring-1 focus:ring-[#0F52BA] text-[#0D1B2A]"
                                      >
                                        {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                                      </select>
                                      {f.isClient ? (
                                        <span className="flex-1 text-xs text-[#0F52BA] italic flex items-center px-2">заполнит клиент при подписании</span>
                                      ) : (
                                        <input
                                          type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                                          value={f.value}
                                          onChange={e => updateField(f.name, { value: e.target.value })}
                                          placeholder={`Введите ${humanize(f.name)}`}
                                          className="flex-1 text-sm border border-[#D6E6F3] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0F52BA] min-w-0"
                                        />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-[#6B7E92] italic">Шаблон не содержит переменных. Договор будет создан как есть.</p>
                    )}
                  </div>

                  {/* Right: DOCX preview */}
                  <div className="w-1/2 flex flex-col overflow-hidden bg-[#F5F8FF]">
                    <div className="px-4 py-3 border-b border-[#D6E6F3] flex items-center gap-2 shrink-0">
                      <Eye className="w-4 h-4 text-[#0F52BA]" />
                      <span className="text-xs font-semibold text-[#6B7E92] uppercase tracking-wider">Предпросмотр документа</span>
                      <span className="text-xs text-[#A6C5D7] truncate ml-auto">{modal.template.file_name}</span>
                    </div>
                    {modal.template.file_name?.toLowerCase().endsWith('.docx') ? (
                      <DocxPreview
                        url={`${API_BASE}/api/documents/templates/${modal.template.id}/file/`}
                        token={token}
                        className="flex-1 p-5"
                      />
                    ) : (
                      <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
                        <FileText className="w-10 h-10 text-[#D6E6F3] mb-3" />
                        <p className="text-sm text-[#6B7E92]">Предпросмотр доступен только для DOCX файлов</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-[#D6E6F3] shrink-0 flex gap-3">
                  <button
                    onClick={handleUseTemplate}
                    disabled={submitting}
                    className="flex-1 bg-[#0F52BA] hover:bg-[#0a3d8f] disabled:opacity-60 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting ? 'Создание...' : <><Send className="w-4 h-4" /> Создать договор</>}
                  </button>
                  <button onClick={() => setModal(null)} className="flex-1 border border-[#A6C5D7] text-[#0D1B2A] font-semibold py-2.5 rounded-xl text-sm hover:bg-[#D6E6F3] transition-colors">
                    Отмена
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
