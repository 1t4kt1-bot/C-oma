
import React from 'react';
import { AuditLogItem } from '../types';
import { History, Shield, Clock } from 'lucide-react';

interface AuditLogPageProps {
    logs: AuditLogItem[];
}

const AuditLogPage: React.FC<AuditLogPageProps> = ({ logs }) => {
    return (
        <div className="space-y-6 animate-fade-in">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Shield className="text-gray-600"/> سجل العمليات (Audit Log)
                </h2>
                <p className="text-sm text-gray-500 mt-1">تتبع جميع الإجراءات والتغييرات في النظام.</p>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="max-h-[600px] overflow-y-auto">
                    {logs.length === 0 ? (
                        <div className="text-center py-10 text-gray-400">لا يوجد سجلات</div>
                    ) : (
                        <table className="w-full text-right text-sm">
                            <thead className="bg-gray-50 text-gray-500 font-bold sticky top-0">
                                <tr>
                                    <th className="px-6 py-3">التوقيت</th>
                                    <th className="px-6 py-3">المستخدم / النظام</th>
                                    <th className="px-6 py-3">الإجراء</th>
                                    <th className="px-6 py-3">التفاصيل</th>
                                    <th className="px-6 py-3">Entity ID</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {logs.map(log => (
                                    <tr key={log.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-3 text-gray-600 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <Clock size={14} className="text-gray-400"/>
                                                {new Date(log.timestamp).toLocaleString('ar-SA')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 font-medium">System</td>
                                        <td className="px-6 py-3">
                                            <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-bold uppercase tracking-wider">
                                                {log.action}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-gray-800">{log.details}</td>
                                        <td className="px-6 py-3 text-xs text-gray-400 font-mono">{log.entityId}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditLogPage;
