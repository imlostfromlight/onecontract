import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import NCALayerService from '../lib/ncalayer';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { AIChatWidget } from '../components/AIChatWidget';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

interface Document {
    id: number;
    title: string;
    file_key: string;
    file_name: string;
    status: 'DRAFT' | 'CLOSED';
    created_at: string;
    uuid: string;
    signature_count: number;
    org_signed_at?: string;
    client_fields: Array<{ name: string; type: string } | string>;
}

export function PublicDocumentSign() {
    const { uuid } = useParams();
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [document, setDocument] = useState<Document | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Client field filling state
    const [step, setStep] = useState<'fill' | 'sign'>('fill');
    const [clientValues, setClientValues] = useState<Record<string, string>>({});
    const [filling, setFilling] = useState(false);

    useEffect(() => {
        if (uuid) fetchDocument();
    }, [uuid]);

    const normalizedFields = (document?.client_fields ?? []).map(f =>
        typeof f === 'string' ? { name: f, type: 'text' } : f
    );

    useEffect(() => {
        if (document) {
            const fields = (document.client_fields ?? []).map(f =>
                typeof f === 'string' ? { name: f, type: 'text' } : f
            );
            if (fields.length === 0) setStep('sign');
            else {
                const init: Record<string, string> = {};
                fields.forEach(f => { init[f.name] = ''; });
                setClientValues(init);
                setStep('fill');
            }
        }
    }, [document]);

    const fetchDocument = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/documents/public/${uuid}/`);
            if (res.ok) {
                const data = await res.json();
                setDocument(data);
            } else {
                setError('Документ не найден или ссылка устарела.');
            }
        } catch {
            setError('Не удалось загрузить документ.');
        } finally {
            setLoading(false);
        }
    };

    const handleFillFields = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!document) return;
        setFilling(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/api/documents/public/${uuid}/fill/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fields: clientValues }),
            });
            if (!res.ok) throw new Error((await res.json()).detail || 'Ошибка заполнения');
            const data = await res.json();
            setDocument(data.document);
            setStep('sign');
        } catch (e: any) {
            setError(e.message);
        } finally {
            setFilling(false);
        }
    };

    const handleSign = async () => {
        if (!token) {
            alert('Пожалуйста, войдите чтобы подписать документ.');
            navigate('/login');
            return;
        }
        if (!document) return;
        setLoading(true);
        setError(null);

        try {
            const fileUrl = `${API_BASE}/api/documents/public/${document.uuid}/file/`;
            const fileRes = await fetch(fileUrl);
            const blob = await fileRes.blob();

            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];
                try {
                    const signature = await NCALayerService.signFile(base64data);

                    const signRes = await fetch(`${API_BASE}/api/documents/public/${document.uuid}/sign/`, {
                        method: 'POST',
                        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ signature }),
                    });

                    if (signRes.ok) {
                        alert('Документ успешно подписан!');
                        fetchDocument();
                    } else {
                        const text = await signRes.text();
                        let detail = 'Signing failed';
                        try { detail = JSON.parse(text).detail || detail; } catch {}
                        throw new Error(detail);
                    }
                } catch (e: any) {
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

    if (loading) return <div className="min-h-screen flex items-center justify-center">Загрузка...</div>;
    if (error && !document) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
    if (!document) return null;

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col">
            <Header />
            <main className="flex-grow pt-24 pb-12 px-4">
                <div className="container mx-auto max-w-3xl">
                    <div className="bg-white rounded-2xl shadow-sm p-8 border border-gray-100">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{document.title}</h1>
                                <p className="text-gray-500 text-sm mt-1">Документ для подписания</p>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-sm font-semibold ${document.status === 'CLOSED' ? 'bg-gray-100 text-gray-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {document.status === 'CLOSED' ? 'Закрыт' : `Активен · ${document.signature_count} подписей`}
                            </div>
                        </div>

                        {/* Document Preview */}
                        <div className="bg-gray-100 rounded-xl p-6 mb-8 flex flex-col items-center justify-center min-h-[200px] border-2 border-dashed border-gray-200">
                            <a
                                href={`${API_BASE}/api/documents/public/${document.uuid}/file/`}
                                download
                                className="text-blue-600 hover:underline font-medium text-lg mb-2"
                            >
                                📄 Открыть документ
                            </a>
                            <p className="text-gray-500 text-sm">Ознакомьтесь с документом перед заполнением и подписанием.</p>
                        </div>

                        {/* Org signature badge */}
                        {document.org_signed_at && (
                            <div className="mb-6 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                                ✓ Организация подписала: {new Date(document.org_signed_at).toLocaleString()}
                            </div>
                        )}

                        {error && (
                            <div className="mb-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-2">{error}</div>
                        )}

                        {document.status === 'CLOSED' ? (
                            <Button variant="outline" className="w-full text-gray-600 border-gray-200 bg-gray-50" disabled>
                                Документ закрыт
                            </Button>
                        ) : step === 'fill' && normalizedFields.length > 0 ? (
                            /* ── Step 1: Fill client fields ── */
                            <form onSubmit={handleFillFields} className="space-y-4">
                                <div className="border-t pt-4">
                                    <h2 className="text-base font-semibold text-gray-800 mb-1">Заполните ваши данные</h2>
                                    <p className="text-sm text-gray-500 mb-4">Эти данные будут вставлены в документ автоматически.</p>
                                    {normalizedFields.map(f => (
                                        <div key={f.name} className="mb-3">
                                            <label className="block text-sm font-medium text-gray-700 mb-1 capitalize">
                                                {f.name.replace(/_/g, ' ')}
                                            </label>
                                            <input
                                                required
                                                type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                                                inputMode={f.type === 'number' || f.type === 'iin' || f.type === 'phone' ? 'numeric' : undefined}
                                                value={clientValues[f.name] || ''}
                                                onChange={e => setClientValues({ ...clientValues, [f.name]: e.target.value })}
                                                placeholder={f.type === 'date' ? undefined : `Введите ${f.name.replace(/_/g, ' ')}`}
                                                className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                            />
                                        </div>
                                    ))}
                                </div>
                                <Button type="submit" disabled={filling} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl">
                                    {filling ? 'Сохранение...' : 'Подтвердить данные и перейти к подписанию'}
                                </Button>
                            </form>
                        ) : (
                            /* ── Step 2: Sign + Download ── */
                            <div className="flex flex-col gap-4">
                                <div className="flex gap-3 justify-end flex-wrap">
                                    <a
                                        href={`${API_BASE}/api/documents/public/${document.uuid}/file/`}
                                        download
                                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
                                    >
                                        ⬇ Скачать документ
                                    </a>
                                    <Button
                                        onClick={handleSign}
                                        disabled={loading}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-600/20"
                                    >
                                        Подписать через NCALayer
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-400 text-right">
                                    Скачайте документ, чтобы проверить правильность данных перед подписанием.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
            <AIChatWidget />
        </div>
    );
}
