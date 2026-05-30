import React, { useState, useEffect } from 'react';
import { ProjectData } from '../types';
import { Plus, Folder, Trash2, ChevronRight, BarChart3, Clock } from 'lucide-react';
import { fetchWithAuth } from '../services/auth';

interface Props {
  onSelectProject: (projectId: string) => void;
  onAuthError?: () => void;
}

const ProjectList: React.FC<Props> = ({ onSelectProject, onAuthError }) => {
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetchWithAuth('/api/projects');
      if (res.status === 401) {
          // Session might have expired
          if (onAuthError) onAuthError();
          return;
      }
      if (!res.ok) throw new Error('Kunde inte hämta projekt');
      const data = await res.json();
      if (data.projects) {
        setProjects(data.projects);
      }
    } catch (err) {
      console.error("Failed to fetch projects", err);
      setError("Kunde inte ladda projektlistan");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setLoading(true);

    try {
      const res = await fetchWithAuth('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newProjectName })
      });
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Misslyckades att skapa projekt');
      }

      const data = await res.json();
      if (data.success) {
        setNewProjectName('');
        setIsCreating(false);
        await fetchProjects();
      }
    } catch (err) {
      console.error("Failed to create project", err);
      setError(err instanceof Error ? err.message : "Ett oväntat fel uppstod");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteConfirmId(id);
  };

  const confirmDelete = async () => {
    if (!deleteConfirmId) return;
    setLoading(true);
    try {
      await fetchWithAuth(`/api/projects/${deleteConfirmId}`, { method: 'DELETE' });
      setDeleteConfirmId(null);
      fetchProjects();
    } catch (err) {
      console.error("Failed to delete project", err);
      setError("Kunde inte ta bort projektet");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-8">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Mina Projekt</h1>
          <p className="text-slate-500">Hantera och organisera dina Six Sigma-förbättringsprojekt.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <Plus className="w-5 h-5" /> Nytt Projekt
        </button>
      </div>

      {isCreating && (
        <div className="bg-white p-6 rounded-2xl border-2 border-blue-100 shadow-xl mb-8 animate-in slide-in-from-top duration-300">
          <form onSubmit={handleCreateProject} className="flex gap-4">
            <input 
              type="text" 
              value={newProjectName}
              onChange={(e) => {
                  setNewProjectName(e.target.value);
                  setError('');
              }}
              placeholder="Ange projektets namn..."
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 outline-none focus:border-blue-500 transition-all"
              autoFocus
            />
            <button 
              type="submit"
              disabled={loading}
              className="bg-slate-900 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {loading ? 'Skapar...' : 'Skapa'}
            </button>
            <button 
              type="button"
              onClick={() => {
                  setIsCreating(false);
                  setError('');
              }}
              className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-all"
            >
              Avbryt
            </button>
          </form>
          {error && <p className="text-red-500 text-xs mt-2 font-bold">{error}</p>}
        </div>
      )}

      {deleteConfirmId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white p-8 rounded-3xl max-w-sm w-full shadow-2xl animate-in zoom-in duration-200">
                  <h3 className="text-xl font-black text-slate-900 mb-2">Ta bort projekt?</h3>
                  <p className="text-slate-500 text-sm mb-6">Är du säker på att du vill ta bort detta projekt? All data kommer att raderas permanent.</p>
                  <div className="flex gap-3">
                      <button 
                        onClick={confirmDelete}
                        disabled={loading}
                        className="flex-1 bg-red-600 text-white py-3 rounded-xl font-bold hover:bg-red-700 transition-all disabled:opacity-50"
                      >
                          {loading ? 'Tar bort...' : 'Ja, ta bort'}
                      </button>
                      <button 
                        onClick={() => setDeleteConfirmId(null)}
                        className="flex-1 bg-slate-100 text-slate-600 py-3 rounded-xl font-bold hover:bg-slate-200 transition-all"
                      >
                          Avbryt
                      </button>
                  </div>
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.length > 0 ? projects.map(project => (
          <div 
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            className="group bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-all"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                <Folder className="w-6 h-6" />
              </div>
              <button 
                onClick={(e) => handleDeleteProject(project.id, e)}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-slate-900 mb-2 group-hover:text-blue-600 transition-colors">{project.name}</h3>
            <p className="text-xs text-slate-500 line-clamp-2 mb-6 h-8">
              {project.problemStatement || 'Ingen problembeskrivning angiven ännu.'}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                  <BarChart3 className="w-3 h-3" /> {project.selectedTools.length} verktyg
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                  <Clock className="w-3 h-3" /> Aktiv
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-all group-hover:translate-x-1" />
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Folder className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="text-lg font-bold text-slate-900">Inga projekt ännu</h3>
            <p className="text-slate-500 mb-6">Skapa ditt första projekt för att komma igång.</p>
            <button 
              onClick={() => setIsCreating(true)}
              className="text-blue-600 font-bold hover:underline"
            >
              Skapa ett projekt nu
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectList;
