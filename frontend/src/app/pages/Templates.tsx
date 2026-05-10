import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Plus, Trash2, FileText, Send, X, Copy, Check, Pencil, Share2, UserCheck, Building2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

const COMMON_VARS = ['имя', 'фамилия', 'дата', 'сумма', 'адрес', 'телефон', 'компания', 'иин'];

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
    if (/дата|date|күн|кун/.test(n)) return 'date';
    if (/иин|жсн|iin/.test(n)) return 'iin';
    if (/тел|phone/.test(n)) return 'phone';
    if (/сумм|цен|стоимост|оплат|число/.test(n)) return 'number';
    return 'text';
}

function autoCategory(name: string): string {
    const n = name.toLowerCase();
    if (/имя|аты|фами|жөн|иин|жсн|тел|адрес|email|заказчик|клиент|ученик|покупател/.test(n))
        return 'ДАННЫЕ ЗАКАЗЧИКА';
    if (/сумм|цен|стоимост|оплат|тариф/.test(n))
        return 'ОПЛАТА';
    return 'УСЛОВИЯ ДОГОВОРА';
}

function humanize(name: string): string {
    return name.replace(/_/g, ' ');
}

function groupByCategory(fields: FieldState[]): Record<string, FieldState[]> {
    const groups: Record<string, FieldState[]> = {};
    for (const f of fields) {
        const cat = autoCategory(f.name);
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(f);
    }
    return groups;
}

