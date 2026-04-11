import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Plus, Trash2, FileText } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

interface Template {
    id: number;
    title: string;
    description: string;
    file: string;
    created_at: string;
}

export function Templates() {
    const { token, user } = useAuth();
    const [templates, setTemplates] = useState<Template[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchTemplates();
    }, [token]);

    const fetchTemplates = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/documents/templates/`, {
                headers: { Authorization: `Token ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setTemplates(data);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !token) return;

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', title || file.name);
        formData.append('description', description);

        try {
            const res = await fetch(`${API_BASE}/api/documents/templates/`, {
                method: 'POST',
                headers: { Authorization: `Token ${token}` },
                body: formData,
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || 'Upload failed');
            }

            const newTemplate = await res.json();
            setTemplates([newTemplate, ...templates]);
            setFile(null);
            setTitle('');
            setDescription('');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!token || !confirm('Delete this template?')) return;
        try {
            await fetch(`${API_BASE}/api/documents/templates/${id}/`, {
                method: 'DELETE',
                headers: { Authorization: `Token ${token}` },
            });
            setTemplates(templates.filter(t => t.id !== id));
        } catch (e) {
            console.error(e);
        }
    };

    if (user?.role !== 'ORGANIZATION' && user?.role !== 'SUPERADMIN') {
        return (
            <div className="flex flex-col min-h-screen">
                <Header />
                <main className="flex-grow pt-28 pb-12 px-4 flex items-center justify-center">
                    <p className="text-gray-500">Access denied.</p>
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
                    <h1 className="text-3xl font-bold mb-8 text-primary">Шаблоны документов</h1>

                    {/* Upload Form */}
                    <div className="bg-card p-8 rounded-2xl border border-border shadow-sm mb-8">
                        <h2 className="text-xl font-semibold mb-6">Добавить шаблон</h2>
                        <form onSubmit={handleUpload} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Название</label>
                                <input
                                    value={title}
                                    onChange={e => setTitle(e.target.value)}
                                    placeholder="Название шаблона"
                                    className="w-full border border-border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Описание</label>
                                <input
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Краткое описание шаблона"
                                    className="w-full border border-border px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-muted-foreground mb-1">Файл</label>
                                <input
                                    type="file"
                                    onChange={e => setFile(e.target.files?.[0] || null)}
                                    className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 border border-border rounded-lg cursor-pointer"
                                    required
                                />
                            </div>
                            {error && <div className="text-destructive text-sm">{error}</div>}
                            <Button type="submit" disabled={!file || loading} className="w-full">
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
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Описание</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Дата</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {templates.map(tmpl => (
                                    <tr key={tmpl.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-primary" />
                                                <a
                                                    href={tmpl.file.startsWith('http') ? tmpl.file : `${API_BASE}${tmpl.file}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="font-medium text-primary hover:underline"
                                                >
                                                    {tmpl.title}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">{tmpl.description || '—'}</td>
                                        <td className="px-6 py-4 text-sm text-muted-foreground">
                                            {new Date(tmpl.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDelete(tmpl.id)}
                                                className="border-destructive text-destructive hover:bg-destructive/10"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
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
        </div>
    );
}
