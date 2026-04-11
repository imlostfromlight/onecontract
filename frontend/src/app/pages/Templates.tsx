import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Plus, Trash2, FileText, Send, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

interface Template {
    id: number;
    title: string;
    description: string;
    file: string;
    template_fields: string[];
    created_at: string;
}

interface UseTemplateModal {
    template: Template;
    fields: Record<string, string>;
    docTitle: string;
}

export function Templates() {
    const { token, user } = useAuth();
    const navigate = useNavigate();

    const [templates, setTemplates] = useState<Template[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // "Use template" modal state
    const [modal, setModal] = useState<UseTemplateModal | null>(null);
    const [submitting, setSubmitting] = useState(false);

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
        if (!file || !token) return;
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
            if (!res.ok) throw new Error((await res.json()).detail || 'Upload failed');
            const tmpl = await res.json();
            setTemplates([tmpl, ...templates]);
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
        const fields: Record<string, string> = {};
        tmpl.template_fields.forEach(f => { fields[f] = ''; });
        setModal({ template: tmpl, fields, docTitle: tmpl.title });
    };

    const handleUseTemplate = async () => {
        if (!modal || !token) return;
        setSubmitting(true);
        try {
            const res = await fetch(`${API_BASE}/api/documents/templates/${modal.template.id}/use/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: modal.docTitle, fields: modal.fields }),
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Failed');
            setModal(null);
            navigate('/documents');
        } catch (err: any) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (user?.role !== 'ORGANIZATION' && user?.role !== 'SUPERADMIN') {
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

                    {/* Upload Form */}
                    <div className="bg-card p-8 rounded-2xl border border-border shadow-sm mb-8">
                        <h2 className="text-xl font-semibold mb-2">Добавить шаблон</h2>
                        <p className="text-sm text-muted-foreground mb-6">
                            Загрузите .docx файл с плейсхолдерами вида <code className="bg-muted px-1 rounded">{'{{имя_поля}}'}</code>.
                            Система автоматически обнаружит переменные.
                        </p>
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
                            <div>
                                <label className="block text-sm font-medium mb-1">Файл (.docx / .pdf)</label>
                                <input
                                    type="file"
                                    accept=".docx,.pdf,.doc"
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                    className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 border border-border rounded-lg cursor-pointer"
                                    required
                                />
                            </div>
                            {error && <div className="text-destructive text-sm">{error}</div>}
                            <Button type="submit" disabled={!file || loading} className="w-full md:w-auto">
                                <Plus className="w-4 h-4 mr-2" />
                                {loading ? 'Загрузка...' : 'Добавить шаблон'}
                            </Button>
                        </form>
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
                                                    <a
                                                        href={tmpl.file.startsWith('http') ? tmpl.file : `${API_BASE}${tmpl.file}`}
                                                        target="_blank" rel="noreferrer"
                                                        className="font-medium text-primary hover:underline"
                                                    >
                                                        {tmpl.title}
                                                    </a>
                                                    {tmpl.description && (
                                                        <p className="text-xs text-muted-foreground">{tmpl.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {tmpl.template_fields.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {tmpl.template_fields.map(f => (
                                                        <span key={f} className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
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

            {/* Use Template Modal */}
            {modal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
                        <button
                            onClick={() => setModal(null)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <h3 className="text-xl font-bold mb-1">Создать договор из шаблона</h3>
                        <p className="text-sm text-gray-500 mb-6">Шаблон: <strong>{modal.template.title}</strong></p>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Название договора</label>
                                <input
                                    value={modal.docTitle}
                                    onChange={e => setModal({ ...modal, docTitle: e.target.value })}
                                    className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>

                            {modal.template.template_fields.length > 0 && (
                                <>
                                    <hr />
                                    <p className="text-sm font-semibold text-gray-700">Заполните поля договора:</p>
                                    {modal.template.template_fields.map(field => (
                                        <div key={field}>
                                            <label className="block text-sm font-medium mb-1 capitalize">
                                                {field.replace(/_/g, ' ')}
                                                <span className="ml-1 text-xs text-gray-400 font-normal">{'{{'}{field}{'}}'}</span>
                                            </label>
                                            <input
                                                value={modal.fields[field] || ''}
                                                onChange={e => setModal({
                                                    ...modal,
                                                    fields: { ...modal.fields, [field]: e.target.value }
                                                })}
                                                placeholder={`Введите ${field.replace(/_/g, ' ')}`}
                                                className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            />
                                        </div>
                                    ))}
                                </>
                            )}

                            {modal.template.template_fields.length === 0 && (
                                <p className="text-sm text-gray-400 italic">
                                    Этот шаблон не содержит переменных. Договор будет создан как есть.
                                </p>
                            )}

                            <div className="flex gap-3 pt-2">
                                <Button
                                    onClick={handleUseTemplate}
                                    disabled={submitting}
                                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                                >
                                    {submitting ? 'Создание...' : 'Создать договор'}
                                </Button>
                                <Button variant="outline" onClick={() => setModal(null)} className="flex-1">
                                    Отмена
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
