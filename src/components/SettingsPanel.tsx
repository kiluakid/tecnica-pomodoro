/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { UserSettings } from '../types';
import { Save, Sliders, Moon, Sun, User as UserIcon, LogOut, Check } from 'lucide-react';

interface SettingsPanelProps {
  settings: UserSettings;
  onSaveSettings: (updated: Partial<UserSettings>) => void;
  user: any;
  onLogout: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  settings,
  onSaveSettings,
  user,
  onLogout,
}) => {
  const [focus, setFocus] = useState(settings.focusDuration);
  const [short, setShort] = useState(settings.shortBreakDuration);
  const [long, setLong] = useState(settings.longBreakDuration);
  const [goal, setGoal] = useState(settings.dailyGoal);
  const [theme, setTheme] = useState(settings.theme);
  const [saved, setSaved] = useState(false);

  // Keep state updated with settings updates
  useEffect(() => {
    setFocus(settings.focusDuration);
    setShort(settings.shortBreakDuration);
    setLong(settings.longBreakDuration);
    setGoal(settings.dailyGoal);
    setTheme(settings.theme);
  }, [settings]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      focusDuration: Number(focus),
      shortBreakDuration: Number(short),
      longBreakDuration: Number(long),
      dailyGoal: Number(goal),
      theme: theme,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleToggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    onSaveSettings({ theme: nextTheme });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 font-sans">
      {/* Settings Form */}
      <div className="bg-white dark:bg-zinc-900/40 dark:backdrop-blur-md border border-slate-205 dark:border-white/5 rounded-3xl p-6 md:col-span-2">
        <div className="flex items-center space-x-2 mb-6 font-display">
          <Sliders className="w-5 h-5 text-orange-500" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Ajustes do Temporizador</h3>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5 font-display">
                Foco (Min)
              </label>
              <input
                type="number"
                min="1"
                max="180"
                value={focus}
                onChange={(e) => setFocus(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5 font-display">
                Pausa Curta (Min)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={short}
                onChange={(e) => setShort(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5 font-display">
                Pausa Longa (Min)
              </label>
              <input
                type="number"
                min="1"
                max="60"
                value={long}
                onChange={(e) => setLong(Number(e.target.value))}
                className="w-full bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 font-medium"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 mb-1.5 font-display">
              Meta Diária (Ciclos de foco)
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={goal}
              onChange={(e) => setGoal(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-zinc-950/80 border border-slate-200 dark:border-white/5 rounded-xl px-4 py-3 text-slate-800 dark:text-white focus:outline-none focus:ring-1 focus:ring-orange-500 font-medium"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-white/5">
            <button
              type="button"
              onClick={handleToggleTheme}
              className="px-4 py-2.5 bg-slate-100 dark:bg-white/5 border dark:border-white/5 text-slate-700 dark:text-zinc-300 rounded-xl flex items-center space-x-2 hover:bg-slate-200 dark:hover:bg-white/10 transition text-xs font-bold"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-500" />
                  <span>Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-violet-500" />
                  <span>Modo Escuro</span>
                </>
              )}
            </button>

            <button
              type="submit"
              className="px-6 py-2.5 bg-orange-500 text-white font-bold rounded-xl flex items-center space-x-2 shadow-lg shadow-orange-500/10 hover:bg-orange-600 transition text-xs cursor-pointer"
            >
              {saved ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Salvo!</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Salvar Alterações</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white dark:bg-zinc-900/40 dark:backdrop-blur-md border border-slate-205 dark:border-white/5 rounded-3xl p-6 flex flex-col justify-between">
        <div>
          <div className="flex items-center space-x-2 mb-4 font-display">
            <UserIcon className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-tight">Perfil</h3>
          </div>

          <div className="flex items-center space-x-3 mb-6">
            {user?.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName}
                className="w-12 h-12 rounded-full border-2 border-slate-100 dark:border-white/5"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-950/30 text-orange-500 font-bold text-lg rounded-full flex items-center justify-center">
                {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white line-clamp-1">{user?.displayName || 'Usuário'}</h4>
              <p className="text-xs text-slate-400 dark:text-zinc-500 truncate">{user?.email}</p>
            </div>
          </div>

          <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-500/10 rounded-2xl p-4 text-xs space-y-2 mb-6">
            <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />
              <span>Sincronização Ativa</span>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 leading-relaxed font-semibold">
              Sua conta está sincronizada em tempo real. Qualquer alteração ou histórico de atividade será instantaneamente espalhado para seus outros dispositivos conectados.
            </p>
          </div>
        </div>

        <button
          onClick={onLogout}
          className="w-full mt-4 py-3 bg-slate-50 dark:bg-zinc-950/30 hover:bg-slate-100 dark:hover:bg-zinc-900 text-slate-550 dark:text-zinc-400 hover:text-orange-500 dark:hover:text-orange-400 border border-slate-200 dark:border-white/5 font-bold rounded-2xl flex items-center justify-center space-x-2 transition text-xs"
        >
          <LogOut className="w-4 h-4" />
          <span>Sair da Conta</span>
        </button>
      </div>
    </div>
  );
};
