import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import NCALayerService from '../lib/ncalayer';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Whatsapp } from '../components/Whatsapp';
import { AIChatWidget } from '../components/AIChatWidget';
import { Users, CheckCircle, Clock, Copy, Lock, Download, Share2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

interface Signature {
    id: number;
    client: number | null;
    client_email: string;
    client_name: string;
    signed_at: string;
}

interface Document {
    id: number;
    title: string;
    file_name: string;
    status: 'DRAFT' | 'CLOSED';
    created_at: string;
    uuid?: string;
    org_signed_at?: string;
    signatures: Signature[];
    signature_count: number;
}

export function DocumentSign() {
    const { token, user } = useAuth();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [file, setFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);


    // eGov
    const [egovModalOpen, setEgovModalOpen] = useState(false);
    const [egovSessionId, setEgovSessionId] = useState<string | null>(null);
    const [egovSignUrl, setEgovSignUrl] = useState<string | null>(null);
    const [egovStatus, setEgovStatus] = useState<'LOADING' | 'WAITING' | 'SIGNED' | 'EXPIRED' | 'ERROR'>('LOADING');
    const [currentDocId, setCurrentDocId] = useState<number | null>(null);

    // Signers panel
    const [expandedDocId, setExpandedDocId] = useState<number | null>(null);

    useEffect(() => { fetchDocuments(); }, [token]);

    // eGov polling
    useEffect(() => {
        if (!egovSessionId || egovStatus !== 'WAITING' || !currentDocId) return;
        const id = setInterval(async () => {
            try {
                const res = await fetch(`${API_BASE}/api/documents/${currentDocId}/sign_egov_status/?session_id=${egovSessionId}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data.status === 'SIGNED') {
                    setEgovStatus('SIGNED');
                    setDocuments(docs => docs.map(d => d.id === data.document.id ? data.document : d));
                    setTimeout(() => { setEgovModalOpen(false); setEgovSessionId(null); setCurrentDocId(null); }, 2000);
                } else if (data.status === 'EXPIRED') setEgovStatus('EXPIRED');
                else if (data.status === 'ERROR') setEgovStatus('ERROR');
            } catch (e) { console.error(e); }
        }, 2000);
        return () => clearInterval(id);
    }, [egovSessionId, egovStatus, currentDocId, token]);

    const fetchDocuments = async () => {
        if (!token) return;
        const res = await fetch(`${API_BASE}/api/documents/`, { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setDocuments(await res.json());
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file || !token) return;
        setLoading(true); setError(null);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('title', file.name);
        try {
            const res = await fetch(`${API_BASE}/api/documents/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData,
            });
            if (!res.ok) throw new Error('Failed to upload');
            const doc = await res.json();
            setDocuments([doc, ...documents]);
            setFile(null);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = (uuid: string) => {
        navigator.clipboard.writeText(`${window.location.origin}/sign/${uuid}`);
        alert('Ссылка скопирована!');
    };

    const handleDownload = async (doc: Document) => {
        if (!doc.uuid) return;
        try {
            const res = await fetch(`${API_BASE}/api/documents/public/${doc.uuid}/b64/`);
            if (!res.ok) { alert('Файл не найден'); return; }
            const { data, name, mime } = await res.json();
            const bytes = Uint8Array.from(atob(data), c => c.charCodeAt(0));
            const blob = new Blob([bytes], { type: mime });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = name; a.click();
            URL.revokeObjectURL(url);
        } catch (e) { alert('Ошибка при скачивании'); }
    };

    const handleOrgSign = async (doc: Document) => {
        if (!token) return;
        setLoading(true); setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/documents/${doc.id}/org_sign/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
            });
            if (res.ok) {
                const updated = await res.json();
                setDocuments(docs => docs.map(d => d.id === updated.id ? updated : d));
            } else {
                const err = await res.json();
                setError(err.detail);
            }
        } catch (e: any) { setError(e.message); }
        finally { setLoading(false); }
    };

    const handleClose = async (doc: Document) => {
        if (!token || !confirm('Закрыть договор? Новые подписи приниматься не будут.')) return;
        const res = await fetch(`${API_BASE}/api/documents/${doc.id}/close/`, {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        if (res.ok) {
            const updated = await res.json();
            setDocuments(docs => docs.map(d => d.id === updated.id ? updated : d));
        }
    };

    const handleSign = async (doc: Document) => {
        if (!token) return;
        setLoading(true); setError(null);
        try {
            const fileRes = await fetch(`${API_BASE}/api/documents/${doc.id}/file/`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const blob = await fileRes.blob();
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];
                try {
                    const signature = await NCALayerService.signFile(base64data);
                    const signRes = await fetch(`${API_BASE}/api/documents/public/${doc.uuid}/sign/`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ signature, signed_data: base64data }),
                    });
                    if (signRes.ok) {
                        const data = await signRes.json();
                        setDocuments(docs => docs.map(d => d.id === data.document.id ? data.document : d));
                        alert('Документ успешно подписан!');
                    } else {
                        const err = await signRes.json();
                        setError(err.detail || 'Ошибка при сохранении подписи');
                    }
                } catch (e: any) { setError(e.message); }
                finally { setLoading(false); }
            };
        } catch (e: any) { setError(e.message); setLoading(false); }
    };

    const handleEGovSign = async (doc: Document) => {
        setEgovModalOpen(true); setEgovStatus('LOADING'); setCurrentDocId(doc.id);
        try {
            const res = await fetch(`${API_BASE}/api/documents/${doc.id}/sign_egov_init/`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (res.ok) { setEgovSessionId(data.session_id); setEgovSignUrl(data.sign_url); setEgovStatus('WAITING'); }
            else setEgovStatus('ERROR');
        } catch { setEgovStatus('ERROR'); }
    };

    const handleMockConfirm = async () => {
        if (!egovSessionId) return;
        await fetch(`${API_BASE}/api/auth/egov/qr/confirm/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ session_id: egovSessionId, iin: user?.username || "111111111111", email: user?.email || "mock@test.com", first_name: user?.first_name || "Mock", last_name: user?.last_name || "User" })
        });
    };

    const handleVerify = async (doc: Document) => {
        const res = await fetch(`${API_BASE}/api/documents/${doc.id}/verify/`, { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        if (res.ok) {
            const orgInfo = data.org_signed_at ? `\nОрганизация подписала: ${new Date(data.org_signed_at).toLocaleString()}` : '';
            const clientInfo = data.client_signatures?.length
                ? `\nКлиенты (${data.client_signatures.length}):\n` + data.client_signatures.map((s: any) => `  • ${s.client_name} (${new Date(s.signed_at).toLocaleString()})`).join('\n')
                : '\nКлиенты: не подписан';
            alert(`Подписи договора "${doc.title}":${orgInfo}${clientInfo}`);
        } else alert(`Ошибка: ${data.detail}`);
    };


    const isOrg = user?.role === 'ORGANIZATION' || user?.role === 'SUPERADMIN' || user?.role === 'MANAGER';

    return (
        <div className="flex flex-col min-h-screen bg-background text-foreground">
            <Header />

            <main className="flex-grow pt-28 pb-12 px-4">
                <div className="container mx-auto max-w-6xl">
                    <h1 className="text-3xl font-bold mb-8 text-primary">Договоры</h1>

                    {/* Upload Form — org only */}
                    {isOrg && (
                        <div className="bg-card p-8 rounded-2xl border border-border shadow-sm mb-8">
                            <h2 className="text-xl font-semibold mb-6">Загрузить договор</h2>
                            <form onSubmit={handleUpload} className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-sm font-medium text-muted-foreground mb-2">Файл (Word / PDF)</label>
                                    <input
                                        type="file"
                                        accept=".docx,.pdf,.doc"
                                        onChange={e => setFile(e.target.files?.[0] || null)}
                                        className="block w-full text-sm text-foreground file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-secondary file:text-secondary-foreground hover:file:bg-secondary/80 border border-border rounded-xl cursor-pointer bg-input-background"
                                    />
                                </div>
                                <Button disabled={!file || loading} type="submit" className="h-11 px-6 rounded-xl">
                                    {loading ? 'Загрузка...' : 'Загрузить'}
                                </Button>
                            </form>
                            {error && <div className="text-destructive mt-3 text-sm">{error}</div>}
                        </div>
                    )}

                    {/* Documents Table */}
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <table className="min-w-full divide-y divide-border">
                            <thead className="bg-muted/50">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Название</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Дата</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Подпись орг.</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Подписали клиенты</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-muted-foreground uppercase">Статус</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-muted-foreground uppercase">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border bg-card">
                                {documents.map(doc => (
                                    <React.Fragment key={doc.id}>
                                        <tr className="hover:bg-muted/20 transition-colors">
                                            {/* Title */}
                                            <td className="px-6 py-4">
                                                <a
                                                    href={`${API_BASE}/api/documents/public/${doc.uuid}/file/`}
                                                    target="_blank" rel="noreferrer"
                                                    className="text-primary hover:underline font-bold"
                                                >
                                                    {doc.title}
                                                </a>
                                            </td>

                                            {/* Date */}
                                            <td className="px-6 py-4 text-sm text-muted-foreground whitespace-nowrap">
                                                {new Date(doc.created_at).toLocaleDateString()}
                                            </td>

                                            {/* Org signature */}
                                            <td className="px-6 py-4">
                                                {doc.org_signed_at ? (
                                                    <span className="flex items-center gap-1 text-xs font-semibold text-blue-700">
                                                        <CheckCircle className="w-3.5 h-3.5" />
                                                        {new Date(doc.org_signed_at).toLocaleDateString()}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                                        <Clock className="w-3.5 h-3.5" /> Нет
                                                    </span>
                                                )}
                                            </td>

                                            {/* Client signatures count */}
                                            <td className="px-6 py-4">
                                                <button
                                                    onClick={() => setExpandedDocId(expandedDocId === doc.id ? null : doc.id)}
                                                    className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
                                                >
                                                    <Users className="w-4 h-4" />
                                                    {doc.signature_count} чел.
                                                </button>
                                            </td>

                                            {/* Status */}
                                            <td className="px-6 py-4">
                                                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${doc.status === 'CLOSED'
                                                    ? 'bg-gray-100 text-gray-600 border border-gray-200'
                                                    : 'bg-green-100 text-green-700 border border-green-200'}`}>
                                                    {doc.status === 'CLOSED' ? 'Закрыт' : 'Активен'}
                                                </span>
                                            </td>

                                            {/* Actions */}
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 flex-wrap">
                                                    {/* Client sign buttons */}
                                                    {!isOrg && doc.status !== 'CLOSED' && (
                                                        <>
                                                            <Button size="sm" onClick={() => handleSign(doc)} disabled={loading} className="bg-primary text-primary-foreground">
                                                                <Lock className="w-3 h-3 mr-1" /> ЭЦП
                                                            </Button>
                                                            <Button size="sm" variant="outline" onClick={() => handleEGovSign(doc)} className="border-blue-500 text-blue-600 hover:bg-blue-50">
                                                                📱 eGov
                                                            </Button>
                                                        </>
                                                    )}

                                                    {/* Org buttons */}
                                                    {isOrg && (
                                                        <>
                                                            {!doc.org_signed_at && (
                                                                <Button size="sm" variant="outline" onClick={() => handleOrgSign(doc)} disabled={loading} className="border-blue-500 text-blue-600 hover:bg-blue-50">
                                                                    Подписать
                                                                </Button>
                                                            )}
                                                            {doc.status !== 'CLOSED' && (
                                                                <Button size="sm" variant="outline" onClick={() => handleClose(doc)} className="border-red-300 text-red-600 hover:bg-red-50">
                                                                    Закрыть
                                                                </Button>
                                                            )}
                                                        </>
                                                    )}

                                                    {doc.uuid && (
                                                        <button
                                                            onClick={() => handleDownload(doc)}
                                                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                                                        >
                                                            <Download className="w-3 h-3" /> Скачать
                                                        </button>
                                                    )}
                                                    {isOrg && doc.uuid && doc.status !== 'CLOSED' && (
                                                        <Button size="sm" variant="outline" onClick={() => handleCopyLink(doc.uuid!)} className="border-blue-300 text-blue-600 hover:bg-blue-50">
                                                            <Share2 className="w-3 h-3 mr-1" /> Поделиться
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="outline" onClick={() => handleVerify(doc)} className="border-primary text-primary hover:bg-primary/5">
                                                        Проверить
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>

                                        {/* Expanded signers list */}
                                        {expandedDocId === doc.id && doc.signatures.length > 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-4 bg-blue-50">
                                                    <p className="text-xs font-semibold text-blue-700 mb-2 uppercase tracking-wider">Подписавшие клиенты</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {doc.signatures.map(sig => (
                                                            <div key={sig.id} className="flex items-center gap-2 bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-sm">
                                                                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                                                                <div>
                                                                    <span className="font-medium">{sig.client_name}</span>
                                                                    {sig.client_email && <span className="text-gray-500 ml-1">({sig.client_email})</span>}
                                                                    <span className="text-gray-400 ml-2 text-xs">{new Date(sig.signed_at).toLocaleString()}</span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                        {expandedDocId === doc.id && doc.signatures.length === 0 && (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-4 bg-gray-50 text-sm text-gray-500 italic">
                                                    Пока никто из клиентов не подписал этот договор.
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))}
                                {documents.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                                            Нет договоров.
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

            <AIChatWidget />

            {/* eGov QR Modal */}
            {egovModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative">
                        <button onClick={() => setEgovModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">✕</button>
                        <div className="text-center">
                            <h3 className="text-xl font-bold mb-2">Подписание через eGov Mobile</h3>
                            <p className="text-gray-500 text-sm mb-6">Откройте eGov Mobile и отсканируйте QR код.</p>
                            <div className="flex justify-center mb-6">
                                {egovStatus === 'LOADING' && <div className="h-48 w-48 flex items-center justify-center bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}
                                {egovStatus === 'WAITING' && egovSignUrl && <div className="p-4 bg-white rounded-xl border-2 border-gray-100 shadow-sm"><QRCodeSVG value={egovSignUrl} size={180} /></div>}
                                {egovStatus === 'SIGNED' && <div className="h-48 w-48 flex flex-col items-center justify-center bg-green-50 rounded-xl"><div className="text-4xl mb-2">✅</div><div className="text-green-700 font-medium">Подписано!</div></div>}
                                {egovStatus === 'ERROR' && <div className="h-48 w-48 flex flex-col items-center justify-center bg-red-50 rounded-xl"><div className="text-red-500 font-medium">Ошибка</div></div>}
                            </div>
                            {import.meta.env.DEV && egovStatus === 'WAITING' && (
                                <button onClick={handleMockConfirm} className="mb-4 px-4 py-2 bg-gray-100 text-gray-600 rounded text-xs hover:bg-gray-200">[DEV] Simulate Scan</button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
