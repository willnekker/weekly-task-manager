import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/client';
import toast from 'react-hot-toast';

const AdminPanel = () => {
    const [settings, setSettings] = useState({ allow_signups: true });
    const [users, setUsers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const [settingsRes, usersRes] = await Promise.all([
                apiClient.get('/admin/settings'),
                apiClient.get('/admin/users'),
            ]);
            setSettings(settingsRes.data);
            setUsers(usersRes.data);
        } catch (error) {
            toast.error("Failed to load admin data.");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleToggleSignups = async () => {
        const newSetting = !settings.allow_signups;
        try {
            await apiClient.put('/admin/settings', { allow_signups: newSetting });
            setSettings({ allow_signups: newSetting });
            toast.success(`Sign-ups have been ${newSetting ? 'enabled' : 'disabled'}.`);
        } catch (error) {
            toast.error("Failed to update settings.");
        }
    };

    if (isLoading) {
        return <div className="p-4 bg-gray-100 border-b border-t border-border-color text-center">Loading Admin Panel...</div>;
    }

    return (
        <div className="bg-gray-50 border-b border-t border-border-color p-4 md:p-6">
            <div className="max-w-4xl mx-auto">
                <h2 className="text-lg font-bold mb-4">Admin Panel</h2>
                <div className="grid md:grid-cols-2 gap-6">
                    {/* Settings */}
                    <div className="bg-card-bg p-4 rounded-lg border border-border-color">
                        <h3 className="font-semibold mb-3">Application Settings</h3>
                        <div className="flex items-center justify-between">
                            <label htmlFor="allow-signups" className="text-sm text-text-primary">Allow New User Sign-ups</label>
                            <div 
                                onClick={handleToggleSignups} 
                                className={`relative inline-flex items-center h-6 rounded-full w-11 cursor-pointer transition-colors ${settings.allow_signups ? 'bg-primary' : 'bg-gray-200'}`}
                            >
                                <span className={`inline-block w-4 h-4 transform bg-white rounded-full transition-transform ${settings.allow_signups ? 'translate-x-6' : 'translate-x-1'}`}/>
                            </div>
                        </div>
                    </div>
                    {/* User List */}
                    <div className="bg-card-bg p-4 rounded-lg border border-border-color">
                        <h3 className="font-semibold mb-3">Registered Users ({users.length})</h3>
                        <div className="max-h-48 overflow-y-auto">
                            <ul className="divide-y divide-border-color">
                                {users.map(user => (
                                    <li key={user.id} className="py-2 flex justify-between items-center text-sm">
                                        <div>
                                            <span className="font-medium text-text-primary">{user.username}</span>
                                            {user.is_admin ? <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">Admin</span> : ''}
                                        </div>
                                        <span className="text-text-secondary">
                                            Joined {new Date(user.created_at).toLocaleDateString()}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
