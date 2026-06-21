import React, { useState, useEffect } from 'react';
import { ProjectData } from '../types';
import { Plus, Folder, Trash2, ChevronRight, BarChart3, Clock } from 'lucide-react';
import { collection, query, where, getDocs, setDoc, doc, deleteDoc } from 'firebase/firestore';
import { db, auth, handleFirestoreError, OperationType } from '../services/firebase';

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
    if (!auth.currentUser) {
      if (onAuthError) onAuthError();
      return;
    }
    try {
      const q = query(collection(db, 'projects'), where('ownerId', '==', auth.currentUser.uid));
      const querySnapshot = await getDocs(q);
      const fetched: ProjectData[] = [];
      querySnapshot.forEach((doc) => {
        fetched.push({ id: doc.id, ...doc.data() } as ProjectData);
      });
      setProjects(fetched);
    } catch (err) {
      console.error("Failed to fetch Firestore projects:", err);
      setError("Kunde inte ladda projektlistan");
      handleFirestoreError(err, OperationType.LIST, 'projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim() || !auth.currentUser) return;
    setLoading(true);

    try {
      const projectId = Math.random().toString(36).substring(2, 11);
      const newProj = {
        id: projectId,
        name: newProjectName.trim(),
        problemStatement: '',
        businessCase: '',
        stakeholders: '',
        goal: '',
        scope: '',
        measurements: [100.2, 101.5, 99.8, 100.5, 102.1, 98.9, 100.0, 101.2, 100.8, 99.5, 103.2, 98.4, 100.1, 101.0],
        rootCauses: [],
        improvements: [],
        selectedTools: ['t_charter', 't_sipoc', 't_stakeholder', 't_data_plan', 't_msa', 't_capability', 't_ishikawa', 't_5why', 't_pareto', 't_fmea', 't_brainstorm', 't_pilot', 't_spc', 't_control_plan', 't_sop'],
        toolData: {},
        tollgateStatus: {
          'Define': 'In Progress',
          'Measure': 'Not Started',
          'Analyze': 'Not Started',
          'Improve': 'Not Started',
          'Control': 'Not Started',
        },
        ownerId: auth.currentUser.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      await setDoc(doc(db, 'projects', projectId), newProj);
      setNewProjectName('');
      setIsCreating(false);
      await fetchProjects();
    } catch (err) {
      console.error("Failed to create Firestore project:", err);
      setError(err instanceof Error ? err.message : "Ett oväntat fel uppstod");
      handleFirestoreError(err, OperationType.CREATE, 'projects');
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
      await deleteDoc(doc(db, 'projects', deleteConfirmId));
      setDeleteConfirmId(null);
      await fetchProjects();
    } catch (err) {
      console.error("Failed to delete Firestore project:", err);
      setError("Kunde inte ta bort projektet");
      handleFirestoreError(err, OperationType.DELETE, `projects/${deleteConfirmId}`);
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
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Mina Projekt</h1>
          <p className="text-slate-500 dark:text-slate-400">Hantera och organisera dina Six Sigma-förbättringsprojekt.</p>
        </div>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
        >
          <Plus className="w-5 h-5" /> Nytt Projekt
        </button>
      </div>

      {isCreating && (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-blue-100 dark:border-blue-900 shadow-xl mb-8 animate-in slide-in-from-top duration-300">
          <form onSubmit={handleCreateProject} className="flex gap-4">
            <input 
              type="text" 
              value={newProjectName}
              onChange={(e) => {
                  setNewProjectName(e.target.value);
                  setError('');
              }}
              placeholder="Ange projektets namn..."
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white outline-none focus:border-blue-500 transition-all"
              autoFocus
            />
            <button 
              type="submit"
              disabled={loading}
              className="bg-slate-900 dark:bg-slate-800 text-white px-6 py-3 rounded-xl font-bold hover:bg-slate-800 transition-all disabled:opacity-50"
            >
              {loading ? 'Skapar...' : 'Skapa'}
            </button>
            <button 
              type="button"
              onClick={() => {
                  setIsCreating(false);
                  setError('');
              }}
              className="px-6 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            >
              Avbryt
            </button>
          </form>
          {error && <p className="text-red-500 text-xs mt-2 font-bold">{error}</p>}
        </div>
      )}

      {deleteConfirmId && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl max-w-sm w-full border dark:border-slate-800 shadow-2xl animate-in zoom-in duration-200">
                  <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Ta bort projekt?</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm mb-6">Är du säker på att du vill ta bort detta projekt? All data kommer att raderas permanent.</p>
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
                        className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
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
            className="group bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl hover:border-blue-200 dark:hover:border-blue-900 transition-all cursor-pointer relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-all"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div className="bg-blue-50 dark:bg-blue-950/40 p-3 rounded-xl text-blue-600 dark:text-blue-400">
                <Folder className="w-6 h-6" />
              </div>
              <button 
                onClick={(e) => handleDeleteProject(project.id, e)}
                className="p-2 text-slate-300 hover:text-red-500 dark:hover:text-red-400 transition-colors"
               title="Ta bort projekt"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{project.name}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-6 h-8">
              {project.problemStatement || 'Ingen problembeskrivning angiven ännu.'}
            </p>

            <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                  <BarChart3 className="w-3 h-3" /> {project.selectedTools.length} verktyg
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                  <Clock className="w-3 h-3" /> Aktiv
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-500 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-all group-hover:translate-x-1" />
            </div>
          </div>
        )) : (
          <div className="col-span-full py-20 text-center bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800">
            <div className="bg-slate-50 dark:bg-slate-950 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <Folder className="w-8 h-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white">Inga projekt ännu</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6">Skapa ditt första projekt för att komma igång.</p>
            <button 
              onClick={() => setIsCreating(true)}
              className="text-blue-600 dark:text-blue-400 font-bold hover:underline"
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
