import React from 'react';

export const Footer = () => {
    return (
        <footer className="w-full max-w-7xl mx-auto px-10 pb-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6 border-t border-slate-200 dark:border-slate-800 pt-8 transition-colors">
                <div className="flex items-center gap-2">
                    <p className="text-xs font-medium text-slate-400">© 2026 Focus Recovery System. Optimized for Performance.</p>
                </div>
                <div className="flex items-center gap-6">
                    <a className="text-[11px] font-bold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer" href="#">Privacy Policy</a>
                    <a className="text-[11px] font-bold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer" href="#">Support Center</a>
                    <a className="text-[11px] font-bold text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer" href="#">System Status</a>
                </div>
            </div>
        </footer>
    );
};
