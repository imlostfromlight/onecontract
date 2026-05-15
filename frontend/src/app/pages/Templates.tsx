import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import {
  Plus, Trash2, FileText, Send, X, Copy, Check,
  UserCheck, Building2, Eye, Upload, Loader2, AlertCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

/* ── Types ── */
type FieldType = 'text' | 'date' | 'number' | 'phone' | 'iin';
const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'text', label: 'Текст' },
  { value: 'date', label: 'Дата' },
  { value: 'number', label: 'Число / Сумма' },
  { value: 'phone', label: 'Телефон' },
  { value: 'iin', label: 'ИИН' },
];

interface FieldState { name: string; type: FieldType; isClient: boolean; value: string; }
interface Template { id: number; title: string; description: string; file: string; file_name: string; template_fields: string[]; created_at: string; }
interface UseTemplateModal { template: Template; docTitle: string; fields: FieldState[]; clientPhone?: string; }
interface CreatedDoc { uuid: string; title: string; }

/* ── Helpers ── */
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

function pluralFields(n: number) {
  if (n % 10 === 1 && n % 100 !== 11) return 'поле';
  if ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) return 'поля';
  return 'полей';
}

/* ── DOCX Preview ── */
function DocxPreview({ url, token, className = '' }: { url: string; token: string | null; className?: string }) {
  const [html, setHtml] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setBusy(true); setHtml(null);
    (async () => {
      try {
        const res = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
        if (!res.ok) throw new Error();
        const buf = await res.arrayBuffer();
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
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
      <div className="w-6 h-6 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
    </div>
  );
  return (
    <div className={`prose prose-sm max-w-none text-[#0D1B2A] overflow-y-auto ${className}`}
      style={{ fontSize: '13px', lineHeight: '1.6' }}
      dangerouslySetInnerHTML={{ __html: html || '' }} />
  );
}

/* ── Main Component ── */
export function Templates() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [modal, setModal] = useState<UseTemplateModal | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [createdDoc, setCreatedDoc] = useState<CreatedDoc | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { fetchTemplates(); }, [token]);

  const fetchTemplates = async () => {
    if (!token) return;
    setLoadingList(true);
    const res = await fetch(`${API_BASE}/api/documents/templates/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setTemplates(await res.json());
    setLoadingList(false);
  };

  const handleDelete = async (id: number) => {
    if (!token || !confirm('Удалить шаблон?')) return;
    await fetch(`${API_BASE}/api/documents/templates/${id}/`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setTemplates(ts => ts.filter(t => t.id !== id));
  };

  const openModal = (tmpl: Template) => {
    setModal({
      template: tmpl,
      docTitle: tmpl.title,
      fields: tmpl.template_fields.map(name => ({ name, type: autoType(name), isClient: true, value: '' })),
      clientPhone: '',
    });
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
        body: JSON.stringify({ title: modal.docTitle, fields: managerFields, client_fields: clientFields, client_phone: modal.clientPhone || '' }),
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

  return (
    <DashboardLayout>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[#0D1B2A]">Шаблоны</h1>
          <p className="text-sm text-[#6B7E92] mt-0.5">Шаблоны договоров вашей организации</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          className="bg-[#0F52BA] hover:bg-[#0a3d8f] text-white rounded-xl px-4 h-10 text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <Plus size={18} strokeWidth={1.5} />
          <span className="hidden sm:inline">Загрузить шаблон</span>
          <span className="sm:hidden">Загрузить</span>
        </button>
      </div>

      {/* Content */}
      {loadingList ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#D6E6F3] flex items-center justify-center mb-4">
            <FileText size={32} className="text-[#0F52BA]" strokeWidth={1.5} />
          </div>
          <h3 className="text-lg font-semibold text-[#0D1B2A] mb-2">Нет шаблонов</h3>
          <p className="text-sm text-[#6B7E92] max-w-xs mb-6">
            Загрузите договор — поля для заполнения будут найдены автоматически.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="bg-[#0F52BA] hover:bg-[#0a3d8f] text-white rounded-xl px-5 py-2.5 text-sm font-semibold transition-colors flex items-center gap-2"
          >
            <Upload size={16} strokeWidth={1.5} />
            Загрузить первый шаблон
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map(tmpl => (
            <TemplateCard
              key={tmpl.id}
              template={tmpl}
              onUse={() => openModal(tmpl)}
              onDelete={() => handleDelete(tmpl.id)}
            />
          ))}
        </div>
      )}

      {/* Upload modal */}
      {showUpload && (
        <UploadModal
          token={token}
          onClose={() => setShowUpload(false)}
          onCreated={(tmpl) => {
            setTemplates(ts => [tmpl, ...ts]);
            setShowUpload(false);
          }}
        />
      )}

      {/* Use template wizard */}
      {modal && (
        <TemplateWizard
          modal={modal}
          setModal={setModal}
          updateField={updateField}
          handleUseTemplate={handleUseTemplate}
          submitting={submitting}
          createdDoc={createdDoc}
          setCreatedDoc={setCreatedDoc}
          copied={copied}
          handleCopyLink={handleCopyLink}
          navigate={navigate}
          token={token}
        />
      )}
    </DashboardLayout>
  );
}

/* ── Template Card ── */
function TemplateCard({ template, onUse, onDelete }: { template: Template; onUse: () => void; onDelete: () => void }) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`Удалить шаблон «${template.title}»?`)) return;
    setDeleting(true);
    try { await onDelete(); } finally { setDeleting(false); }
  };

  return (
    <div className="bg-white border border-[#D6E6F3] rounded-2xl p-5 shadow-sm flex items-center gap-4 hover:border-[#A6C5D7] transition-colors">
      <div className="w-10 h-10 rounded-xl bg-[#D6E6F3] flex items-center justify-center shrink-0">
        <FileText size={20} className="text-[#0F52BA]" strokeWidth={1.5} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[#0D1B2A] truncate">{template.title}</p>
        <p className="text-xs text-[#6B7E92] mt-0.5">
          {template.template_fields.length} {pluralFields(template.template_fields.length)} · {new Date(template.created_at).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' })}
        </p>
        {template.description && <p className="text-xs text-[#6B7E92] mt-0.5 truncate">{template.description}</p>}
        {template.template_fields.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {template.template_fields.slice(0, 5).map(f => (
              <span key={f} className="text-[10px] bg-[#D6E6F3] text-[#0F52BA] px-1.5 py-0.5 rounded font-mono">{`{{${f}}}`}</span>
            ))}
            {template.template_fields.length > 5 && (
              <span className="text-[10px] text-[#6B7E92]">+{template.template_fields.length - 5}</span>
            )}
          </div>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={onUse}
          className="flex items-center gap-1.5 bg-[#0F52BA] hover:bg-[#0a3d8f] text-white text-xs font-semibold px-3 h-9 rounded-xl transition-colors"
        >
          <Send size={14} strokeWidth={1.5} /> Использовать
        </button>
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-[#6B7E92] hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
        >
          {deleting ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} strokeWidth={1.5} />}
        </button>
      </div>
    </div>
  );
}

/* ── Upload Modal ── */
function UploadModal({ token, onClose, onCreated }: { token: string | null; onClose: () => void; onCreated: (t: Template) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [previewBusy, setPreviewBusy] = useState(false);

  const handleFile = async (f: File) => {
    setFile(f);
    setTitle(t => t || f.name.replace(/\.(docx|pdf|doc)$/i, ''));
    if (f.name.toLowerCase().endsWith('.docx')) {
      setPreviewBusy(true);
      try {
        const buf = await f.arrayBuffer();
        const mammoth = await import('mammoth');
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        setPreview(result.value);
      } catch { setPreview(null); }
      finally { setPreviewBusy(false); }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !token) return;
    setLoading(true); setError(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('title', title || file.name);
    fd.append('description', description);
    try {
      const res = await fetch(`${API_BASE}/api/documents/templates/`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      if (!res.ok) throw new Error((await res.json()).detail || 'Ошибка загрузки');
      onCreated(await res.json());
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full border border-[#A6C5D7] rounded-xl px-4 h-11 text-sm text-[#0D1B2A] placeholder-[#A6C5D7] focus:outline-none focus:ring-2 focus:ring-[#0F52BA]/20 focus:border-[#0F52BA] transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full flex overflow-hidden" style={{ maxWidth: 900, maxHeight: '90vh' }}>
        {/* Left: form */}
        <form onSubmit={handleSubmit} className="flex flex-col w-full lg:w-1/2 p-6 gap-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h2 className="text-lg font-bold text-[#0D1B2A]">Новый шаблон</h2>
              <p className="text-xs text-[#6B7E92] mt-0.5">Загрузите файл договора (.docx или .pdf)</p>
            </div>
            <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F8FF] text-[#6B7E92]">
              <X size={16} />
            </button>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => !loading && document.getElementById('tmpl-file-input')?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center gap-2 cursor-pointer transition-all ${
              dragging ? 'border-[#0F52BA] bg-[#D6E6F3]/30' : 'border-[#A6C5D7] hover:border-[#0F52BA] hover:bg-[#F5F8FF]'
            }`}
          >
            <Upload size={32} className={dragging ? 'text-[#0F52BA]' : 'text-[#A6C5D7]'} strokeWidth={1.5} />
            {file ? (
              <p className="text-sm font-semibold text-[#0F52BA]">{file.name}</p>
            ) : (
              <>
                <p className="text-sm font-medium text-[#0D1B2A]">Перетащите файл или нажмите для выбора</p>
                <p className="text-xs text-[#6B7E92]">.docx или .pdf, до 10 МБ</p>
              </>
            )}
            <input id="tmpl-file-input" type="file" accept=".docx,.pdf,.doc" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-1.5">Название *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Договор аренды" className={inputCls} required />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-1.5">Описание</label>
            <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Краткое описание (необязательно)" className={inputCls} />
          </div>

          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
              <AlertCircle size={15} className="mt-0.5 shrink-0" /> {error}
            </div>
          )}

          <div className="flex gap-3 mt-auto pt-2 border-t border-[#D6E6F3]">
            <button type="button" onClick={onClose}
              className="flex-1 border border-[#D6E6F3] text-[#0D1B2A] font-semibold h-11 rounded-xl text-sm hover:bg-[#F5F8FF] transition-colors">
              Отмена
            </button>
            <button type="submit" disabled={!file || loading}
              className="flex-1 bg-[#0F52BA] hover:bg-[#0a3d8f] disabled:opacity-50 text-white font-semibold h-11 rounded-xl text-sm transition-colors flex items-center justify-center gap-2">
              {loading ? <><Loader2 size={15} className="animate-spin" /> Сохранение…</> : 'Добавить шаблон'}
            </button>
          </div>
        </form>

        {/* Right: preview */}
        <div className="hidden lg:flex flex-col w-1/2 bg-[#F8FAFC] border-l border-[#D6E6F3]">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#D6E6F3]">
            <Eye size={15} className="text-[#0F52BA]" />
            <span className="text-xs font-semibold text-[#6B7E92] uppercase tracking-wider">Предпросмотр</span>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {previewBusy ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-6 h-6 border-2 border-[#0F52BA] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : preview ? (
              <div className="prose prose-sm max-w-none text-[#0D1B2A]" style={{ fontSize: '13px', lineHeight: 1.6 }}
                dangerouslySetInnerHTML={{ __html: preview }} />
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-16">
                <FileText size={36} className="text-[#D6E6F3]" strokeWidth={1.5} />
                <p className="text-sm text-[#6B7E92]">Предпросмотр появится после выбора DOCX файла</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Template Wizard (3-step modal) ── */
function TemplateWizard({ modal, setModal, updateField, handleUseTemplate, submitting, createdDoc, setCreatedDoc, copied, handleCopyLink, navigate, token }: any) {
  const [step, setStep] = useState(0);
  const STEPS = ['Данные', 'Поля', 'Создание'];
  const inputCls = 'w-full border border-[#D6E6F3] bg-white px-4 h-11 rounded-xl text-sm text-[#0D1B2A] placeholder-[#A6C5D7] focus:outline-none focus:ring-2 focus:ring-[#0F52BA]/20 focus:border-[#0F52BA] transition-colors';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden" style={{ maxHeight: '92vh' }}>

        {createdDoc ? (
          <div className="p-10 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-5">
              <Check size={30} className="text-[#0F7B55]" strokeWidth={1.5} />
            </div>
            <h3 className="text-2xl font-bold text-[#0D1B2A] mb-2">Договор создан!</h3>
            <p className="text-sm text-[#6B7E92] mb-8">{createdDoc.title}</p>
            <div className="w-full max-w-md bg-[#F8FAFC] border border-[#D6E6F3] rounded-xl px-5 py-4 mb-6 text-left">
              <p className="text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">Ссылка для подписания</p>
              <p className="text-sm font-mono break-all text-[#0D1B2A]">{window.location.origin}/sign/{createdDoc.uuid}</p>
            </div>
            <div className="flex gap-3 w-full max-w-md">
              <button onClick={handleCopyLink} className="flex-1 flex items-center justify-center gap-2 bg-[#0F52BA] hover:bg-[#0a3d8f] text-white font-semibold py-3 rounded-xl text-sm transition-colors">
                {copied ? <><Check size={15} />Скопировано!</> : <><Copy size={15} />Скопировать ссылку</>}
              </button>
              <button onClick={() => navigate('/documents')} className="flex-1 border border-[#D6E6F3] text-[#0D1B2A] font-semibold py-3 rounded-xl text-sm hover:bg-[#F5F8FF] transition-colors">
                К договорам
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Header with step indicator */}
            <div className="px-6 pt-5 pb-4 border-b border-[#D6E6F3] shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-[#0D1B2A]">Создать договор из шаблона</h3>
                  <p className="text-xs text-[#6B7E92] mt-0.5">{modal.template.title}</p>
                </div>
                <button onClick={() => setModal(null)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F5F8FF] text-[#6B7E92]">
                  <X size={16} />
                </button>
              </div>
              {/* Steps */}
              <div className="flex items-center">
                {STEPS.map((s, i) => (
                  <React.Fragment key={s}>
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${i <= step ? 'bg-[#0F52BA] text-white' : 'bg-[#D6E6F3] text-[#A6C5D7]'}`}>
                        {i < step ? <Check size={13} /> : i + 1}
                      </div>
                      <span className={`text-xs font-semibold ${i <= step ? 'text-[#0F52BA]' : 'text-[#A6C5D7]'}`}>{s}</span>
                    </div>
                    {i < STEPS.length - 1 && <div className={`flex-1 h-px mx-3 ${i < step ? 'bg-[#0F52BA]' : 'bg-[#D6E6F3]'}`} />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden min-h-0">
              {/* Left: step content */}
              <div className="w-1/2 border-r border-[#D6E6F3] overflow-y-auto p-6 space-y-5">
                {step === 0 && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">Название договора <span className="text-red-400">*</span></label>
                      <input value={modal.docTitle} onChange={(e: any) => setModal({ ...modal, docTitle: e.target.value })} className={inputCls} placeholder="Договор оказания услуг" />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-2">
                        Телефон клиента <span className="font-normal normal-case text-[#A6C5D7]">(для SMS подтверждения)</span>
                      </label>
                      <input type="tel" value={modal.clientPhone || ''} onChange={(e: any) => setModal({ ...modal, clientPhone: e.target.value })}
                        placeholder="+7 (___) ___-__-__" className={inputCls} />
                      <p className="text-[10px] text-[#A6C5D7] mt-1.5">Клиент введёт этот номер для подтверждения перед подписанием</p>
                    </div>
                    {modal.fields.length === 0 && (
                      <div className="bg-[#F8FAFC] border border-[#D6E6F3] rounded-xl px-4 py-3 text-sm text-[#6B7E92]">
                        Шаблон не содержит переменных — договор будет создан как есть.
                      </div>
                    )}
                  </>
                )}

                {step === 1 && (
                  <>
                    {modal.fields.length === 0 ? (
                      <p className="text-sm text-[#6B7E92] italic">Нет полей для настройки.</p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-[#6B7E92] uppercase tracking-wider">Поля ({modal.fields.length})</p>
                          <div className="flex items-center gap-3 text-[10px] text-[#6B7E92]">
                            <span className="flex items-center gap-1"><UserCheck size={11} className="text-[#0F52BA]" /> клиент</span>
                            <span className="flex items-center gap-1"><Building2 size={11} /> менеджер</span>
                          </div>
                        </div>
                        {Object.entries(groupByCategory(modal.fields)).map(([cat, catFields]: any) => {
                          const clr = catColor(cat);
                          return (
                            <div key={cat}>
                              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg mb-2 ${clr.bg}`}>
                                <span className={`w-2 h-2 rounded-full ${clr.dot}`} />
                                <span className={`text-xs font-bold uppercase tracking-wide ${clr.text}`}>{cat} ({catFields.length})</span>
                              </div>
                              <div className="space-y-2">
                                {catFields.map((f: FieldState) => (
                                  <div key={f.name} className={`border rounded-xl p-3 ${clr.border}`}>
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        <span className="text-sm font-medium text-[#0D1B2A] truncate">{humanize(f.name)}</span>
                                        <span className="text-[10px] text-[#A6C5D7] font-mono shrink-0">{`{{${f.name}}}`}</span>
                                      </div>
                                      <label className="flex items-center gap-1 cursor-pointer shrink-0 ml-2">
                                        <input type="checkbox" checked={f.isClient} onChange={() => updateField(f.name, { isClient: !f.isClient, value: '' })} className="w-3.5 h-3.5 accent-[#0F52BA]" />
                                        <UserCheck size={13} className="text-[#0F52BA]" />
                                      </label>
                                    </div>
                                    <div className="flex gap-2">
                                      <select value={f.type} onChange={(e: any) => updateField(f.name, { type: e.target.value })}
                                        className="text-xs border border-[#D6E6F3] rounded-lg px-2 py-1.5 bg-[#F8FAFC] focus:outline-none text-[#0D1B2A]">
                                        {FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}
                                      </select>
                                      {f.isClient ? (
                                        <span className="flex-1 text-xs text-[#0F52BA] italic flex items-center px-2">заполнит клиент</span>
                                      ) : (
                                        <input type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                                          value={f.value} onChange={(e: any) => updateField(f.name, { value: e.target.value })}
                                          placeholder={humanize(f.name)}
                                          className="flex-1 text-sm border border-[#D6E6F3] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-[#0F52BA] min-w-0" />
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="bg-[#F8FAFC] border border-[#D6E6F3] rounded-xl p-4">
                      <p className="text-xs font-semibold text-[#6B7E92] uppercase tracking-wider mb-3">Сводка</p>
                      {[
                        ['Шаблон', modal.template.title],
                        ['Название', modal.docTitle],
                        ['Полей клиента', modal.fields.filter((f: FieldState) => f.isClient).length],
                        ['SMS верификация', modal.clientPhone || 'не указан'],
                      ].map(([label, value]) => (
                        <div key={String(label)} className="flex justify-between text-sm py-1.5 border-b border-[#D6E6F3] last:border-0">
                          <span className="text-[#6B7E92]">{label}</span>
                          <span className="font-medium text-[#0D1B2A] text-right max-w-[60%] truncate">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-[#6B7E92]">После создания вы получите ссылку для отправки клиенту.</p>
                  </div>
                )}
              </div>

              {/* Right: preview */}
              <div className="w-1/2 flex flex-col bg-[#F8FAFC]">
                <div className="flex items-center gap-2 px-4 py-3 border-b border-[#D6E6F3] shrink-0">
                  <Eye size={15} className="text-[#0F52BA]" />
                  <span className="text-xs font-semibold text-[#6B7E92] uppercase tracking-wider">Предпросмотр</span>
                  <span className="text-xs text-[#A6C5D7] truncate ml-auto">{modal.template.file_name}</span>
                </div>
                {modal.template.file_name?.toLowerCase().endsWith('.docx') ? (
                  <DocxPreview url={`${API_BASE}/api/documents/templates/${modal.template.id}/file/`} token={token} className="flex-1 p-5" />
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <FileText size={36} className="text-[#D6E6F3] mb-3" strokeWidth={1.5} />
                    <p className="text-sm text-[#6B7E92]">Предпросмотр только для DOCX</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer navigation */}
            <div className="px-6 py-4 border-t border-[#D6E6F3] shrink-0 flex items-center justify-between">
              <button
                onClick={() => step > 0 ? setStep(step - 1) : setModal(null)}
                className="px-5 py-2.5 border border-[#D6E6F3] rounded-xl text-sm font-semibold text-[#6B7E92] hover:bg-[#F5F8FF] transition-colors"
              >
                {step === 0 ? 'Отмена' : '← Назад'}
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  onClick={() => modal.docTitle?.trim() && setStep(step + 1)}
                  disabled={!modal.docTitle?.trim()}
                  className="px-6 py-2.5 bg-[#0F52BA] hover:bg-[#0a3d8f] disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  Далее →
                </button>
              ) : (
                <button
                  onClick={handleUseTemplate}
                  disabled={submitting}
                  className="flex items-center gap-2 px-6 py-2.5 bg-[#0F52BA] hover:bg-[#0a3d8f] disabled:opacity-60 text-white font-semibold rounded-xl text-sm transition-colors"
                >
                  {submitting ? <><Loader2 size={14} className="animate-spin" />Создание…</> : <><Send size={14} />Создать договор</>}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
