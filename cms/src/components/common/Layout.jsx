import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, PenSquare, LogOut, Palette, Sparkles } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import SessionTimer from '../auth/SessionTimer';

const Layout = ({ children, hideSidebar = false }) => {
    const location = useLocation();
    const { logout, user } = useAuthStore();

    const navItems = [
        { label: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
        { label: 'Create Article', path: '/create', icon: <PenSquare size={20} /> },
        { label: 'Layout Templates', path: '/layouts', icon: <Palette size={20} /> },
        { label: 'New Legacy Editor', path: '/freeform-layouts', icon: <Sparkles size={20} /> },
    ];

    // Full-width layout without sidebar
    if (hideSidebar) {
        return (
            <div className="h-screen bg-gray-100 flex flex-col">
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        );
    }

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <aside className="w-64 bg-white shadow-md flex flex-col">
                <div className="p-6 border-b">
                    <h1 className="text-2xl font-bold text-primary">Digital Jagran</h1>
                    <p className="text-xs text-secondary mt-1">Admin Portal</p>
                </div>

                <nav className="flex-1 p-4 space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${location.pathname === item.path
                                ? 'bg-blue-50 text-primary font-medium'
                                : 'text-gray-600 hover:bg-gray-50'
                                }`}
                        >
                            {item.icon}
                            {item.label}
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t">
                    <button
                        onClick={logout}
                        className="flex items-center gap-3 px-4 py-3 w-full text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                        <LogOut size={20} />
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center px-8">
                    <h2 className="text-xl font-semibold text-gray-800">
                        {navItems.find(i => i.path === location.pathname)?.label || 'Admin'}
                    </h2>
                    <div className="flex items-center gap-4">
                        <SessionTimer />
                        <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center font-bold">
                            A
                        </div>
                        <span className="text-sm font-medium text-gray-700">{user?.email || 'Admin'}</span>
                    </div>
                </header>
                <div className="p-8">
                    {children}
                </div>
            </main>
        </div>
    );
};

export default Layout;
