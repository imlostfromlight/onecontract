import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react'; // Add QRCodeSVG import
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import NCALayerService from '../lib/ncalayer';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Whatsapp } from '../components/Whatsapp';
import { AISummaryModal } from '../components/AISummaryModal';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

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

    // --- eGov Mobile QR State ---
    const [egovModalOpen, setEgovModalOpen] = useState(false);
    const [egovSessionId, setEgovSessionId] = useState<string | null>(null);
    const [egovSignUrl, setEgovSignUrl] = useState<string | null>(null);
    const [egovStatus, setEgovStatus] = useState<'LOADING' | 'WAITING' | 'SIGNED' | 'EXPIRED' | 'ERROR'>('LOADING');
    const [currentDocId, setCurrentDocId] = useState<number | null>(null);

    // eGov Polling
    useEffect(() => {
        if (!egovSessionId || egovStatus !== 'WAITING' || !currentDocId) return;

        const intervalId = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE}/api/documents/${currentDocId}/sign_egov_status/?session_id=${egovSessionId}`, {
                    headers: { Authorization: `Token ${token}` }
                });
                const data = await res.json();

                if (data.status === 'SIGNED') {
                    setEgovStatus('SIGNED');
                    // Update document in list
                    setDocuments(docs => docs.map(d => d.id === data.document.id ? data.document : d));
                    // Close modal after delay
                    setTimeout(() => {
                        setEgovModalOpen(false);
                        setEgovSessionId(null);
                        setCurrentDocId(null);
                        // alert("Документ успешно подписан через eGov Mobile!");
                    }, 2000);
                } else if (data.status === 'EXPIRED') {
                    setEgovStatus('EXPIRED');
                } else if (data.status === 'ERROR') {
                    setEgovStatus('ERROR');
                    // Don't close immediately, let user see error
                }
            } catch (e) {
                console.error(e);
            }
        }, 2000);
        return () => clearInterval(intervalId);
    }, [egovSessionId, egovStatus, currentDocId, token]);


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

    const handleEGovSign = async (doc: Document) => {
        setEgovModalOpen(true);
        setEgovStatus('LOADING');
        setCurrentDocId(doc.id);

        try {
            // Use 0 as offset for doc.id if needed, but it should be doc.id
            const res = await fetch(`${API_BASE}/api/documents/${doc.id}/sign_egov_init/`, {
                method: 'POST',
                headers: { Authorization: `Token ${token}` },
            });
            const data = await res.json();
            if (res.ok) {
                setEgovSessionId(data.session_id);
                setEgovSignUrl(data.sign_url);
                setEgovStatus('WAITING');
            } else {
                setEgovStatus('ERROR');
                console.error(data);
            }
        } catch (e) {
            console.error(e);
            setEgovStatus('ERROR');
        }
    };

    // Dev Helper
    const handleMockConfirm = async () => {
        if (!egovSessionId) return;
        try {
            await fetch(`${API_BASE}/api/auth/egov/qr/confirm/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: egovSessionId,
                    iin: user?.username || "111111111111",
                    email: user?.email || "mock@test.com",
                    first_name: user?.first_name || "Mock",
                    last_name: user?.last_name || "User"
                })
            });
        } catch (e) { console.error(e); }
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
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleSign(doc)}
                                                            disabled={loading}
                                                            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
                                                        >
                                                            Подписать ЭЦП
                                                        </Button>

                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleEGovSign(doc)}
                                                            className="border-blue-500 text-blue-600 hover:bg-blue-50 rounded-lg ml-2"
                                                        >
                                                            📱 eGov Mobile
                                                        </Button>
                                                    </>
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

            {/* eGov QR Modal */}
            {egovModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative animate-in fade-in zoom-in duration-200">
                        <button
                            onClick={() => setEgovModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            ✕
                        </button>

                        <div className="text-center">
                            <h3 className="text-xl font-bold mb-2 text-gray-900">Подписание через eGov Mobile</h3>
                            <p className="text-gray-500 text-sm mb-6">
                                Откройте приложение eGov Mobile, выберите "eGov QR" и отсканируйте код.
                            </p>

                            <div className="flex justify-center mb-6">
                                {egovStatus === 'LOADING' && (
                                    <div className="h-48 w-48 flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                    </div>
                                )}

                                {egovStatus === 'WAITING' && egovSignUrl && (
                                    <div className="p-4 bg-white rounded-xl border-2 border-gray-100 shadow-sm">
                                        <QRCodeSVG value={egovSignUrl} size={180} />
                                    </div>
                                )}

                                {egovStatus === 'SIGNED' && (
                                    <div className="h-48 w-48 flex flex-col items-center justify-center bg-green-50 rounded-xl">
                                        <div className="text-4xl mb-2">✅</div>
                                        <div className="text-green-700 font-medium">Подписано!</div>
                                    </div>
                                )}

                                {egovStatus === 'ERROR' && (
                                    <div className="h-48 w-48 flex flex-col items-center justify-center bg-red-50 rounded-xl">
                                        <div className="text-red-500 font-medium">Ошибка</div>
                                    </div>
                                )}
                            </div>

                            {/* Dev Mock Button */}
                            {import.meta.env.DEV && egovStatus === 'WAITING' && (
                                <button
                                    onClick={handleMockConfirm}
                                    className="mb-4 px-4 py-2 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200"
                                >
                                    [DEV] Simulate Mobile Scan
                                </button>
                            )}

                            <div className="text-xs text-gray-400">
                                Используйте ЭЦП, привязанный к вашему аккаунту.
                            </div>
                        </div>
                    </div>
                </div>
            )}



        </div>
    );
}
