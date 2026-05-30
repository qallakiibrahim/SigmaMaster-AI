import React, { useState } from 'react';
import { User } from '../types';
import { BarChart3, Lock, User as UserIcon, LogIn, UserPlus } from 'lucide-react';

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const normalizedUsername = username.trim().toLowerCase();

    let endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
    let body: any = isLogin ? { username: normalizedUsername, password } : { username: normalizedUsername, password, name };

    if (isForgotPassword) {
      endpoint = '/api/auth/reset';
      body = { username: normalizedUsername, newPassword: password };
    }

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        credentials: 'include'
      });

      const data = await response.json();

      if (response.ok) {
        if (isForgotPassword) {
          setIsForgotPassword(false);
          setIsLogin(true);
          setPassword('');
          setError('Lösenordet har uppdaterats! Logga in med dina nya uppgifter.');
        } else if (isLogin) {
          if (data.token) localStorage.setItem('sm_token', data.token);
          onLogin(data.user);
        } else {
          setIsLogin(true);
          setError('Konto skapat! Logga in nu.');
        }
      } else {
        setError(data.error || 'Något gick fel');
      }
    } catch (err) {
      setError('Nätverksfel');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl overflow-hidden">
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
              <h2 className="text-lg font-bold text-slate-800">Återställ lösenord</h2>
              <p className="text-xs text-slate-500 mt-1">Ange ditt användarnamn och ditt nya önskade lösenord nedan.</p>
            </div>
          ) : (
            <div className="flex gap-4 mb-8 border-b border-slate-100 pb-2">
              <button
                type="button"
                onClick={() => { setIsLogin(true); setError(''); }}
                className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors ${isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Logga in
              </button>
              <button
                type="button"
                onClick={() => { setIsLogin(false); setError(''); }}
                className={`pb-2 text-sm font-bold uppercase tracking-wider transition-colors ${!isLogin ? 'text-blue-600 border-b-2 border-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                Skapa konto
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !isForgotPassword && (
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Namn</label>
                <div className="relative">
                  <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                    placeholder="Ditt namn"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Användarnamn</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                  placeholder="användarnamn"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                {isForgotPassword ? 'Nytt Lösenord' : 'Lösenord'}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
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
              <div className={`p-3 rounded-lg text-xs font-medium ${error.includes('skapat') || error.includes('uppdaterats') ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
                {error}
              </div>
            )}

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    {isForgotPassword ? 'Sätt nytt lösenord' : isLogin ? <><LogIn className="h-5 w-5" />Logga in</> : <><UserPlus className="h-5 w-5" />Skapa konto</>}
                  </>
                )}
              </button>

              {isForgotPassword && (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(false);
                    setError('');
                  }}
                  className="w-full py-2 text-xs text-slate-500 hover:text-slate-800 hover:underline text-center font-semibold"
                >
                  Tillbaka till logga in
                </button>
              )}
            </div>
          </form>

          <div className="mt-8 text-center space-y-4">
            <p className="text-xs text-slate-400">
              Genom att logga in godkänner du våra villkor för samarbete och datadelning.
            </p>
            <div className="pt-4 border-t border-slate-100">
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
