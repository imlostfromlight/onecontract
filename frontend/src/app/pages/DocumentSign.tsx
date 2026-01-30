import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import NCALayerService from '../lib/ncalayer';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Whatsapp } from '../components/Whatsapp';
import { AISummaryModal } from '../components/AISummaryModal';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';

interface Document {
    id: number;
    title: string;
    file: string;
    status: 'DRAFT' | 'SIGNED';
    created_at: string;
    signed_at?: string;
}

export function DocumentSign() {
    const { token, user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // AI Summary state
    const [summaryModalOpen, setSummaryModalOpen] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [currentSummary, setCurrentSummary] = useState<{
        key_points: string[];
        suspicious_clauses: string[];
    } | null>(null);
    const [summaryDocTitle, setSummaryDocTitle] = useState<string>('');

    useEffect(() => {
        fetchDocuments();
    }, [token]);

    const fetchDocuments = async () => {
        if (!token) return;
        try {
            const res = await fetch(`${API_BASE}/api/documents/`, {
                headers: { Authorization: `Token ${token}` },
            });
            if (res.ok) {
                const data = await res.json();
                setDocuments(data);
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
        formData.append('title', file.name);

        try {
            // 1. Upload
            const res = await fetch(`${API_BASE}/api/documents/`, {
                method: 'POST',
                headers: { Authorization: `Token ${token}` },
                body: formData,
            });

            if (!res.ok) throw new Error('Failed to upload');

            const doc = await res.json();
            setDocuments([doc, ...documents]);
            setFile(null);

            // 2. Auto-trigger sign? Or let user click sign?
            // User asked to "submit and sign", so let's try to do it in flow or offer a button.
            // Let's offer a "Sign Now" button on the item.
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async (doc: Document) => {
        if (!token) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Get file content as Base64 (NCALayer needs it)
            // Since we already uploaded it, we might not have it in memory if it's from the list.
            // But for newly uploaded, we can keep it.
            // If we want to sign *any* document from list, we need to download it or use its hash.
            // NCALayer needs the DATA to sign (if we use createCAdESFromBase64).
            // Downloading the file from backend to sign it is a bit heavy, but correct for "File Signing".

            // Let's fetch the file blob
            const fileRes = await fetch(doc.file); // doc.file is absolute URL usually?
            let blob = await fileRes.blob();

            // Convert to Base64
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];

                try {
                    // 2. Sign with NCALayer
                    const signature = await NCALayerService.signFile(base64data);

                    // 3. Send signature to backend
                    const signRes = await fetch(`${API_BASE}/api/documents/${doc.id}/sign/`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Token ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            signature: signature,
                            signed_data: base64data // Optional, for verification
                        })
                    });

                    if (signRes.ok) {
                        const updatedDoc = await signRes.json();
                        setDocuments(docs => docs.map(d => d.id === updatedDoc.id ? updatedDoc : d));
                        alert('Документ успешно подписан!');
                    } else {
                        const err = await signRes.json();
                        throw new Error(err.detail || 'Ошибка при сохранении подписи');
                    }
                } catch (e: any) {
                    console.error(e);
                    setError(e.message);
                } finally {
                    setLoading(false);
                }
            };
        } catch (e: any) {
            setError(e.message);
            setLoading(false);
        }
    };

    const handleVerify = async (doc: Document) => {
        try {
            const res = await fetch(`${API_BASE}/api/documents/${doc.id}/verify/`, {
                headers: { Authorization: `Token ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                alert(`Документ подписан:\n\nКем: ${data.signer}\nИИН: ${data.iin}\nДата: ${new Date(data.signed_at).toLocaleString()}`);
            } else {
                alert(`Ошибка проверки: ${data.detail || data.error}`);
            }
        } catch (e) {
            console.error(e);
            alert('Ошибка сети при проверке подписи');
        }
    };

    const handleSummarize = async (doc: Document) => {
        setSummaryDocTitle(doc.title);
        setSummaryModalOpen(true);
        setSummaryLoading(true);
        setSummaryError(null);
        setCurrentSummary(null);

        try {
            const res = await fetch(`${API_BASE}/api/documents/${doc.id}/summarize/`, {
                headers: { Authorization: `Token ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setCurrentSummary({
                    key_points: data.key_points || [],
                    suspicious_clauses: data.suspicious_clauses || []
                });
            } else {
                setSummaryError(data.detail || 'Ошибка анализа документа');
            }
        } catch (e) {
            console.error(e);
            setSummaryError('Ошибка сети при анализе документа');
        } finally {
            setSummaryLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <Header />

            <main className="flex-grow pt-28 pb-12 px-4">
                <div className="container mx-auto max-w-5xl">
                    <h1 className="text-3xl font-bold mb-8 text-primary">Подписание документов</h1>

                    {/* Upload Form - Only for Organization and Superadmin */}
                    {(user?.role === 'ORGANIZATION' || user?.role === 'SUPERADMIN') && (
                        <div className="bg-card p-8 rounded-2xl border border-border shadow-sm mb-8">
                            <h2 className="text-xl font-semibold mb-6 text-foreground">Загрузить документ</h2>
                            <form onSubmit={handleUpload} className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">
                                        Выберите файл
                                    </label>
                                    <input
                                        type="file"
                                        onChange={e => setFile(e.target.files?.[0] || null)}
                                        className="block w-full text-sm text-foreground 
                                        file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 
                                        file:text-sm file:font-semibold file:bg-secondary 
                                        file:text-secondary-foreground hover:file:bg-secondary/80
                                        border border-border rounded-xl cursor-pointer bg-input-background"
                                    />
                                </div>
                                <Button disabled={!file || loading} type="submit" className="h-11 px-6 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground">
                                    {loading ? 'Загрузка...' : 'Загрузить'}
                                </Button>
                            </form>
                            {error && <div className="text-destructive mt-3 text-sm font-medium">{error}</div>}
                        </div>
                    )}

                    {/* Document List */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Название</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Дата</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Статус</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {documents.map(doc => (
                                    <tr key={doc.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="max-w-md break-words whitespace-normal">
                                                <a
                                                    href={doc.file.startsWith('http') ? doc.file : `${API_BASE}${doc.file}`}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-primary hover:underline font-medium"
                                                >
                                                    {doc.title}
                                                </a>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${doc.status === 'SIGNED'
                                                ? 'bg-green-100 text-green-800 border border-green-200'
                                                : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                                                }`}>
                                                {doc.status === 'SIGNED' ? 'Подписан' : 'Черновик'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleSummarize(doc)}
                                                    className="border-purple-300 text-purple-600 hover:bg-purple-50 rounded-lg"
                                                >
                                                    🤖 AI Анализ
                                                </Button>
                                                {doc.status !== 'SIGNED' && (
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleSign(doc)}
                                                        disabled={loading}
                                                        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                                                    >
                                                        Подписать ЭЦП
                                                    </Button>
                                                )}
                                                {doc.status === 'SIGNED' && (
                                                    <>
                                                        <span className="text-green-600 bg-green-50 p-1 rounded-full">✓</span>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleVerify(doc)}
                                                            className="border-primary text-primary hover:bg-primary/5 rounded-lg"
                                                        >
                                                            Проверить
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {documents.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-muted-foreground">
                                            Нет загруженных документов
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            <Footer />
            <Whatsapp />

            {/* AI Summary Modal */}
            <AISummaryModal
                isOpen={summaryModalOpen}
                onClose={() => setSummaryModalOpen(false)}
                loading={summaryLoading}
                error={summaryError}
                summary={currentSummary}
                documentTitle={summaryDocTitle}
            />
        </div>
    );
}
