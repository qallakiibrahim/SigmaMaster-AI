import React, { useState, useEffect } from 'react';
import { Phase, ProjectData, User, HistoryEntry } from './types';
import DefinePhase from './components/DefinePhase';
import MeasurePhase from './components/MeasurePhase';
import AnalyzePhase from './components/AnalyzePhase';
import ImprovePhase from './components/ImprovePhase';
import ControlPhase from './components/ControlPhase';
import Roadmap from './components/Roadmap';
import Dashboard from './components/Dashboard';
import ProjectReport from './components/ProjectReport';
import ProjectMap from './components/ProjectMap';
import A3Report from './components/A3Report';
import Tollgate from './components/Tollgate';
import Login from './components/Login';
import ProjectList from './components/ProjectList';
import ProjectHeader from './components/ProjectHeader';
import HistorySidebar from './components/HistorySidebar';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, setDoc, collection, query, orderBy, limit } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './services/firebase';
import { TOOLS_LIBRARY } from './data/toolsData';
import { Activity, Target, Search, Settings, ShieldCheck, BarChart3, ChevronRight, Menu, RotateCcw, Map, LayoutDashboard, FileText, Users, Wifi, WifiOff, LogOut, Clock } from 'lucide-react';

// Mock Initial Data
const initialProject: ProjectData = {
  id: '1',
  name: 'Optimering av Svetsprocess',
  problemStatement: 'Svetsprocessen på linje 3 har en kasseringsgrad på 12%, vilket överstiger målet på 2%.',
  businessCase: 'Hög kasseringsgrad leder till ökade materialkostnader på 500k SEK/år samt flaskhalsar i produktionen.',
  stakeholders: 'Produktionschef, Kvalitetsansvarig, Linjeoperatörer',
  goal: '',
  scope: '',
  measurements: [100.2, 101.5, 99.8, 100.5, 102.1, 98.9, 100.0, 101.2, 100.8, 99.5, 103.2, 98.4, 100.1, 101.0],
  rootCauses: [],
  improvements: [],
  selectedTools: TOOLS_LIBRARY.filter(t => t.recommended).map(t => t.id),
  toolData: {},
  tollgateStatus: {
    [Phase.DEFINE]: 'In Progress',
    [Phase.MEASURE]: 'Not Started',
    [Phase.ANALYZE]: 'Not Started',
    [Phase.IMPROVE]: 'Not Started',
    [Phase.CONTROL]: 'Not Started',
  }
};

const STORAGE_KEY = 'sigma-master-project-v2';

// Extended view enum to include Roadmap, Dashboard, Report
enum View {
    PROJECT_LIST = 'ProjectList',
    DASHBOARD = 'Dashboard',
    PROJECT_MAP = 'ProjectMap',
    ROADMAP = 'Roadmap',
    REPORT = 'Report',
    A3_REPORT = 'A3Report',
    DEFINE = 'Define',
    MEASURE = 'Measure',
    ANALYZE = 'Analyze',
    IMPROVE = 'Improve',
    CONTROL = 'Control'
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View | Phase>(View.PROJECT_LIST);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Check Auth on Mount & Subscribe to auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        console.log("User authenticated in Firebase:", firebaseUser.displayName || firebaseUser.email);
        
