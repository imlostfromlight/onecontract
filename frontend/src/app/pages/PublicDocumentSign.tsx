import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import NCALayerService from '../lib/ncalayer';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { AISummaryModal } from '../components/AISummaryModal';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

interface Document {
    id: number;
    title: string;
    file: string;
    status: 'DRAFT' | 'SIGNED';
    created_at: string;
    uuid: string;
}

export function PublicDocumentSign() {
    const { uuid } = useParams();
    const { token, user } = useAuth();
    const navigate = useNavigate();
    const [document, setDocument] = useState<Document | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // AI Summary state
    const [summaryModalOpen, setSummaryModalOpen] = useState(false);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [currentSummary, setCurrentSummary] = useState<{
        key_points: string[];
        suspicious_clauses: string[];
    } | null>(null);

    useEffect(() => {
        if (uuid) {
            fetchDocument();
        }
    }, [uuid]);

    const fetchDocument = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/documents/public/${uuid}/`);
            if (res.ok) {
                const data = await res.json();
                setDocument(data);
            } else {
                setError('Document not found or link expired.');
            }
        } catch (e) {
            setError('Failed to load document.');
        } finally {
            setLoading(false);
        }
    };

    const handleSign = async () => {
        if (!token) {
            // Force login if not authenticated
            // Save return URL?
            alert('Please login to sign this document.');
            navigate('/login');
            return;
        }

        if (!document) return;
        setLoading(true);
        setError(null);

        try {
            // 1. Fetch file content
            const fileRes = await fetch(document.file);
            let blob = await fileRes.blob();

            // 2. Convert to Base64
            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];
                try {
                    // 3. Sign
                    const signature = await NCALayerService.signFile(base64data);

                    // 4. Send to backend (use public_sign endpoint)
                    const signRes = await fetch(`${API_BASE}/api/documents/public/${document.uuid}/sign/`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `Token ${token}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            signature: signature,
                            signed_data: base64data
                        })
                    });

                    if (signRes.ok) {
                        alert('Document signed successfully!');
                        // Reload or redirect
                        fetchDocument();
                    } else {
                        const err = await signRes.json();
                        throw new Error(err.detail || 'Signing failed');
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

    const handleSummarize = async () => {
        if (!document) return;
        setSummaryModalOpen(true);
        setSummaryLoading(true);
        setSummaryError(null);
        setCurrentSummary(null);

        try {
            const res = await fetch(`${API_BASE}/api/documents/public/${document.uuid}/summarize/`);
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

    if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    if (error) return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
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
                                <p className="text-gray-500 text-sm mt-1">Shared with you for signature</p>
                            </div>
                            <div className={`px-4 py-1.5 rounded-full text-sm font-semibold ${document.status === 'SIGNED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                }`}>
                                {document.status === 'SIGNED' ? 'Signed' : 'Pending Signature'}
                            </div>
                        </div>

                        {/* Document Preview */}
                        <div className="bg-gray-100 rounded-xl p-8 mb-8 flex flex-col items-center justify-center min-h-[300px] border-2 border-dashed border-gray-200">
                            <a href={document.file} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-medium text-lg mb-4">
                                📄 Open Document PDF
                            </a>
                            <p className="text-gray-500 text-sm mb-4">Please review the document before signing.</p>

                            {/* AI Summary Button */}
                            <Button
                                onClick={handleSummarize}
                                variant="outline"
                                className="border-purple-300 text-purple-600 hover:bg-purple-50 rounded-lg"
                            >
                                🤖 AI Анализ документа
                            </Button>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-4">
                            {document.status !== 'SIGNED' ? (
                                <Button
                                    onClick={handleSign}
                                    disabled={loading}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl shadow-lg shadow-blue-600/20"
                                >
                                    Sign with NCALayer
                                </Button>
                            ) : (
                                <Button
                                    variant="outline"
                                    className="text-green-600 border-green-200 bg-green-50"
                                    disabled
                                >
                                    ✓ Document Signed
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
            <Footer />

            {/* AI Summary Modal */}
            <AISummaryModal
                isOpen={summaryModalOpen}
                onClose={() => setSummaryModalOpen(false)}
                loading={summaryLoading}
                error={summaryError}
                summary={currentSummary}
                documentTitle={document?.title}
            />
        </div>
    );
}
