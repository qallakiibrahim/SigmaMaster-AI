import React, { useState } from 'react';
import { HistoryEntry } from '../types';
import { Clock, User as UserIcon, Save, Plus } from 'lucide-react';

interface Props {
  history: HistoryEntry[];
  isOpen: boolean;
  onClose: () => void;
  onSaveVersion: (comment: string) => void;
}

const HistorySidebar: React.FC<Props> = ({ history, isOpen, onClose, onSaveVersion }) => {
  const [comment, setComment] = useState('');

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) return;
    onSaveVersion(comment);
    setComment('');
  };

  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-slate-900 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 dark:border-slate-800 flex flex-col">
      <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          <h2 className="font-bold text-slate-800 dark:text-white">Versionshistorik</h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-350 font-bold text-xl">&times;</button>
      </div>

      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-blue-50/30 dark:bg-blue-950/10">
        <form onSubmit={handleSave} className="space-y-2">
          <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Spara ny version</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Beskriv ändringarna (t.ex. 'Define-fas klar')"
            className="w-full p-2 text-xs border border-slate-200 dark:border-slate-800 rounded focus:ring-2 focus:ring-blue-500 outline-none min-h-[60px] bg-white dark:bg-slate-950 text-slate-800 dark:text-white"
          />
          <button
            type="submit"
            disabled={!comment.trim()}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-3 h-3" /> Spara Milestone
          </button>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {history.length === 0 && (
          <div className="text-center py-10 text-slate-400 dark:text-slate-500 italic text-sm">
            Ingen historik tillgänglig ännu.
          </div>
        )}
        {history.map((entry) => (
          <div key={entry.id} className="bg-slate-50 dark:bg-slate-950/40 rounded-lg p-3 border border-slate-100 dark:border-slate-800 hover:border-blue-100 dark:hover:border-blue-900/60 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-950/60 flex items-center justify-center">
                <UserIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              </div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">{entry.user_name}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {entry.change_summary}
            </p>
            <div className="text-[9px] text-slate-400 dark:text-slate-500 mt-1">
              {new Date(entry.timestamp).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistorySidebar;
