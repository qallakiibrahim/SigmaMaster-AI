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
    <div className="fixed inset-y-0 right-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 flex flex-col">
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-slate-800">Versionshistorik</h2>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 font-bold text-xl">&times;</button>
      </div>

      <div className="p-4 border-b border-slate-100 bg-blue-50/30">
        <form onSubmit={handleSave} className="space-y-2">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Spara ny version</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Beskriv ändringarna (t.ex. 'Define-fas klar')"
            className="w-full p-2 text-xs border border-slate-200 rounded focus:ring-2 focus:ring-blue-500 outline-none min-h-[60px] bg-white"
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
          <div className="text-center py-10 text-slate-400 italic text-sm">
            Ingen historik tillgänglig ännu.
          </div>
        )}
        {history.map((entry) => (
          <div key={entry.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100 hover:border-blue-100 transition-colors">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center">
                <UserIcon className="w-3 h-3 text-blue-600" />
              </div>
              <span className="text-xs font-bold text-slate-700">{entry.user_name}</span>
              <span className="text-[10px] text-slate-400 ml-auto">
                {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {entry.change_summary}
            </p>
            <div className="text-[9px] text-slate-400 mt-1">
              {new Date(entry.timestamp).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HistorySidebar;
