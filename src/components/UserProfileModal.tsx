import { useState } from 'react';
import { User } from '../types';
import { 
  X, 
  User as UserIcon, 
  Briefcase, 
  Mail, 
  LogOut, 
  Palette, 
  Check, 
  Sparkles,
  Calendar
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdateUser: (updated: User) => void;
  onLogout: () => void;
}

export default function UserProfileModal({ 
  isOpen, 
  onClose, 
  user, 
  onUpdateUser, 
  onLogout 
}: UserProfileModalProps) {
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState(user.role);
  const [avatarColor, setAvatarColor] = useState(user.avatarColor || 'indigo');
  const [isEditing, setIsEditing] = useState(false);

  if (!isOpen) return null;

  const ROLES = [
    'Systems Architect',
    'Lead Creative Director',
    'Fullstack Engineer',
    'Product Coordinator',
    'Sandbox Explorer',
    'Sandbox Observer'
  ];

  const AVATAR_COLORS = [
    { name: 'Plasma Blue', value: 'indigo', bg: 'bg-indigo-500', text: 'text-indigo-400' },
    { name: 'Neon Emerald', value: 'emerald', bg: 'bg-emerald-500', text: 'text-emerald-400' },
    { name: 'Crimson Aura', value: 'rose', bg: 'bg-rose-500', text: 'text-rose-400' },
    { name: 'Solar Gold', value: 'amber', bg: 'bg-amber-500', text: 'text-amber-400' },
    { name: 'Ultraviolet', value: 'purple', bg: 'bg-purple-500', text: 'text-purple-400' }
  ];

  const handleSave = () => {
    onUpdateUser({
      ...user,
      name: name.trim() || user.name,
      role: role,
      avatarColor: avatarColor
    });
    setIsEditing(false);
  };

  const currentAvatarColorObj = AVATAR_COLORS.find(c => c.value === avatarColor) || AVATAR_COLORS[0];

  return (
    <div id="user-profile-overlay" className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 font-sans">
      <div 
        id="user-profile-modal" 
        className="glass bg-slate-900/60 backdrop-blur-2xl rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden border border-white/8 animate-fadeIn"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-white/3 border-b border-white/8 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <Sparkles className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold text-white text-base">Space Passport</h3>
          </div>
          <button 
            id="close-profile-btn"
            onClick={onClose} 
            className="text-slate-400 hover:text-white hover:bg-white/10 p-1 rounded-lg transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Avatar and Info Card */}
          <div className="flex flex-col items-center text-center space-y-3 pb-5 border-b border-white/5">
            <div className={`w-16 h-16 rounded-full ${currentAvatarColorObj.bg} flex items-center justify-center text-white text-xl font-bold ring-4 ring-white/10 relative shadow-2xl`}>
              {name.charAt(0).toUpperCase()}
              <span className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 border-2 border-slate-900 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" title="Connected" />
            </div>
            
            <div className="space-y-1">
              <h4 className="text-lg font-bold text-white tracking-tight">{name}</h4>
              <p className="text-xs text-blue-400 font-mono tracking-wider uppercase bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 rounded-full inline-block">
                {role}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {isEditing ? (
              <div className="space-y-4 animate-fadeIn">
                {/* Edit display name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Edit Name</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <UserIcon className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950/45 border border-white/10 rounded-xl text-sm text-white focus:outline-none focus:border-blue-400 transition"
                    />
                  </div>
                </div>

                {/* Edit Role */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">Edit Role</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">
                      <Briefcase className="w-4 h-4" />
                    </span>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-white/10 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/35 transition"
                    >
                      {ROLES.map(r => (
                        <option key={r} value={r} className="bg-slate-900 text-slate-100">{r}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Edit Avatar Spectrum */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-blue-400" />
                    Holographic Aura
                  </label>
                  <div className="flex space-x-2.5 items-center pt-1">
                    {AVATAR_COLORS.map(c => (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setAvatarColor(c.value)}
                        className={`w-7 h-7 rounded-full transition-all flex items-center justify-center ${c.bg} ${
                          avatarColor === c.value 
                            ? 'ring-2 ring-white scale-110 shadow-lg' 
                            : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        {avatarColor === c.value && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex space-x-2 pt-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 py-2 px-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold transition border border-white/5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold transition shadow-md shadow-blue-500/10"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4 animate-fadeIn">
                {/* Display Specs */}
                <div className="bg-slate-950/40 border border-white/5 rounded-xl p-4.5 space-y-3">
                  <div className="flex items-center space-x-3 text-xs">
                    <Mail className="w-4 h-4 text-slate-500" />
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Holographic Email</span>
                      <span className="text-slate-200 font-mono">{user.email}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 text-xs pt-1.5 border-t border-white/5">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <div className="space-y-0.5">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Authentication Timestamp</span>
                      <span className="text-slate-200 font-mono">{new Date(user.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Edit Toggle and Logout options */}
                <div className="flex space-x-2 pt-2">
                  <button
                    id="edit-profile-toggle-btn"
                    onClick={() => setIsEditing(true)}
                    className="flex-1 py-2.5 px-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-semibold transition border border-white/5"
                  >
                    Edit Passport details
                  </button>
                  <button
                    id="logout-button"
                    onClick={() => {
                      onClose();
                      onLogout();
                    }}
                    className="flex-1 py-2.5 px-3 bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 rounded-xl text-xs font-semibold transition border border-rose-500/20 flex items-center justify-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
