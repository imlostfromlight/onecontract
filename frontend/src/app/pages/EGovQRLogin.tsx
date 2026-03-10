import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';

interface EGovQRLoginProps {
    onSuccess: (data: { token: string; user: any }) => void;
    onCancel: () => void;
}

export function EGovQRLogin({ onSuccess, onCancel }: EGovQRLoginProps) {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [signUrl, setSignUrl] = useState<string | null>(null);
    const [status, setStatus] = useState<'LOADING' | 'WAITING' | 'SIGNED' | 'EXPIRED' | 'ERROR'>('LOADING');
    const navigate = useNavigate();

    // 1. Initialize QR Session
    useEffect(() => {
        const initSession = async () => {
            try {
                const res = await fetch('https://onecontract.onrender.com/api/auth/egov/qr/init/', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                });
                const data = await res.json();
                if (res.ok) {
                    setSessionId(data.session_id);
                    setSignUrl(data.sign_url);
                    setStatus('WAITING');
                } else {
                    setStatus('ERROR');
                }
            } catch (e) {
                console.error(e);
                setStatus('ERROR');
            }
        };
        initSession();
    }, []);

    // 2. Poll Status
    useEffect(() => {
        if (!sessionId || status !== 'WAITING') return;

        const intervalId = setInterval(async () => {
            try {
                const res = await fetch(`https://onecontract.onrender.com/api/auth/egov/qr/status/?session_id=${sessionId}`);
                const data = await res.json();

                if (data.status === 'SIGNED') {
                    console.log('Logged in via QR', data);
                    setStatus('SIGNED');
                    onSuccess({ token: data.token, user: data.user });
                } else if (data.status === 'EXPIRED') {
                    setStatus('EXPIRED');
                }
            } catch (e) {
                console.error(e);
            }
        }, 2000);

        return () => clearInterval(intervalId);
    }, [sessionId, status, onSuccess]);

    const handleMockConfirm = async () => {
        if (!sessionId) return;
        try {
            await fetch('https://onecontract.onrender.com/api/auth/egov/qr/confirm/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: sessionId,
                    iin: "123456789012",
                    email: "qr.user@example.com",
                    first_name: "QR",
                    last_name: "User"
                })
            });
            // Polling will pick it up
        } catch (e) {
            console.error(e);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-6 py-6">

            <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Сканируйте QR-код</h3>
                <p className="text-gray-500 text-sm">Откройте eGov Mobile и сканируйте код для входа</p>
            </div>

            {status === 'LOADING' && <div>Загрузка QR кода...</div>}

            {status === 'WAITING' && signUrl && (
                <div className="bg-white p-4 rounded-xl border-2 border-gray-100 shadow-sm">
                    <QRCodeSVG value={signUrl} size={200} />
                </div>
            )}

            {status === 'SIGNED' && (
                <div className="text-green-600 font-medium animate-pulse">
                    Успешно! Вход в систему...
                </div>
            )}

            {status === 'EXPIRED' && (
                <div className="text-red-500">
                    Время действия QR кода истекло.
                    <button onClick={() => window.location.reload()} className="underline ml-2">Обновить</button>
                </div>
            )}

            {status === 'ERROR' && (
                <div className="text-red-500">Ошибка соединения с сервером.</div>
            )}

            {/* DEV ONLY BUTTON */}
            {import.meta.env.DEV && status === 'WAITING' && (
                <div className="mt-4 pt-4 border-t w-full text-center">
                    <p className="text-xs text-gray-400 mb-2">Development Mode Only</p>
                    <Button variant="outline" size="sm" onClick={handleMockConfirm}>
                        Simulate Scan (Mock)
                    </Button>
                </div>
            )}

            <Button variant="ghost" onClick={onCancel} className="mt-4">
                Отмена
            </Button>
        </div>
    );
}
