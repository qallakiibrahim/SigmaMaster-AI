import React, { useState } from 'react';
import { User } from '../types';
import { BarChart3, Lock, User as UserIcon, LogIn, UserPlus, Chrome } from 'lucide-react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { setDoc, doc } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

interface Props {
  onLogin: (user: User) => void;
}

const Login: React.FC<Props> = ({ onLogin }) => {
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCredential = await signInWithPopup(auth, provider);
      
      const displayName = userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Användare';
      
      // Save or update profile in users Firestore collection
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        id: userCredential.user.uid,
        name: displayName,
        email: userCredential.user.email || ''
      }, { merge: true });

      onLogin({
        id: userCredential.user.uid,
        name: displayName
      });
    } catch (err: any) {
      console.error("Firebase Google Auth error:", err);
      let errMsg = 'Ett fel uppstod vid Google-inloggning. Kontrollera att din webbläsare tillåter popup-fönster eller öppna appen i en ny flik för att tillåta cookies.';
      if (err.code === 'auth/unauthorized-domain' || (err.message && err.message.includes('unauthorized-domain'))) {
        const currentHost = window.location.hostname;
        errMsg = `Denna domän (${currentHost}) är inte auktoriserad i Firebase-konsolen för Google-inloggning!

För att lösa detta för din Vercel-sida eller denna miljö:
1. Gå till Firebase Console -> Authentication -> Settings -> Authorized domains (Auktoriserade domäner) och klicka på "Add domain" (Lägg till domän)
2. Lägg till följande domän exakt:
   • ${currentHost}`;
      } else if (err.code === 'auth/popup-blocked') {
        errMsg = 'Popup-fönstret blockerades av webbläsaren. Tillåt popups eller tryck på knappen för att öppna appen i en ny flik.';
      } else if (err.code === 'auth/popup-closed-by-user') {
        errMsg = 'Inloggningsfönstret stängdes innan inloggningen var färdig.';
      } else if (err.code === 'auth/cancelled-popup-request') {
        errMsg = 'Inloggningsförfrågan avbröts.';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const email = username.includes('@') ? username.trim() : `${username.trim().toLowerCase()}@sixsigma-ai.com`;

    try {
      if (isForgotPassword) {
        await sendPasswordResetEmail(auth, email);
        setIsForgotPassword(false);
        setIsLogin(true);
        setPassword('');
        setError('En länk för lösenordsåterställning har skickats till din e-post (eller din konto-id e-post)!');
      } else if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        onLogin({
          id: userCredential.user.uid,
          name: userCredential.user.displayName || userCredential.user.email?.split('@')[0] || 'Användare'
        });
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
        
        await setDoc(doc(db, 'users', userCredential.user.uid), {
          id: userCredential.user.uid,
          name: name,
          email: email
        });

        setIsLogin(true);
        setError('Konto skapat! Logga in nu.');
      }
    } catch (err: any) {
      console.error("Firebase auth error:", err);
      let errMsg = 'Ett fel uppstod: ' + (err.message || err);
      if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
        errMsg = 'Felaktigt användarnamn eller lösenord';
      } else if (err.code === 'auth/email-already-in-use') {
        errMsg = 'Användarnamnet eller e-posten används redan';
      } else if (err.code === 'auth/weak-password') {
        errMsg = 'Lösenordet måste vara minst 6 tecken långt';
      } else if (err.code === 'auth/invalid-email') {
        errMsg = 'Ange ett giltigt användarnamn eller e-post';
      }
      setError(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 dark:bg-slate-950 flex items-center justify-center p-4 transition-colors duration-200">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-2xl overflow-hidden">
        <div className="p-8 bg-blue-600 text-white text-center">
          <div className="inline-block p-3 bg-white/20 rounded-xl mb-4">
            <BarChart3 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">SigmaMaster AI</h1>
          <p className="text-blue-100 text-sm mt-1">Professional DMAIC Toolkit</p>
        </div>

        <div className="p-8">
          {isForgotPassword ? (
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Återställ lösenord</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Ange ditt användarnamn och ditt nya önskade lösenord nedan.</p>
            </div>
          ) : (
            <div className="flex gap-4 mb-8 border-b border-slate-100 dark:border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors ${isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350'}`}
              >
                Logga in
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors ${!isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350'}`}
              >
                Skapa konto
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isForgotPassword && (
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Namn</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-550" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    placeholder="Ditt namn"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">Användarnamn</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-550" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="användarnamn"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-1">
                {isForgotPassword ? 'Nytt Lösenord' : 'Lösenord'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-550" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {isLogin && !isForgotPassword && (
              <div className="text-right">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setError('');
                  }}
                  className="text-xs text-blue-600 hover:underline hover:text-blue-700 font-medium"
                >
                  Glömt ditt lösenord?
                </button>
              </div>
            )}

            {error && (
              <div className={`p-3 rounded-lg text-xs font-medium whitespace-pre-line ${error.includes('skapat') || error.includes('uppdaterats') ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300' : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'}`}>
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-md"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isForgotPassword ? 'Sätt nytt lösenord' : isLogin ? <><LogIn className="h-5 w-5" />Logga in</> : <><UserPlus className="h-5 w-5" />Skapa konto</>}
                  </>
                )}
              </button>

              {!isForgotPassword && (
                <>
                  <div className="relative my-4 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200 dark:border-slate-800"></div>
                    </div>
                    <span className="relative px-3 bg-white dark:bg-slate-900 text-xs text-slate-400 dark:text-slate-500 uppercase font-medium">Eller</span>
                  </div>

                  <button
                    type="button"
                    disabled={loading}
                    onClick={handleGoogleLogin}
                    className="w-full py-3 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg font-bold transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md active:scale-98 disabled:opacity-50 cursor-pointer text-sm"
                  >
                    <Chrome className="h-4 w-4 text-rose-500" />
                    <span>Logga in med Google</span>
                  </button>
                </>
              )}

              {isForgotPassword && (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError('');
                  }}
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 hover:underline text-center font-semibold cursor-pointer"
                >
                  Tillbaka till logga in
                </button>
              )}
            </div>
          </form>

          <div className="mt-8 text-center space-y-4">
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Genom att logga in godkänner du våra villkor för samarbete och datadelning.
            </p>
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[10px] text-slate-500 italic">
                Tips: Om du har problem med att logga in, testa att öppna appen i en ny flik för att tillåta cookies.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