const CAT_COLORS: Record<string, { dot: string; text: string; bg: string }> = {
    'ДАННЫЕ ЗАКАЗЧИКА': { dot: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50' },
    'ОПЛАТА': { dot: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50' },
    'УСЛОВИЯ ДОГОВОРА': { dot: 'bg-purple-500', text: 'text-purple-700', bg: 'bg-purple-50' },
};
function catColor(cat: string) {
    return CAT_COLORS[cat] || { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' };
}

interface FieldState {
    name: string;
    type: FieldType;
    isClient: boolean;
    value: string;
}

interface Template {
    id: number;
    title: string;
    description: string;
    file_key: string;
    file_name: string;
    template_fields: string[];
    created_at: string;
}

interface UseTemplateModal {
    template: Template;
    docTitle: string;
    fields: FieldState[];
}

interface CreatedDoc {
    uuid: string;
    title: string;
}

function EditorToolbar({
    textareaRef,
    value,
    onChange,
}: {
    textareaRef: React.RefObject<HTMLTextAreaElement>;
    value: string;
    onChange: (v: string) => void;
}) {
    const [customVar, setCustomVar] = useState('');

    const insert = (varName: string) => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newVal = value.slice(0, start) + `{{${varName}}}` + value.slice(end);
        onChange(newVal);
        requestAnimationFrame(() => {
            el.selectionStart = el.selectionEnd = start + varName.length + 4;
            el.focus();
        });
    };

    return (
        <div className="flex flex-wrap items-center gap-1.5 mb-2 p-2 bg-muted/50 rounded-lg border border-border">
            <span className="text-xs text-muted-foreground mr-1">Вставить:</span>
            {COMMON_VARS.map(v => (
                <button
                    key={v}
                    type="button"
                    onClick={() => insert(v)}
                    className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 font-mono transition-colors"
                >
                    {`{{${v}}}`}
                </button>
            ))}
            <div className="flex gap-1 ml-auto">
                <input
                    value={customVar}
                    onChange={e => setCustomVar(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && customVar) { insert(customVar); setCustomVar(''); } }}
                    placeholder="своя переменная"
                    className="text-xs px-2 py-1 border border-border rounded bg-background w-32 focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                    type="button"
                    onClick={() => { if (customVar.trim()) { insert(customVar.trim()); setCustomVar(''); } }}
                    className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
                >
                    + добавить
                </button>
            </div>
        </div>
    );
}

export function Templates() {
    const { token, user } = useAuth();
    const navigate = useNavigate();

    const [templates, setTemplates] = useState<Template[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [justCreated, setJustCreated] = useState<Template | null>(null);

    // Upload mode state
    const [createMode, setCreateMode] = useState<'upload' | 'editor'>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');

    // Editor (create) state
    const [editorContent, setEditorContent] = useState('');
    const createTextareaRef = useRef<HTMLTextAreaElement>(null);

    // Use-template modal
    const [modal, setModal] = useState<UseTemplateModal | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [createdDoc, setCreatedDoc] = useState<CreatedDoc | null>(null);
    const [copied, setCopied] = useState(false);

    // Edit template modal
    const [editModal, setEditModal] = useState<{ template: Template; } | null>(null);
    const [editContent, setEditContent] = useState('');
    const [editTitle, setEditTitle] = useState('');
    const [editSaving, setEditSaving] = useState(false);
    const editTextareaRef = useRef<HTMLTextAreaElement>(null);

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
        if (!token) return;
        setLoading(true); setError(null);

        const formData = new FormData();
        if (createMode === 'upload') {
            if (!file) return;
            formData.append('file', file);
            formData.append('title', title || file.name);
        } else {
            if (!editorContent.trim()) return;
            formData.append('content', editorContent);
            formData.append('title', title || 'Шаблон');
        }
        formData.append('description', description);

        try {
            const res = await fetch(`${API_BASE}/api/documents/templates/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Upload failed');
            const tmpl = await res.json();
            setTemplates([tmpl, ...templates]);
            setJustCreated(tmpl);
            setFile(null); setTitle(''); setDescription(''); setEditorContent('');
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

    const openEditModal = async (tmpl: Template) => {
        try {
            const res = await fetch(`${API_BASE}/api/documents/templates/${tmpl.id}/text/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error(`Server error: ${res.status}`);
            const data = await res.json();
            setEditModal({ template: tmpl });
            setEditContent(data.content || '');
            setEditTitle(tmpl.title);
        } catch (e: any) {
            alert('Не удалось загрузить шаблон: ' + e.message);
        }
    };

    const handleSaveEdit = async () => {
        if (!editModal || !token) return;
        setEditSaving(true);
        try {
            const res = await fetch(`${API_BASE}/api/documents/templates/${editModal.template.id}/text/`, {
                method: 'PUT',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ content: editContent, title: editTitle }),
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Ошибка');
            const updated = await res.json();
            setTemplates(templates.map(t => t.id === updated.id ? updated : t));
            setEditModal(null);
        } catch (err: any) {
            alert(err.message);
        } finally {
            setEditSaving(false);
        }
    };

    const openModal = (tmpl: Template) => {
        const fields: FieldState[] = tmpl.template_fields.map(name => ({
            name,
            type: autoType(name),
            isClient: true,
            value: '',
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
                body: JSON.stringify({
                    title: modal.docTitle,
                    fields: managerFields,
                    client_fields: clientFields,
                }),
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Failed');
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

    if (!isAllowed) {
        return (
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-grow pt-28 flex items-center justify-center">
                    <p className="text-gray-500">Доступ запрещён.</p>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <Header />

            <main className="flex-grow pt-28 pb-12 px-4">
                <div className="container mx-auto max-w-4xl">
                    <h1 className="text-3xl font-bold mb-8 text-primary">Шаблоны договоров</h1>

                    {/* Create Template Section */}
                    <div className="bg-card p-8 rounded-2xl border border-border shadow-sm mb-8">
                        <h2 className="text-xl font-semibold mb-4">Добавить шаблон</h2>

                        {/* Mode toggle */}
                        <div className="flex gap-2 mb-6">
                            <button
                                type="button"
                                onClick={() => setCreateMode('upload')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${createMode === 'upload' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                            >
                                Загрузить файл
                            </button>
                            <button
                                type="button"
                                onClick={() => setCreateMode('editor')}
                                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${createMode === 'editor' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/80'}`}
                            >
                                Создать в редакторе
                            </button>
                        </div>

                        <form onSubmit={handleUpload} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Название</label>
                                    <input
                                        value={title}
                                        onChange={e => setTitle(e.target.value)}
                                        placeholder="Договор аренды"
                                        className="w-full border border-border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Описание</label>
                                    <input
                                        value={description}
                                        onChange={e => setDescription(e.target.value)}
                                        placeholder="Краткое описание"
                                        className="w-full border border-border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                    />
                                </div>
                            </div>

                            {createMode === 'upload' ? (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Файл (.docx / .pdf)</label>
                                    <p className="text-xs text-muted-foreground mb-2">
                                        Используйте плейсхолдеры вида <code className="bg-muted px-1 rounded">{'{{имя_поля}}'}</code> в документе.
                                    </p>
                                    <input
                                        type="file"
                                        accept=".docx,.pdf,.doc"
                                        onChange={e => setFile(e.target.files?.[0] || null)}
                                        className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 border border-border rounded-lg cursor-pointer"
                                        required
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium mb-1">Содержимое шаблона</label>
                                    <EditorToolbar
                                        textareaRef={createTextareaRef}
                                        value={editorContent}
                                        onChange={setEditorContent}
                                    />
                                    <textarea
                                        ref={createTextareaRef}
                                        value={editorContent}
                                        onChange={e => setEditorContent(e.target.value)}
                                        placeholder={`Введите текст договора...\n\nНапример:\nДоговор аренды\n\nАрендатор: {{имя}} {{фамилия}}\nАдрес: {{адрес}}\nСумма: {{сумма}} тенге\nДата: {{дата}}`}
                                        className="w-full border border-border px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background font-mono text-sm resize-y"
                                        style={{ minHeight: '260px' }}
                                        required
                                    />
                                </div>
                            )}

                            {error && <div className="text-destructive text-sm">{error}</div>}
                            <Button
                                type="submit"
                                disabled={(createMode === 'upload' ? !file : !editorContent.trim()) || loading}
                                className="w-full md:w-auto"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                {loading ? 'Сохранение...' : 'Добавить шаблон'}
                            </Button>
                        </form>

                        {/* Just-created field preview */}
                        {justCreated && (
                            <div className="mt-6 border-t pt-5">
                                <div className="flex items-center justify-between mb-3">
                                    <p className="text-sm font-semibold text-green-700 flex items-center gap-1.5">
                                        <Check className="w-4 h-4" /> Шаблон «{justCreated.title}» создан
                                    </p>
                                    <button onClick={() => setJustCreated(null)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                                </div>
                                {justCreated.template_fields.length > 0 ? (
                                    <>
                                        <p className="text-xs text-gray-500 mb-2">Обнаруженные поля ({justCreated.template_fields.length}):</p>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {justCreated.template_fields.map(f => {
                                                const clr = catColor(autoCategory(f));
                                                return (
                                                    <span key={f} className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-mono ${clr.bg} ${clr.text}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${clr.dot}`} />
                                                        {`{{${f}}}`}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                        <Button size="sm" onClick={() => { openModal(justCreated); setJustCreated(null); }} className="bg-blue-600 hover:bg-blue-700 text-white">
                                            <Send className="w-3 h-3 mr-1" /> Настроить поля и создать договор
                                        </Button>
                                    </>
                                ) : (
                                    <p className="text-xs text-gray-400 italic">В документе не найдено полей {'{{field}}'}. Используйте редактор чтобы добавить их.</p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Templates List */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Название</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Поля</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Дата</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {templates.map(tmpl => (
                                    <tr key={tmpl.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                                                <div>
                                                    <button
                                                        onClick={async () => {
                                                            const res = await fetch(`${API_BASE}/api/documents/templates/${tmpl.id}/file/`, { headers: { Authorization: `Bearer ${token}` } });
                                                            if (!res.ok) return;
                                                            const blob = await res.blob();
                                                            const a = document.createElement('a');
                                                            a.href = URL.createObjectURL(blob);
                                                            a.download = tmpl.file_name || tmpl.title;
                                                            a.click();
                                                        }}
                                                        className="font-medium text-primary hover:underline text-left"
                                                    >
                                                        {tmpl.title}
                                                    </button>
                                                    {tmpl.description && (
                                                        <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 max-w-xs">
                                            {tmpl.template_fields.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {tmpl.template_fields.map(f => (
                                                        <span key={f} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono max-w-[12rem] truncate" title={f}>
                                                            {'{{'}{f}{'}}'}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">—</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                                            {new Date(tmpl.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => openModal(tmpl)}
                                                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                                                >
                                                    <Send className="w-3 h-3 mr-1" />
                                                    Использовать
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => openEditModal(tmpl)}
                                                >
                                                    <Pencil className="w-3 h-3 mr-1" />
                                                    Изменить
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleDelete(tmpl.id)}
                                                    className="border-destructive text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {templates.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                            Нет шаблонов. Добавьте первый шаблон выше.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <Footer />

            {/* Edit Template Modal */}
            {editModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 relative flex flex-col" style={{ maxHeight: '90vh' }}>
                        <button onClick={() => setEditModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-bold mb-4">Редактировать шаблон</h3>

                        <div className="mb-3">
                            <label className="block text-sm font-medium mb-1">Название</label>
                            <input
                                value={editTitle}
                                onChange={e => setEditTitle(e.target.value)}
                                className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            />
                        </div>

                        <div className="flex-1 flex flex-col min-h-0">
                            <label className="block text-sm font-medium mb-1">Содержимое</label>
                            <EditorToolbar
                                textareaRef={editTextareaRef}
                                value={editContent}
                                onChange={setEditContent}
                            />
                            <textarea
                                ref={editTextareaRef}
                                value={editContent}
                                onChange={e => setEditContent(e.target.value)}
                                className="flex-1 w-full border border-gray-300 px-4 py-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm resize-none"
                                style={{ minHeight: '300px' }}
                            />
                        </div>

                        <div className="flex gap-3 mt-4">
                            <Button
                                onClick={handleSaveEdit}
                                disabled={editSaving}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                {editSaving ? 'Сохранение...' : 'Сохранить'}
                            </Button>
                            <Button variant="outline" onClick={() => setEditModal(null)} className="flex-1">
                                Отмена
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Use Template Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl relative flex flex-col" style={{ maxHeight: '92vh' }}>
                        <button onClick={() => setModal(null)} className="absolute top-4 right-4 z-10 text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>

                        {createdDoc ? (
                            <div className="p-8 text-center">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Check className="w-6 h-6 text-green-600" />
                                </div>
                                <h3 className="text-xl font-bold mb-1">Договор создан!</h3>
                                <p className="text-sm text-gray-500 mb-6">{createdDoc.title}</p>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 mb-4 text-left">
                                    <p className="text-xs text-gray-500 mb-1">Ссылка для клиента:</p>
                                    <p className="text-sm font-mono break-all text-gray-800">
                                        {window.location.origin}/sign/{createdDoc.uuid}
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <Button onClick={handleCopyLink} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                                        {copied ? <><Check className="w-4 h-4 mr-1" />Скопировано</> : <><Copy className="w-4 h-4 mr-1" />Скопировать ссылку</>}
                                    </Button>
                                    <Button variant="outline" onClick={() => navigate('/documents')} className="flex-1">
                                        Перейти к договорам
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="px-6 py-4 border-b flex-shrink-0">
                                    <h3 className="text-lg font-bold text-gray-900">Создать договор из шаблона</h3>
                                    <p className="text-sm text-gray-500">Шаблон: <strong>{modal.template.title}</strong></p>
                                </div>

                                <div className="flex flex-1 overflow-hidden min-h-0">
                                    {/* Left: field configuration */}
                                    <div className="w-1/2 flex flex-col overflow-y-auto border-r p-6 gap-5">
                                        <div>
                                            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Название договора *</label>
                                            <input
                                                value={modal.docTitle}
                                                onChange={e => setModal({ ...modal, docTitle: e.target.value })}
                                                className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                        </div>

                                        {modal.fields.length > 0 ? (
                                            <div>
                                                <div className="flex items-center justify-between mb-3">
                                                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                                        Поля ({modal.fields.length})
                                                    </label>
                                                    <span className="text-xs text-gray-400 flex items-center gap-2">
                                                        <UserCheck className="w-3 h-3 inline" /> клиент
                                                        <Building2 className="w-3 h-3 inline ml-1" /> менеджер
                                                    </span>
                                                </div>
                                                {Object.entries(groupByCategory(modal.fields)).map(([cat, catFields]) => {
                                                    const clr = catColor(cat);
                                                    return (
                                                        <div key={cat} className="mb-5">
                                                            <div className={`flex items-center gap-2 px-2 py-1 rounded-md mb-2 ${clr.bg}`}>
                                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${clr.dot}`} />
                                                                <span className={`text-xs font-semibold uppercase tracking-wide ${clr.text}`}>{cat} ({catFields.length})</span>
                                                            </div>
                                                            <div className="space-y-2">
                                                                {catFields.map(f => (
                                                                    <div key={f.name} className="border border-gray-200 rounded-lg p-3">
                                                                        <div className="flex items-center justify-between mb-2">
                                                                            <div className="flex items-center gap-1.5 min-w-0">
                                                                                <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${clr.dot}`} />
                                                                                <span className="text-sm font-medium text-gray-800 truncate">{humanize(f.name)}</span>
                                                                                <span className="text-xs text-gray-400 font-mono flex-shrink-0">{`{{${f.name}}}`}</span>
                                                                            </div>
                                                                            <label className="flex items-center gap-1 cursor-pointer flex-shrink-0 ml-2">
                                                                                <input
                                                                                    type="checkbox"
                                                                                    checked={f.isClient}
                                                                                    onChange={() => updateField(f.name, { isClient: !f.isClient, value: '' })}
                                                                                    className="w-3.5 h-3.5 accent-blue-600"
                                                                                />
                                                                                <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                                                                            </label>
                                                                        </div>
                                                                        <div className="flex gap-2">
                                                                            <select
                                                                                value={f.type}
                                                                                onChange={e => updateField(f.name, { type: e.target.value as FieldType })}
                                                                                className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-gray-50 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                                                            >
                                                                                {FIELD_TYPES.map(ft => (
                                                                                    <option key={ft.value} value={ft.value}>{ft.label}</option>
                                                                                ))}
                                                                            </select>
                                                                            {f.isClient ? (
                                                                                <span className="flex-1 text-xs text-blue-500 italic flex items-center px-2">заполнит клиент при подписании</span>
                                                                            ) : (
                                                                                <input
                                                                                    type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                                                                                    value={f.value}
                                                                                    onChange={e => updateField(f.name, { value: e.target.value })}
                                                                                    placeholder={`Введите ${humanize(f.name)}`}
                                                                                    className="flex-1 text-sm border border-gray-200 rounded px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0"
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
                                            <p className="text-sm text-gray-400 italic">Этот шаблон не содержит переменных. Договор будет создан как есть.</p>
                                        )}
                                    </div>

                                    {/* Right: document preview */}
                                    <div className="w-1/2 flex flex-col overflow-y-auto bg-gray-50 p-6">
                                        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-200">
                                            <FileText className="w-4 h-4 text-gray-400" />
                                            <span className="text-sm font-medium text-gray-600 truncate">{modal.template.file_name || modal.template.title}</span>
                                        </div>

                                        {modal.fields.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center flex-1 text-center">
                                                <FileText className="w-10 h-10 text-gray-200 mb-3" />
                                                <p className="text-sm text-gray-400">Добавьте поля слева — превью появится автоматически</p>
                                            </div>
                                        ) : (
                                            <div className="space-y-4">
                                                {Object.entries(groupByCategory(modal.fields)).map(([cat, catFields]) => {
                                                    const clr = catColor(cat);
                                                    return (
                                                        <div key={cat}>
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${clr.dot}`} />
                                                                <span className={`text-xs font-semibold uppercase tracking-wide ${clr.text}`}>{cat} ({catFields.length})</span>
                                                            </div>
                                                            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
                                                                {catFields.map(f => (
                                                                    <div key={f.name} className="flex items-center justify-between px-3 py-2">
                                                                        <span className="text-xs text-gray-700">{humanize(f.name)}</span>
                                                                        <div className="flex items-center gap-2">
                                                                            {f.isClient ? (
                                                                                <UserCheck className="w-3.5 h-3.5 text-blue-500" />
                                                                            ) : f.value ? (
                                                                                <span className="text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded max-w-[8rem] truncate">{f.value}</span>
                                                                            ) : (
                                                                                <Building2 className="w-3.5 h-3.5 text-gray-300" />
                                                                            )}
                                                                            <span className="text-xs text-gray-400">{FIELD_TYPES.find(ft => ft.value === f.type)?.label || f.type}</span>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                                <p className="text-xs text-gray-400 flex items-center gap-1 flex-wrap">
                                                    <UserCheck className="w-3 h-3" /> — заполняет клиент,
                                                    <Building2 className="w-3 h-3 ml-1" /> — заполняет менеджер, значение = заполнено
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="px-6 py-4 border-t flex-shrink-0 flex gap-3">
                                    <Button onClick={handleUseTemplate} disabled={submitting} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white">
                                        {submitting ? 'Создание...' : 'Создать договор'}
                                    </Button>
                                    <Button variant="outline" onClick={() => setModal(null)} className="flex-1">
                                        Отмена
                                    </Button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