        // Synchronize auth session with our backend SQLite database to enable API routes like /api/ai/generate
        const username = firebaseUser.email || firebaseUser.uid;
        const password = firebaseUser.uid; // Stable predictable password for backend mapping
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.token) {
              localStorage.setItem('sm_token', data.token);
              console.log("Successfully synchronized authenticated session with backend API.");
            }
          } else {
            console.error("Backend auth synchronization returned non-ok status:", res.status);
          }
        } catch (err) {
          console.error("Failed to synchronize auth session with backend API:", err);
        }

        setUser({
          id: firebaseUser.uid,
          name: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || 'Användare'
        });
      } else {
        localStorage.removeItem('sm_token');
        setUser(null);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real-time synchronization of selected project & history logs using Firebase Firestore onSnapshot
  useEffect(() => {
    if (!project?.id || !user) return;

    // 1. Listen to details document updates
    const docRef = doc(db, 'projects', project.id);
    const unsubscribeProj = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Update local React state with Firestore contents
        setProject({ id: docSnap.id, ...data } as ProjectData);
      } else {
        console.warn("Currently selected project document was deleted remotely.");
        setProject(null);
        setCurrentView(View.PROJECT_LIST);
      }
    }, (err) => {
      console.error("Firestore onSnapshot error for project:", err);
      handleFirestoreError(err, OperationType.GET, `projects/${project.id}`);
    });

    // 2. Listen to child historical logs updates
    const histRef = collection(db, 'projects', project.id, 'history');
    const qHist = query(histRef, orderBy('timestamp', 'desc'), limit(50));
    const unsubscribeHist = onSnapshot(qHist, (snapshot) => {
      const fetchedHist: HistoryEntry[] = [];
      snapshot.forEach((hDoc) => {
        const hData = hDoc.data();
        fetchedHist.push({
          id: hDoc.id as any,
          project_id: project.id,
          user_id: hData.user_id,
          user_name: hData.user_name,
          change_summary: hData.change_summary,
          timestamp: hData.timestamp
        });
      });
      setHistory(fetchedHist);
    }, (err) => {
      console.error("Firestore onSnapshot error for history:", err);
    });

    return () => {
      unsubscribeProj();
      unsubscribeHist();
    };
  }, [user, project?.id]);

  const handleSelectProject = (projectId: string) => {
    // Show loading spinner first, onSnapshot will load document contents instantly
    setProject({ id: projectId, name: '', selectedTools: [], measurements: [], improvements: [], tollgateStatus: {} } as any);
    setCurrentView(View.DASHBOARD);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setProject(null);
      setCurrentView(View.PROJECT_LIST);
    } catch (err) {
      console.error("Sign out failed:", err);
    }
  };

  const updateProject = async (data: Partial<ProjectData>) => {
    if (!project || !user) return;
    
    // Instantly set local React state so typing/interacting feels zero-latency
    const updatedProject = { ...project, ...data };
    setProject(updatedProject as ProjectData);

    try {
      const docRef = doc(db, 'projects', project.id);
      await updateDoc(docRef, data);
    } catch (err) {
      console.error("Failed to update project fields in Firestore:", err);
      // Fail gracefully: don't crash the interface but log securely
      try {
        handleFirestoreError(err, OperationType.UPDATE, `projects/${project.id}`);
      } catch (innerErr) {
        console.error("Security rules restriction:", innerErr);
      }
    }
  };

  const saveVersion = async (comment: string) => {
    if (!project || !user) return;
    try {
      const histRef = collection(db, 'projects', project.id, 'history');
      const historyId = Math.random().toString(36).substring(2, 11);
      await setDoc(doc(histRef, historyId), {
        id: historyId,
        project_id: project.id,
        user_id: user.id,
        user_name: user.name,
        change_summary: comment,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Failed to append history item to Firestore:", err);
    }
  };

  const isConnected = !!user; // Connected to Firebase Client SDK state engine

  const handleResetProject = async () => {
    if (window.confirm("Är du säker på att du vill återställa projektet till ursprungsläget? All din data kommer att raderas.")) {
      try {
        const docRef = doc(db, 'projects', project!.id);
        const resetData = {
          name: project?.name || 'Optimering av Svetsprocess',
          problemStatement: 'Svetsprocessen på linje 3 har en kasseringsgrad på 12%, vilket överstiger målet på 2%.',
          businessCase: 'Hög kasseringsgrad leder till ökade materialkostnader på 500k SEK/år samt flaskhalsar i produktionen.',
          stakeholders: 'Produktionschef, Kvalitetsansvarig, Linjeoperatörer',
          goal: '',
          scope: '',
          measurements: [100.2, 101.5, 99.8, 100.5, 102.1, 98.9],
          rootCauses: [],
          improvements: [],
          selectedTools: TOOLS_LIBRARY.filter(t => t.recommended).map(t => t.id),
          toolData: {},
          tollgateStatus: {
            [Phase.DEFINE]: 'In Progress',
            [Phase.MEASURE]: 'Not Started',
            [Phase.ANALYZE]: 'Not Started',
            [Phase.IMPROVE]: 'Not Started',
            [Phase.CONTROL]: 'Not Started',
          }
        };
        await updateDoc(docRef, resetData as any);
        setCurrentView(View.DASHBOARD);
      } catch (err) {
        console.error("Reset failed:", err);
      }
    }
  };

  // Menu items config
  const menuItems = [
    { id: View.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard, desc: 'Översikt' },
    { id: View.PROJECT_MAP, label: 'Projektkarta', icon: Map, desc: 'Hela flödet' },
    { id: View.ROADMAP, label: 'Roadmap', icon: Settings, desc: 'Verktygslåda' },
    { section: 'DMAIC Faser' },
    { id: Phase.DEFINE, label: 'Define', icon: Target, desc: 'Projektstart' },
    { id: Phase.MEASURE, label: 'Measure', icon: Activity, desc: 'Datainsamling' },
    { id: Phase.ANALYZE, label: 'Analyze', icon: Search, desc: 'Rotorsak' },
    { id: Phase.IMPROVE, label: 'Improve', icon: Settings, desc: 'Lösningar' },
    { id: Phase.CONTROL, label: 'Control', icon: ShieldCheck, desc: 'Hållbarhet' },
    { section: 'Export' },
    { id: View.REPORT, label: 'Rapport', icon: FileText, desc: 'Utskrift' },
  ];

  const renderContent = () => {
    if (currentView === View.PROJECT_LIST) {
        return <ProjectList onSelectProject={handleSelectProject} onAuthError={() => setUser(null)} />;
    }

    if (!project || !project.id || !project.name) {
        return (
            <div className="flex flex-col items-center justify-center h-full gap-4">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
                <p className="text-slate-500 animate-pulse">Laddar projektdata...</p>
                <button 
                  onClick={() => setCurrentView(View.PROJECT_LIST)}
                  className="mt-4 text-xs text-blue-600 font-bold hover:underline"
                >
                  Gå tillbaka om det tar för lång tid
                </button>
            </div>
        );
    }

    return (
        <>
            <ProjectHeader 
                project={project} 
                currentView={currentView} 
                onViewChange={setCurrentView} 
                onToggleHistory={() => setIsHistoryOpen(!isHistoryOpen)}
            />
            <div className="animate-fadeIn">
                {(() => {
                    switch (currentView) {
                        case View.DASHBOARD: return <Dashboard project={project} onViewChange={setCurrentView} />;
                        case View.PROJECT_MAP: return <ProjectMap project={project} onViewChange={setCurrentView} />;
                        case View.ROADMAP: return <Roadmap project={project} updateProject={updateProject} />;
                        case View.REPORT: return <ProjectReport project={project} />;
                        case View.A3_REPORT: return <A3Report project={project} onBack={() => setCurrentView(View.PROJECT_MAP)} />;
                        case Phase.DEFINE: return <DefinePhase project={project} updateProject={updateProject} />;
                        case Phase.MEASURE: return <MeasurePhase project={project} updateProject={updateProject} />;
                        case Phase.ANALYZE: return <AnalyzePhase project={project} updateProject={updateProject} />;
                        case Phase.IMPROVE: return <ImprovePhase project={project} updateProject={updateProject} />;
                        case Phase.CONTROL: return <ControlPhase project={project} updateProject={updateProject} />;
                        default: return <Dashboard project={project} onViewChange={setCurrentView} />;
                    }
                })()}
                
                {/* Tollgate Check at the bottom of Phases */}
                {isPhaseView && (
                    <div className="mt-12">
                        <Tollgate 
                            phase={currentView as Phase} 
                            project={project} 
                            updateProject={updateProject} 
                        />
                    </div>
                )}
            </div>
        </>
    );
  };

  const isPhaseView = Object.values(Phase).includes(currentView as Phase);

  if (authLoading) {
    return (
      <div className="h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  const isProjectView = currentView !== View.PROJECT_LIST;

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* Sidebar */}
      {isProjectView && (
        <aside 
          className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-slate-300 transition-all duration-300 flex flex-col shadow-2xl z-10 print:hidden`}
        >
          <div className="p-6 flex items-center gap-3 border-b border-slate-800">
            <div className="bg-blue-600 p-2 rounded-lg">
              <BarChart3 className="text-white h-6 w-6" />
            </div>
            {isSidebarOpen && (
              <div>
                <h1 className="font-bold text-white tracking-tight">SigmaMaster</h1>
                <span className="text-xs text-blue-400 font-medium">AI Edition</span>
              </div>
            )}
          </div>

          <nav className="flex-1 py-6 px-3 space-y-2 overflow-y-auto">
            <button
                onClick={() => setCurrentView(View.PROJECT_LIST)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all hover:bg-slate-800 text-slate-400 hover:text-white mb-4`}
            >
                <RotateCcw className="h-5 w-5" />
                {isSidebarOpen && <span className="font-semibold text-sm">Alla Projekt</span>}
            </button>

            {menuItems.map((item, idx) => {
            if (item.section) {
                return isSidebarOpen ? (
                    <div key={idx} className="px-3 py-2 text-xs font-bold text-slate-500 uppercase tracking-widest mt-4">
                        {item.section}
                    </div>
                ) : <div key={idx} className="h-4"></div>;
            }

            const Icon = item.icon!;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all ${
                  isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                    : 'hover:bg-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {isSidebarOpen && (
                  <div className="text-left">
                    <div className="font-semibold text-sm">{item.label}</div>
                    <div className="text-[10px] opacity-70 uppercase tracking-wider">{item.desc}</div>
                  </div>
                )}
                {isActive && isSidebarOpen && <ChevronRight className="ml-auto h-4 w-4 opacity-50" />}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
           <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-800 rounded-md w-full flex justify-center text-slate-500">
              <Menu className="h-5 w-5" />
           </button>
        </div>
      </aside>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <HistorySidebar 
          history={history} 
          isOpen={isHistoryOpen} 
          onClose={() => setIsHistoryOpen(false)} 
          onSaveVersion={saveVersion}
        />
        {/* Header */}
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 shadow-sm print:hidden">
          <div className="flex items-center gap-4">
             {isProjectView && project ? (
                 <>
                    <button 
                        onClick={() => setCurrentView(View.PROJECT_LIST)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                        title="Tillbaka till projekt"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>
                    <div className="h-8 w-[1px] bg-slate-200"></div>
                    <h2 className="text-xl font-bold text-slate-800">{project.name}</h2>
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border uppercase ${isPhaseView ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                    {currentView}
                    </span>
                 </>
             ) : (
                <div className="flex items-center gap-3">
                    <BarChart3 className="text-blue-600 h-6 w-6" />
                    <h1 className="font-bold text-slate-900 tracking-tight">SigmaMaster AI</h1>
                </div>
             )}
             
             <div className={`flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${isConnected ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'}`}>
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isConnected ? 'Live Sync' : 'Offline'}
             </div>
          </div>
          <div className="flex items-center gap-6">
            <button 
              onClick={() => setIsHistoryOpen(!isHistoryOpen)}
              className={`p-2 rounded-lg transition-colors ${isHistoryOpen ? 'bg-blue-50 text-blue-600' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'}`}
              title="Visa Historik"
            >
              <Clock className="w-5 h-5" />
            </button>
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold shadow-sm" title="Du">DU</div>
                <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold shadow-sm" title="Kvalitetsansvarig">KA</div>
                <div className="w-8 h-8 rounded-full bg-amber-500 border-2 border-white flex items-center justify-center text-[10px] text-white font-bold shadow-sm" title="Produktionschef">PC</div>
            </div>
            <div className="h-8 w-[1px] bg-slate-200"></div>
            <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                <div className="text-sm font-medium text-slate-900">{user.name}</div>
                <div className="text-xs text-slate-500">Black Belt Engineer</div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="h-10 w-10 rounded-full bg-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-slate-500 font-bold hover:bg-red-50 hover:text-red-500 transition-colors group"
                  title="Logga ut"
                >
                  <LogOut className="w-5 h-5 group-hover:block hidden" />
                  <span className="group-hover:hidden">{user.name.charAt(0).toUpperCase()}</span>
                </button>
            </div>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto p-8 scroll-smooth relative">
          <div className="max-w-7xl mx-auto pb-24">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;