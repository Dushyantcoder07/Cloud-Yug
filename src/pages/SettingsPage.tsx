import React, { useState, useEffect } from 'react';
import { User, Bell, Target, Bolt, Shield, Info, Wind, Clock } from 'lucide-react';
import { Settings } from '../types';

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
    <button
        onClick={onClick}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all w-full text-left ${active
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
    >
        <Icon size={20} />
        <span>{label}</span>
    </button>
);

const Toggle = ({ checked, onChange }: { checked: boolean, onChange: (val: boolean) => void }) => (
    <button
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-blue-600' : 'bg-slate-300'
            }`}
    >
        <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-6' : 'translate-x-1'
                }`}
        />
    </button>
);

export const SettingsPage = ({ settings, onSave }: { settings: Settings | null, onSave: (s: Settings) => void }) => {
    const [localSettings, setLocalSettings] = useState<Settings | null>(settings);

    useEffect(() => {
        setLocalSettings(settings);
    }, [settings]);

    if (!localSettings) return null;

    const update = (key: keyof Settings, val: any) => {
        setLocalSettings({ ...localSettings, [key]: val });
    };

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            <aside className="w-full lg:w-64 shrink-0">
                <div className="flex flex-col gap-1 sticky top-24">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 px-4 mb-3">Preferences</h3>
                    <SidebarItem icon={User} label="Profile Settings" active={true} onClick={() => { }} />
                    <SidebarItem icon={Bell} label="Notifications" active={false} onClick={() => { }} />
                    <SidebarItem icon={Target} label="Focus Rules" active={false} onClick={() => { }} />
                    <SidebarItem icon={Bolt} label="Integrations" active={false} onClick={() => { }} />
                    <SidebarItem icon={Shield} label="Account Security" active={false} onClick={() => { }} />

                    <div className="mt-8 px-4 py-4 bg-blue-600/10 rounded-2xl border border-blue-600/20">
                        <p className="text-xs font-bold text-blue-600 uppercase mb-1">Current Plan</p>
                        <p className="text-sm font-bold">Premium Annual</p>
                        <p className="text-xs text-slate-500 mt-1">Renewal: Oct 2024</p>
                        <button className="mt-3 text-xs font-bold text-blue-600 underline">Manage Subscription</button>
                    </div>
                </div>
            </aside>

            <div className="flex-1 flex flex-col gap-8">
                <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                    <div className="flex flex-col md:flex-row items-center gap-8 mb-10">
                        <div className="relative group">
                            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-slate-50 shadow-xl">
                                <img src="https://picsum.photos/seed/alex/200" alt="Profile" className="w-full h-full object-cover" />
                            </div>
                            <button className="absolute bottom-1 right-1 bg-blue-600 p-2 rounded-full shadow-lg text-white border-4 border-white hover:scale-110 transition-transform">
                                <Bolt size={16} />
                            </button>
                        </div>
                        <div className="text-center md:text-left">
                            <h2 className="text-3xl font-black tracking-tight">{localSettings.full_name}</h2>
                            <p className="text-slate-500 font-medium">{localSettings.email}</p>
                            <div className="flex gap-2 mt-4 justify-center md:justify-start">
                                <span className="px-3 py-1 bg-slate-100 text-xs font-bold rounded-full text-slate-600">Premium User</span>
                                <span className="px-3 py-1 bg-blue-50 text-xs font-bold rounded-full text-blue-600">Active Recovery</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                            <input
                                type="text"
                                value={localSettings.full_name}
                                onChange={(e) => update('full_name', e.target.value)}
                                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none font-medium"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Email Address</label>
                            <input
                                type="email"
                                value={localSettings.email}
                                onChange={(e) => update('email', e.target.value)}
                                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none font-medium"
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <label className="text-sm font-bold text-slate-700 ml-1">Professional Role</label>
                            <input
                                type="text"
                                value={localSettings.role}
                                onChange={(e) => update('role', e.target.value)}
                                className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:bg-white transition-all outline-none font-medium"
                            />
                            <p className="text-xs text-slate-400 ml-2 font-medium">This helps us tailor focus intervals to your specific work type.</p>
                        </div>
                    </div>
                </section>

                <section className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100">
                    <div className="flex items-center gap-4 mb-8">
                        <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center">
                            <Target size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black">Focus Rules</h3>
                            <p className="text-sm text-slate-500 font-medium">Configure how the system protects your attention.</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        {[
                            { key: 'auto_trigger_breathing', label: 'Auto-trigger Breathing', desc: 'Initiate guided sessions based on high heart rate or strain.', icon: Wind },
                            { key: 'block_notifications', label: 'Block Notifications', desc: 'Silence all OS-level notifications during Deep Focus sessions.', icon: Bell },
                            { key: 'smart_breaks', label: 'Smart Breaks', desc: 'Automatically remind you to stand up every 45 minutes.', icon: Clock },
                        ].map((rule) => (
                            <div key={rule.key} className="flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/50 transition-all gap-4">
                                <div className="flex gap-4 items-start sm:items-center">
                                    <div className="bg-white border border-slate-100 p-3 rounded-xl flex flex-shrink-0 items-center justify-center text-slate-600 shadow-sm">
                                        {/* <rule.icon size={20} /> */}
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900">{rule.label}</h4>
                                        <p className="text-[13px] text-slate-500 font-medium">{rule.desc}</p>
                                    </div>
                                </div>
                                <div className="sm:ml-4 flex-shrink-0 ml-[60px]">
                                    <Toggle
                                        checked={!!(localSettings as any)[rule.key]}
                                        onChange={(val) => update(rule.key as any, val ? 1 : 0)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                <div className="flex flex-col sm:flex-row items-center justify-between bg-slate-900 text-white p-6 rounded-3xl shadow-2xl gap-6">
                    <div className="flex items-center gap-4 w-full sm:w-auto">
                        <div className="bg-blue-600/20 p-2 rounded-full">
                            <Info className="text-blue-500" size={20} />
                        </div>
                        <p className="text-sm font-medium text-slate-300">Last synced: <span className="text-white font-bold">2 minutes ago</span></p>
                    </div>
                    <div className="flex gap-4 w-full sm:w-auto">
                        <button className="flex-1 sm:flex-none px-6 py-3 rounded-full border border-slate-700 font-bold hover:bg-slate-800 transition-colors text-sm">Discard</button>
                        <button
                            onClick={() => onSave(localSettings)}
                            className="flex-1 sm:flex-none px-8 py-3 rounded-full bg-blue-600 text-white font-black hover:scale-105 transition-transform text-sm shadow-lg shadow-blue-600/20"
                        >
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
