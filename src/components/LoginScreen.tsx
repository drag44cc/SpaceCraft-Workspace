import { useState, FormEvent } from 'react';
import { User } from '../types';
import { 
  Rocket, 
  Lock, 
  Mail, 
  Sparkles, 
  ShieldAlert, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  CheckCircle2
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: User) => void;
}

// Default main user account
const DEFAULT_ACCOUNT = {
  email: (import.meta as any).env?.VITE_DEFAULT_EMAIL || 'admin@spacecraft.internal',
  password: (import.meta as any).env?.VITE_DEFAULT_PASSWORD || 'admin123',
  name: (import.meta as any).env?.VITE_DEFAULT_NAME || 'Terminal Commander',
  role: 'Systems Architect',
  color: 'emerald'
};

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  // Pre-fill the login fields with requested credentials for seamless access
  const [email, setEmail] = useState(DEFAULT_ACCOUNT.email);
  const [password, setPassword] = useState(DEFAULT_ACCOUNT.password);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Load existing local accounts or init with user credentials
  const getLocalAccounts = (): any[] => {
    const data = localStorage.getItem('spacecraft_accounts');
    if (!data) {
      localStorage.setItem('spacecraft_accounts', JSON.stringify([DEFAULT_ACCOUNT]));
      return [DEFAULT_ACCOUNT];
    }
    try {
      const parsed = JSON.parse(data);
      // Ensure the requested user is always inside state
      if (!parsed.some((acc: any) => acc.email.toLowerCase() === DEFAULT_ACCOUNT.email.toLowerCase())) {
        parsed.push(DEFAULT_ACCOUNT);
        localStorage.setItem('spacecraft_accounts', JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      return [DEFAULT_ACCOUNT];
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email) {
      setError('Email address is required.');
      return;
    }
    if (email.indexOf('@') === -1) {
      setError('Please provide a valid email address.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    const accounts = getLocalAccounts();

    // Verify user Match
    const userMatch = accounts.find(
      acc => acc.email.toLowerCase() === email.toLowerCase().trim() && acc.password === password
    );

    if (!userMatch) {
      setError('Incorrect email or password. Please use correct credentials.');
      return;
    }

    const loggedUser: User = {
      id: `usr-${Date.now()}`,
      name: userMatch.name,
      email: userMatch.email,
      role: userMatch.role,
      avatarColor: userMatch.color,
      createdAt: new Date().toISOString()
    };

    setSuccess('Authentication successful! Welcome back, Commander.');
    setTimeout(() => {
      localStorage.setItem('spacecraft_active_user', JSON.stringify(loggedUser));
      onLogin(loggedUser);
    }, 1000);
  };

  const handleGuestBypass = () => {
    const guestUser: User = {
      id: `usr-guest-${Date.now()}`,
      name: 'Guest Pilot',
      email: 'guest@spacecraft.internal',
      role: 'Sandbox Observer',
      avatarColor: 'indigo',
      createdAt: new Date().toISOString()
    };
    localStorage.setItem('spacecraft_active_user', JSON.stringify(guestUser));
    onLogin(guestUser);
  };

  return (
    <div id="login-container" className="min-h-screen bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans antialiased text-slate-200">
      
      {/* Background Neon Orbs */}
      <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-blue-500/10 blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }} />
      <div className="absolute bottom-[-20%] right-[-20%] w-[60%] h-[60%] rounded-full bg-purple-500/10 blur-[150px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />

      <div className="w-full max-w-md relative z-10 transition-all duration-300">
        
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-blue-500/15 border border-blue-500/35 rounded-2xl shadow-xl shadow-blue-500/10 mb-4 animate-bounce" style={{ animationDuration: '4s' }}>
            <Rocket className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-1.5 font-sans">
            SpaceCraft Terminal
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Securely access your Notion notes + Miro flowchart boards with your authorized space passport.
          </p>
        </div>

        {/* glass Card */}
        <div className="glass bg-slate-900/60 backdrop-blur-2xl rounded-2xl border border-white/8 shadow-2xl overflow-hidden p-6 sm:p-8">
          
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-widest text-center">
              Authenticate Terminal Session
            </h2>
            <div className="h-0.5 w-12 bg-blue-500 mx-auto mt-2 rounded-full" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* ALERT BARS */}
            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-300 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
                <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex items-start gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{success}</span>
              </div>
            )}

            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Email Address</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  required
                  placeholder="name@spacecraft.io"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-950/45 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/35 transition"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 block">Password</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                  <Lock className="w-4 h-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-slate-950/45 border border-white/10 rounded-xl text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/35 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              id="submit-auth-btn"
              className="w-full mt-2 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20 active:scale-98 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Authenticate Space ID</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Sandbox Bypass Option */}
          <div className="mt-5 text-center">
            <button
              type="button"
              id="bypass-demo-btn"
              onClick={handleGuestBypass}
              className="text-xs text-slate-400 hover:text-white transition py-1 hover:underline underline-offset-4"
            >
              Skip & launch in Offline Guest Mode
            </button>
          </div>

        </div>

        {/* Security watermark footer */}
        <div className="text-center mt-6">
          <span className="text-[10px] font-mono text-slate-600 tracking-tight flex items-center justify-center gap-1.5">
            <Sparkles className="w-3 h-3 text-slate-600" />
            AES-256 Secured Sandbox Terminal Client
          </span>
        </div>

      </div>
    </div>
  );
}
