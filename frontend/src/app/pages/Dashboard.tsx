import { useState, useEffect } from 'react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { useAuth } from '../hooks/useAuth';
import { Button } from '../components/ui/button';
import { Plus, FileText, CheckCircle, Clock, Copy, ExternalLink, LogOut } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_BASE || 'https://onecontract.onrender.com';

interface Document {
    id: number;
    title: string;
    status: 'DRAFT' | 'SIGNED';
    created_at: string;
    client?: number;
    uuid?: string; // Should be available from backend now
}

export function Dashboard() {
    const { user, token, logout } = useAuth();
    const navigate = useNavigate();
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);

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
        } finally {
            setLoading(false);
        }
    };

    const handleCopyLink = (uuid: string) => {
        const link = `${window.location.origin}/sign/${uuid}`;
        navigator.clipboard.writeText(link);
        alert('Invite link copied to clipboard!');
    };

    const handleSwitchAccount = () => {
        logout();
        navigate('/login');
    };

    const stats = [
        { label: 'Total Contracts', value: documents.length, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Signed', value: documents.filter(d => d.status === 'SIGNED').length, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Pending', value: documents.filter(d => d.status === 'DRAFT').length, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
    ];

    return (
        <DashboardLayout>
            {/* Welcome Section */}
            <div className="mb-8 flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Welcome back, {user?.first_name || 'User'}</h2>
                    <p className="text-gray-600 mt-1">Here's what's happening with your contracts today.</p>
                </div>
                <div className="flex items-center gap-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${user?.role === 'SUPERADMIN' ? 'bg-purple-100 text-purple-800' :
                            user?.role === 'ADMIN' ? 'bg-indigo-100 text-indigo-800' :
                                user?.role === 'ORGANIZATION' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                        }`}>
                        {user?.role || 'CLIENT'}
                    </span>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {stats.map((stat) => (
                    <div key={stat.label} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg ${stat.bg} flex items-center justify-center ${stat.color}`}>
                            <stat.icon className="w-6 h-6" />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Actions & Recent Contracts */}
            <div className="flex flex-col lg:flex-row gap-8">
                {/* Main Column */}
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Recent Contracts</h3>
                        <Link to="/documents">
                            <Button variant="ghost" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50">
                                View All
                            </Button>
                        </Link>
                    </div>

                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Contract Name</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {documents.slice(0, 5).map((doc) => (
                                    <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <span className="font-medium text-gray-900">{doc.title}</span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${doc.status === 'SIGNED' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {doc.status === 'SIGNED' ? 'Signed' : 'Pending'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right flex justify-end gap-2">
                                            {/* Share Button for Pending Docs */}
                                            {doc.status !== 'SIGNED' && doc.uuid && (user?.role === 'ORGANIZATION' || user?.role === 'SUPERADMIN') && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => handleCopyLink(doc.uuid!)}
                                                    className="text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100"
                                                    title="Copy Invite Link"
                                                >
                                                    <Copy className="w-4 h-4 mr-1" />
                                                    Link
                                                </Button>
                                            )}

                                            <Link to="/documents">
                                                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-gray-600">
                                                    View
                                                </Button>
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                                {documents.length === 0 && (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                            No contracts found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Sidebar Column (Quick Actions) */}
                <div className="w-full lg:w-80">
                    {/* CTA Card */}
                    {(user?.role === 'ORGANIZATION' || user?.role === 'SUPERADMIN') && (
                        <div className="bg-gradient-to-br from-blue-900 to-indigo-900 rounded-xl p-6 text-white shadow-lg mb-6">
                            <h3 className="text-xl font-bold mb-2">Create New Contract</h3>
                            <p className="text-blue-100 text-sm mb-6">Upload a document and send it for signature.</p>
                            <Link to="/documents">
                                <Button className="w-full bg-white text-blue-900 hover:bg-blue-50">
                                    <Plus className="w-4 h-4 mr-2" /> Upload Contract
                                </Button>
                            </Link>
                        </div>
                    )}

                    {/* Switch Account Card */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-gray-100 rounded-full">
                                <LogOut className="w-5 h-5 text-gray-600" />
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-900">Switch Account</h3>
                                <p className="text-xs text-gray-500">Log out to switch user</p>
                            </div>
                        </div>
                        <Button variant="outline" onClick={handleSwitchAccount} className="w-full">
                            Sign Out & Switch
                        </Button>
                    </div>

                    {/* Help Card */}
                    <div className="bg-white rounded-xl p-6 border border-gray-200">
                        <h3 className="font-bold text-gray-900 mb-2">Need Help?</h3>
                        <p className="text-sm text-gray-500 mb-4">Contact our support team for assistance with OneContract.</p>
                        <Button variant="outline" className="w-full">
                            Contact Support
                        </Button>
                    </div>
                </div>
            </div>
        </DashboardLayout>
    );
}
