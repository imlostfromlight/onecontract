import React from 'react';
import { Button } from './ui/button';

interface AISummaryModalProps {
    isOpen: boolean;
    onClose: () => void;
    loading: boolean;
    error: string | null;
    summary: {
        key_points: string[];
        suspicious_clauses: string[];
    } | null;
    documentTitle?: string;
}

export function AISummaryModal({
    isOpen,
    onClose,
    loading,
    error,
    summary,
    documentTitle
}: AISummaryModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden border border-border mx-4">
                {/* Header */}
                <div className="px-6 py-4 border-b border-border bg-muted/30">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                <span className="text-white text-lg">🤖</span>
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-foreground">AI Анализ документа</h2>
                                {documentTitle && (
                                    <p className="text-sm text-muted-foreground truncate max-w-[300px]">{documentTitle}</p>
                                )}
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-8 h-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                        >
                            ✕
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {loading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
                            <p className="text-muted-foreground">Анализируем документ с помощью AI...</p>
                        </div>
                    )}

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4">
                            <p className="text-destructive font-medium">Ошибка анализа</p>
                            <p className="text-destructive/80 text-sm mt-1">{error}</p>
                        </div>
                    )}

                    {summary && !loading && (
                        <div className="space-y-6">
                            {/* Key Points */}
                            <div>
                                <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                                    <span className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-sm">📋</span>
                                    Ключевые пункты
                                </h3>
                                <ul className="space-y-2">
                                    {summary.key_points.map((point, index) => (
                                        <li
                                            key={index}
                                            className="flex items-start gap-3 text-sm text-foreground/90 bg-muted/30 rounded-lg p-3"
                                        >
                                            <span className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-medium flex-shrink-0 mt-0.5">
                                                {index + 1}
                                            </span>
                                            <span>{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            {/* Suspicious Clauses */}
                            {summary.suspicious_clauses.length > 0 && (
                                <div>
                                    <h3 className="text-base font-semibold text-foreground mb-3 flex items-center gap-2">
                                        <span className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center text-sm">⚠️</span>
                                        Подозрительные пункты
                                    </h3>
                                    <ul className="space-y-2">
                                        {summary.suspicious_clauses.map((clause, index) => (
                                            <li
                                                key={index}
                                                className="flex items-start gap-3 text-sm bg-amber-500/10 border border-amber-500/20 rounded-lg p-3"
                                            >
                                                <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-600 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                                                    !
                                                </span>
                                                <span className="text-amber-700 dark:text-amber-300">{clause}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {summary.suspicious_clauses.length === 0 && (
                                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 flex items-center gap-3">
                                    <span className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center text-lg">✓</span>
                                    <div>
                                        <p className="text-green-700 dark:text-green-300 font-medium">Подозрительных пунктов не обнаружено</p>
                                        <p className="text-green-600/70 dark:text-green-400/70 text-sm">AI не нашел потенциально рискованных условий</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border bg-muted/20">
                    <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">
                            Powered by AI • Это автоматический анализ, рекомендуется внимательно прочитать документ
                        </p>
                        <Button
                            onClick={onClose}
                            variant="outline"
                            className="rounded-lg"
                        >
                            Закрыть
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
