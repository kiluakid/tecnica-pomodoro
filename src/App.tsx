/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  FastForward, 
  Settings, 
  Award, 
  Trophy, 
  Sparkles, 
  Check, 
  X, 
  RefreshCw, 
  Sun, 
  Moon, 
  Calendar,
  Plus, 
  Trash2, 
  BarChart3, 
  Clock, 
  Flame, 
  Zap, 
  CheckCircle2, 
  AlertCircle 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  db, 
  auth, 
  initAuth, 
  googleSignIn, 
  logoutUser, 
  getAccessToken,
  handleFirestoreError,
  OperationType 
} from './lib/firebase';
import {
  setDoc,
  doc,
  collection,
  addDoc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  orderBy,
  deleteDoc,
  writeBatch,
  serverTimestamp
} from 'firebase/firestore';
import { TimerMode, UserSettings, ActivityLog, BadgeItem, PRESET_BADGES } from './types';
import { ReportCharts } from './components/ReportCharts';
import { SettingsPanel } from './components/SettingsPanel';
import { BadgeRack } from './components/BadgeRack';
import { SimulatedWidget } from './components/SimulatedWidget';

export default function App() {
  // Authentication states
  const [user, setUser] = useState<any>(null);
  const [needsAuth, setNeedsAuth] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  // User setting preferences with default configs
  const [settings, setSettings] = useState<UserSettings>({
    userId: '',
    email: '',
    focusDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    dailyGoal: 4,
    theme: 'dark',
    xp: 0,
    level: 1,
  });

  // History logs and trophies
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [unlockedBadges, setUnlockedBadges] = useState<BadgeItem[]>([]);

  // Active Timer controls
  const [mode, setMode] = useState<TimerMode>(TimerMode.FOCUS);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [taskName, setTaskName] = useState('');
  const [currentCycle, setCurrentCycle] = useState(1); // 4 cycles then long break

  // Core visual tab navigation
  const [activeTab, setActiveTab] = useState<'timer' | 'history' | 'stats' | 'badges' | 'settings'>('timer');

  // Interactive alert / toasts
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Reference container sizes
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sound Synthesizer via Web Audio on-the-fly (Elegant, lightweight, pure craftsmanship)
  const triggerAudioAlerter = (type: 'success' | 'break') => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'success') {
        osc.type = 'sine';
        // Elegant ascending trilogy tones
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
        osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.3); // G5
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.6);
        osc.start();
        osc.stop(ctx.currentTime + 0.6);
      } else {
        osc.type = 'triangle';
        // Dual descending warning tones
        osc.frequency.setValueAtTime(440.00, ctx.currentTime); // A4
        osc.frequency.setValueAtTime(349.23, ctx.currentTime + 0.2); // F4
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.005, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      }
    } catch (err) {
      console.warn('Web Audio Context falhou:', err);
    }
  };

  // Toast system helper
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Browser standard push Notification helper
  const triggerPushNotification = (title: string, body: string) => {
    if ('Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body, icon: '/favicon.ico' });
      } else if (Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
          if (permission === 'granted') {
            new Notification(title, { body });
          }
        });
      }
    }
  };

  // Apply dark/light classes on body element
  useEffect(() => {
    const root = window.document.documentElement;
    if (settings.theme === 'dark') {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#050505'; // immersive carbon pitch dark
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#fafafa'; // aesthetic sleek off-white
    }
  }, [settings.theme]);

  // Handle initialization loading state and Auth triggers
  useEffect(() => {
    const unsubscribe = initAuth(
      async (firebaseUser, token) => {
        setUser(firebaseUser);
        setNeedsAuth(false);
        await loginOrSyncUserData(firebaseUser);
      },
      () => {
        setIsAuthLoading(false);
        setNeedsAuth(true);
        loadOfflineFallback();
      }
    );

    return () => unsubscribe();
  }, []);

  // Offline Backups / Storage Fallback
  const loadOfflineFallback = () => {
    const cachedSettings = localStorage.getItem('pomodoro_offline_settings');
    const cachedLogs = localStorage.getItem('pomodoro_offline_logs');
    const cachedBadges = localStorage.getItem('pomodoro_offline_badges');

    if (cachedSettings) setSettings(JSON.parse(cachedSettings));
    if (cachedLogs) setLogs(JSON.parse(cachedLogs));
    if (cachedBadges) setUnlockedBadges(JSON.parse(cachedBadges));
  };

  // Active sync auth logs & user setups
  const loginOrSyncUserData = async (currentUser: any) => {
    setIsAuthLoading(true);
    const userDocPath = `users/${currentUser.uid}`;
    try {
      const uSnap = await getDoc(doc(db, 'users', currentUser.uid));
      
      let finalSettings = { ...settings };
      if (uSnap.exists()) {
        finalSettings = { 
          ...settings, 
          ...uSnap.data(),
          userId: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || ''
        };
        setSettings(finalSettings);
      } else {
        // Create standard initial user doc
        const defaultSettings: UserSettings = {
          userId: currentUser.uid,
          email: currentUser.email || '',
          displayName: currentUser.displayName || '',
          focusDuration: 25,
          shortBreakDuration: 5,
          longBreakDuration: 15,
          dailyGoal: 4,
          theme: 'dark',
          xp: 0,
          level: 1,
        };
        await setDoc(doc(db, 'users', currentUser.uid), {
          ...defaultSettings,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        setSettings(defaultSettings);
        finalSettings = defaultSettings;
      }

      // Live subscription of completed activities
      const actsRef = collection(db, 'users', currentUser.uid, 'activities');
      const qActs = query(actsRef, orderBy('createdAt', 'desc'));
      const unsubActs = onSnapshot(qActs, (snapshot) => {
        const list: ActivityLog[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as ActivityLog);
        });
        setLogs(list);
        localStorage.setItem('pomodoro_offline_logs', JSON.stringify(list));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}/activities`);
      });

      // Live subscription of earned badges
      const badgesRef = collection(db, 'users', currentUser.uid, 'badges');
      const unsubBadges = onSnapshot(badgesRef, (snapshot) => {
        const list: BadgeItem[] = [];
        snapshot.forEach(docSnap => {
          list.push({ id: docSnap.id, ...docSnap.data() } as BadgeItem);
        });
        setUnlockedBadges(list);
        localStorage.setItem('pomodoro_offline_badges', JSON.stringify(list));
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${currentUser.uid}/badges`);
      });

      setIsAuthLoading(false);
    } catch (err) {
      console.error('Falhou ao sincronizar perfil do Firebase:', err);
      loadOfflineFallback();
      setIsAuthLoading(false);
    }
  };

  // Save modified timer or profile preferences
  const handleSaveSettings = async (updated: Partial<UserSettings>) => {
    const nextSettings = { ...settings, ...updated };
    setSettings(nextSettings);
    localStorage.setItem('pomodoro_offline_settings', JSON.stringify(nextSettings));

    // Reset seconds if focus duration changed
    if (updated.focusDuration !== undefined && mode === TimerMode.FOCUS && !isRunning) {
      setSecondsLeft(updated.focusDuration * 60);
    } else if (updated.shortBreakDuration !== undefined && mode === TimerMode.SHORT_BREAK && !isRunning) {
      setSecondsLeft(updated.shortBreakDuration * 60);
    } else if (updated.longBreakDuration !== undefined && mode === TimerMode.LONG_BREAK && !isRunning) {
      setSecondsLeft(updated.longBreakDuration * 60);
    }

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          ...nextSettings,
          updatedAt: serverTimestamp()
        }, { merge: true });
        showToast('Configurações salvas e sincronizadas na nuvem!');
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
      }
    } else {
      showToast('Configurações salvas offline!');
    }
  };

  // Trigger Google Login
  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setUser(res.user);
        setNeedsAuth(false);
        showToast(`Bem-vindo, ${res.user.displayName}!`, 'success');
      }
    } catch (err) {
      console.error('Falha de login:', err);
      showToast('Autenticação falhou. Tente novamente.', 'error');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handle Logout triggers
  const handleLogout = async () => {
    try {
      await logoutUser();
      setUser(null);
      setNeedsAuth(true);
      showToast('Conta desconectada com sucesso.', 'info');
    } catch (err) {
      console.error('Erro ao deslogar:', err);
    }
  };

  // Countdown clock loop handles
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSecondsLeft(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            handleCycleCompletion();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning, secondsLeft, mode]);

  // Auto skip / change segments handler
  const handleCycleCompletion = async () => {
    const isFocusFinished = mode === TimerMode.FOCUS;
    const completedDuration = isFocusFinished 
      ? settings.focusDuration 
      : (mode === TimerMode.SHORT_BREAK ? settings.shortBreakDuration : settings.longBreakDuration);

    // Play synthesized high precision notification beep
    triggerAudioAlerter('success');

    // Trigger local push notification
    const pushTitle = isFocusFinished ? 'Tempo de Foco Concluído!' : 'Intervalo Terminado!';
    const pushBody = isFocusFinished 
      ? `Parabéns! Você completou ${settings.focusDuration} minutos de foco direcionado.` 
      : 'Hora de retornar ao posto de foco. Concentração máxima!';
    triggerPushNotification(pushTitle, pushBody);

    // Construct completed log object
    const actId = `log_${Date.now()}`;
    const newLog: ActivityLog = {
      id: actId,
      userId: user?.uid || 'offline_user',
      taskName: isFocusFinished ? (taskName.trim() || 'Foco Geral') : 'Pausa Relaxante',
      type: mode,
      duration: completedDuration,
      completed: true,
      createdAt: Date.now()
    };

    // Calculate Game Points & Progression (+10 XP focus, +5 break)
    const earnedXp = isFocusFinished ? 10 : 5;
    const latestXp = settings.xp + earnedXp;
    const calculatedLevel = Math.floor(latestXp / 100) + 1;
    const didLevelUp = calculatedLevel > settings.level;

    const nextUserStats = {
      ...settings,
      xp: latestXp,
      level: calculatedLevel
    };
    
    setSettings(nextUserStats);
    
    // Concat locally
    const nextLogsList = [newLog, ...logs];
    setLogs(nextLogsList);
    localStorage.setItem('pomodoro_offline_logs', JSON.stringify(nextLogsList));

    // Save online and evaluate achievements
    if (user) {
      try {
        const userBatch = writeBatch(db);
        // Write completed activity
        const actRef = doc(db, 'users', user.uid, 'activities', actId);
        userBatch.set(actRef, { ...newLog, createdAt: serverTimestamp() });

        // Update levels / profile XP
        const userRef = doc(db, 'users', user.uid);
        userBatch.set(userRef, {
          xp: latestXp,
          level: calculatedLevel,
          updatedAt: serverTimestamp()
        }, { merge: true });

        await userBatch.commit();
        evaluateAchievements(nextLogsList, calculatedLevel);

        if (isFocusFinished) {
          showToast(`Sessão finalizada! +10 XP conquistados!`, 'success');
        } else {
          showToast(`Pausa encerrada! +5 XP conquistados!`, 'info');
        }

        if (didLevelUp) {
          setTimeout(() => {
            triggerAudioAlerter('success');
            showToast(`🔥 NÍVEL UP! Você alcançou o Nível ${calculatedLevel}!`, 'success');
          }, 1500);
        }
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
      }
    } else {
      // Offline local evaluation
      evaluateAchievementsOffline(nextLogsList, calculatedLevel);
      if (isFocusFinished) {
        showToast('Sessão registrada offline! +10 XP!', 'success');
      }
    }

    // Switch focus cycle configurations (Standard Pomodoro Rule: 4 focus cycles then a big long break)
    if (isFocusFinished) {
      if (currentCycle % 4 === 0) {
        setMode(TimerMode.LONG_BREAK);
        setSecondsLeft(settings.longBreakDuration * 60);
        setCurrentCycle(1);
        showToast('Excelente ritmo! Hora de uma pausa longa para descansar o cérebro.', 'info');
      } else {
        setMode(TimerMode.SHORT_BREAK);
        setSecondsLeft(settings.shortBreakDuration * 60);
        setCurrentCycle(prev => prev + 1);
        showToast('Muito bem! Faça um breve alongamento de 5 minutos.', 'info');
      }
    } else {
      setMode(TimerMode.FOCUS);
      setSecondsLeft(settings.focusDuration * 60);
      showToast('Intervalo concluído. Pronto para o próximo round de foco?', 'success');
    }
  };



  // Evaluate milestones and earn trophies (Cloud-connected database syncing)
  const evaluateAchievements = async (allLogs: ActivityLog[], currentLvl: number) => {
    if (!user) return;

    const focusSessions = allLogs.filter(l => l.type === 'focus' && l.completed);
    const focusCount = focusSessions.length;

    // Check night owl rule
    const hasNightFocus = focusSessions.some(l => {
      const h = new Date(l.createdAt).getHours();
      return h >= 18 || h < 4;
    });

    const pendingBadges: BadgeItem[] = [];

    PRESET_BADGES.forEach(preset => {
      const alreadyEarned = unlockedBadges.some(b => b.badgeId === preset.id);
      if (alreadyEarned) return;

      let qualified = false;
      if (preset.requirementType === 'sessions' && focusCount >= preset.requirementValue) {
        qualified = true;
      } else if (preset.requirementType === 'level' && currentLvl >= preset.requirementValue) {
        qualified = true;
      } else if (preset.requirementType === 'night' && hasNightFocus) {
        qualified = true;
      }

      if (qualified) {
        pendingBadges.push({
          id: `badge_${preset.id}_${Date.now()}`,
          userId: user.uid,
          badgeId: preset.id,
          title: preset.title,
          description: preset.description,
          earnedAt: Date.now()
        });
      }
    });

    if (pendingBadges.length > 0) {
      try {
        const batch = writeBatch(db);
        pendingBadges.forEach(b => {
          const badgeRef = doc(db, 'users', user.uid, 'badges', b.badgeId);
          batch.set(badgeRef, { ...b, earnedAt: serverTimestamp() });
        });
        await batch.commit();
        triggerAudioAlerter('success');
        showToast(`🏆 Medalha desbloqueada! Confira sua prateleira de conquistas!`, 'success');
      } catch (err) {
        console.error('Falhou ao salvar badges:', err);
      }
    }
  };

  // Offline gamified evaluator
  const evaluateAchievementsOffline = (allLogs: ActivityLog[], currentLvl: number) => {
    const focusCount = allLogs.filter(l => l.type === 'focus' && l.completed).length;
    const hasNightFocus = allLogs.filter(l => l.type === 'focus' && l.completed).some(l => {
      const h = new Date(l.createdAt).getHours();
      return h >= 18 || h < 4;
    });

    let modified = false;
    const nextBadges = [...unlockedBadges];

    PRESET_BADGES.forEach(preset => {
      const alreadyEarned = nextBadges.some(b => b.badgeId === preset.id);
      if (alreadyEarned) return;

      let qualified = false;
      if (preset.requirementType === 'sessions' && focusCount >= preset.requirementValue) {
        qualified = true;
      } else if (preset.requirementType === 'level' && currentLvl >= preset.requirementValue) {
        qualified = true;
      } else if (preset.requirementType === 'night' && hasNightFocus) {
        qualified = true;
      }

      if (qualified) {
        nextBadges.push({
          id: `offline_badge_${preset.id}`,
          userId: 'offline_user',
          badgeId: preset.id,
          title: preset.title,
          description: preset.description,
          earnedAt: Date.now()
        });
        modified = true;
      }
    });

    if (modified) {
      setUnlockedBadges(nextBadges);
      localStorage.setItem('pomodoro_offline_badges', JSON.stringify(nextBadges));
      triggerAudioAlerter('success');
      showToast('Nova medalha adicionada offline!', 'success');
    }
  };

  // Delete log session (with confirmation)
  const handleDeleteLog = async (logId: string) => {
    const pin = window.confirm('Deseja realmente apagar esta sessão de histórico? Esta ação é irreversível.');
    if (!pin) return;

    const nextLogs = logs.filter(l => l.id !== logId);
    setLogs(nextLogs);
    localStorage.setItem('pomodoro_offline_logs', JSON.stringify(nextLogs));

    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'activities', logId));
        showToast('Registro deletado da nuvem!');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/activities/${logId}`);
      }
    } else {
      showToast('Registro apagado offline!');
    }
  };

  // Play, Pause and controls
  const handleToggleTimer = () => {
    setIsRunning(!isRunning);
    triggerAudioAlerter('break');
  };

  const handleResetTimer = () => {
    const selectMin = mode === TimerMode.FOCUS 
      ? settings.focusDuration 
      : (mode === TimerMode.SHORT_BREAK ? settings.shortBreakDuration : settings.longBreakDuration);
    setSecondsLeft(selectMin * 60);
    setIsRunning(false);
    showToast('Temporizador redefinido.');
  };

  const handleSkipRound = () => {
    const confirmSkip = window.confirm('Gostaria de pular o round atual? O tempo decorrido não será creditado.');
    if (!confirmSkip) return;
    
    setIsRunning(false);
    if (mode === TimerMode.FOCUS) {
      setMode(TimerMode.SHORT_BREAK);
      setSecondsLeft(settings.shortBreakDuration * 60);
    } else {
      setMode(TimerMode.FOCUS);
      setSecondsLeft(settings.focusDuration * 60);
    }
    showToast('Round pulado com sucesso.');
  };

  // Convert seconds left into aesthetic countdown strings
  const formattedCountdown = useMemo(() => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, [secondsLeft]);

  // Daily target session met counts today
  const todayCompletedFocusCount = useMemo(() => {
    return logs.filter(log => {
      const logDate = new Date(log.createdAt);
      const today = new Date();
      return log.type === 'focus' && log.completed &&
        logDate.getDate() === today.getDate() &&
        logDate.getMonth() === today.getMonth() &&
        logDate.getFullYear() === today.getFullYear();
    }).length;
  }, [logs]);

  // Update page header title according to timer state for ultimate tab usability
  useEffect(() => {
    document.title = isRunning ? `(${formattedCountdown}) Pomodoro` : 'Pomodoro Tracker';
  }, [formattedCountdown, isRunning]);

  return (
    <div className={`min-h-screen text-slate-800 dark:text-slate-100 flex flex-col font-sans transition-all duration-300`}>
      {/* Dynamic Floating Toast feedback wrapper */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-2.5 px-5 py-3.5 rounded-2xl shadow-xl font-bold border ${
              toast.type === 'success' 
                ? 'bg-emerald-500 text-white border-emerald-400' 
                : toast.type === 'info'
                ? 'bg-slate-900 border-slate-700 text-white' 
                : 'bg-red-500 text-white border-red-400'
            }`}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="text-sm">{toast.message}</span>
            <button onClick={() => setToast(null)} className="ml-2 hover:opacity-85 text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Core View Area */}
      {isAuthLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center space-y-4">
          <div className="relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-65" />
            <div className="bg-orange-500 p-4 rounded-3xl text-white shadow-[0_0_20px_rgba(249,115,22,0.5)]">
              <Clock className="w-10 h-10 animate-spin" />
            </div>
          </div>
          <h3 className="font-bold text-slate-400 dark:text-slate-500 text-sm">Validando Conexão Segura...</h3>
        </div>
      ) : needsAuth ? (
        // GSI Material login interface when unauthorized
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white dark:bg-zinc-900/40 dark:backdrop-blur-md border border-slate-100 dark:border-white/5 rounded-3xl p-8 text-center shadow-2xl">
            <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/30 text-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_15px_rgba(249,115,22,0.2)]">
              <Clock className="w-8 h-8" />
            </div>
            
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Pomodoro Tracker</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xs mx-auto mb-6">
              Sincronize seu progresso em tempo real, gerencie conquistas e domine seu tempo de foco diário de maneira profissional.
            </p>

            {/* Oficial GSI login button specification representation */}
            <button 
              onClick={handleGoogleLogin} 
              disabled={isLoggingIn}
              className="w-full bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-2xl py-3.5 px-6 font-bold flex items-center justify-center space-x-3 transition active:scale-98 shadow-sm"
            >
              <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="w-5 h-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
              <span>{isLoggingIn ? 'Autenticando...' : 'Entrar com o Google'}</span>
            </button>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
              Sincronização instantânea e suporte offline completos.
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Main Top Header Navigation */}
          <header className="border-b border-slate-100 dark:border-white/5 bg-white/70 dark:bg-black/40 backdrop-blur-md sticky top-0 z-40 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center space-x-3 font-display">
                <div className="p-2 bg-orange-500 text-white rounded-xl shadow-[0_0_15px_rgba(249,115,22,0.4)]">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight uppercase">Pomodoro Tracker</h1>
                  <span className="text-[10px] text-emerald-500 font-bold flex items-center space-x-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Real-time Sync</span>
                  </span>
                </div>
              </div>

              {/* Dynamic Action Tabs Navigation */}
              <nav className="hidden md:flex items-center space-x-1 bg-slate-100 dark:bg-zinc-950 p-1 rounded-full border dark:border-white/5">
                <button
                  onClick={() => setActiveTab('timer')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                    activeTab === 'timer' 
                      ? 'bg-white dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 shadow-sm border dark:border-orange-500/30' 
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Temporizador
                </button>
                <button
                  onClick={() => setActiveTab('history')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                    activeTab === 'history' 
                      ? 'bg-white dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 shadow-sm border dark:border-orange-500/30' 
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Histórico
                </button>
                <button
                  onClick={() => setActiveTab('stats')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                    activeTab === 'stats' 
                      ? 'bg-white dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 shadow-sm border dark:border-orange-500/30' 
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Estatísticas
                </button>
                <button
                  onClick={() => setActiveTab('badges')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                    activeTab === 'badges' 
                      ? 'bg-white dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 shadow-sm border dark:border-orange-500/30' 
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Medalhas
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
                    activeTab === 'settings' 
                      ? 'bg-white dark:bg-orange-500/20 text-orange-600 dark:text-orange-400 shadow-sm border dark:border-orange-500/30' 
                      : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                  }`}
                >
                  Configurações
                </button>
              </nav>

              {/* Header Right User Widget Status */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="flex items-center justify-end space-x-1 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    <span>Nível {settings.level}</span>
                  </div>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">{settings.xp} XP</span>
                </div>
                
                {user?.photoURL ? (
                  <img
                    onClick={() => setActiveTab('settings')}
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-800 cursor-pointer active:scale-95"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div 
                    onClick={() => setActiveTab('settings')}
                    className="w-9 h-9 bg-red-100 dark:bg-red-950/30 text-red-500 text-sm font-bold rounded-full flex items-center justify-center cursor-pointer active:scale-95 border border-slate-200 dark:border-slate-850"
                  >
                    {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'U'}
                  </div>
                )}
              </div>
            </div>
          </header>

          <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.2 }}
                className="w-full h-full"
              >
                {/* 1. MAIN TEMPORIZADOR PANEL */}
                {activeTab === 'timer' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    {/* Big Visual Clock Timer Controller */}
                    <div className="lg:col-span-2 relative bg-white dark:bg-zinc-900/40 dark:backdrop-blur-md border border-slate-100 dark:border-white/5 rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center overflow-hidden">
                      {/* Atmospheric Glow */}
                      <div className="absolute w-[400px] h-[400px] bg-orange-500/5 dark:bg-orange-500/10 blur-[100px] rounded-full pointer-events-none -z-10" />
                      
                      <div className="flex items-center space-x-1 bg-slate-100 dark:bg-zinc-950/80 p-1 rounded-full border dark:border-white/5 mb-8">
                        <button
                          onClick={() => {
                            setMode(TimerMode.FOCUS);
                            setSecondsLeft(settings.focusDuration * 60);
                            setIsRunning(false);
                          }}
                          className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                            mode === TimerMode.FOCUS 
                              ? 'bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]' 
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                          }`}
                        >
                          Foco
                        </button>
                        <button
                          onClick={() => {
                            setMode(TimerMode.SHORT_BREAK);
                            setSecondsLeft(settings.shortBreakDuration * 60);
                            setIsRunning(false);
                          }}
                          className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                            mode === TimerMode.SHORT_BREAK 
                              ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' 
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                          }`}
                        >
                          Pausa Curta
                        </button>
                        <button
                          onClick={() => {
                            setMode(TimerMode.LONG_BREAK);
                            setSecondsLeft(settings.longBreakDuration * 60);
                            setIsRunning(false);
                          }}
                          className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                            mode === TimerMode.LONG_BREAK 
                              ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' 
                              : 'text-slate-500 dark:text-zinc-400 hover:text-slate-800 dark:hover:text-zinc-200'
                          }`}
                        >
                          Pausa Longa
                        </button>
                      </div>

                      {/* Giant Circle countdown display */}
                      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center mb-8">
                        {/* Interactive SVG background tracker */}
                        <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                          <circle
                            cx="50%"
                            cy="50%"
                            r="44%"
                            strokeWidth="10"
                            className="stroke-slate-100 dark:stroke-slate-800"
                            fill="transparent"
                          />
                          <motion.circle
                            cx="50%"
                            cy="50%"
                            r="44%"
                            strokeWidth="10"
                            strokeDasharray="276"
                            className={
                              mode === TimerMode.FOCUS 
                                ? 'stroke-red-500' 
                                : mode === TimerMode.SHORT_BREAK 
                                ? 'stroke-blue-500' 
                                : 'stroke-emerald-500'
                            }
                            fill="transparent"
                            strokeLinecap="round"
                            animate={{
                              strokeDashoffset: (1 - secondsLeft / (
                                mode === TimerMode.FOCUS 
                                  ? settings.focusDuration * 60 
                                  : mode === TimerMode.SHORT_BREAK 
                                  ? settings.shortBreakDuration * 60 
                                  : settings.longBreakDuration * 60
                              )) * 276
                            }}
                            transition={{ duration: 0.1, ease: 'linear' }}
                          />
                        </svg>

                        <div className="text-center z-10">
                          <span className="text-5xl sm:text-6xl font-black font-mono tracking-tight text-slate-900 dark:text-white block">
                            {formattedCountdown}
                          </span>
                          <span className="text-xs font-bold opacity-60 tracking-widest mt-1 block uppercase">
                            {mode === TimerMode.FOCUS ? 'Foco Produtivo' : 'Descanso'}
                          </span>
                        </div>
                      </div>

                      {/* Task Input descriptor block */}
                      {mode === TimerMode.FOCUS && (
                        <div className="w-full max-w-sm mb-6">
                          <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-1.5 text-center">
                            Em que tarefa você está focado agora?
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Refatorar API, Escrever Relatório..."
                            value={taskName}
                            onChange={(e) => setTaskName(e.target.value)}
                            className="w-full text-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-2xl px-4 py-3 text-slate-800 dark:text-white text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-red-400 placeholder:text-slate-400"
                          />
                        </div>
                      )}

                      {/* Core Start/Pause & skip control handlers */}
                      <div className="flex items-center space-x-4 mb-8">
                        <button
                          onClick={handleResetTimer}
                          className="p-3.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 rounded-2xl transition border border-slate-200 dark:border-slate-850"
                          title="Reiniciar tempo"
                        >
                          <RotateCcw className="w-5 h-5" />
                        </button>

                        <button
                          onClick={handleToggleTimer}
                          className={`px-8 py-4 text-white font-extrabold text-sm rounded-2xl flex items-center space-x-3.5 shadow-lg transition-all duration-300 active:scale-95 ${
                            isRunning 
                              ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/10' 
                              : mode === TimerMode.FOCUS 
                              ? 'bg-red-500 hover:bg-red-600 shadow-red-500/10' 
                              : mode === TimerMode.SHORT_BREAK
                              ? 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/10'
                              : 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/10'
                          }`}
                        >
                          {isRunning ? (
                            <>
                              <Pause className="w-5 h-5" />
                              <span>Pausar</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-5 h-5 animate-pulse" />
                              <span>Iniciar Foco</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleSkipRound}
                          className="p-3.5 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-850 text-slate-600 dark:text-slate-400 rounded-2xl transition border border-slate-200 dark:border-slate-850"
                          title="Pular ciclo"
                        >
                          <FastForward className="w-5 h-5" />
                        </button>
                      </div>

                    </div>

                    {/* Right column sidebar (Simulated Widget Display and Active Daily Stream) */}
                    <div className="space-y-6">
                      <SimulatedWidget
                        timerLabel={formattedCountdown}
                        isRunning={isRunning}
                        mode={mode}
                        taskName={taskName}
                        onToggle={handleToggleTimer}
                        onReset={handleResetTimer}
                        onSkip={handleSkipRound}
                        todayCount={todayCompletedFocusCount}
                        dailyGoal={settings.dailyGoal}
                        level={settings.level}
                      />

                      {/* Small Quick achievements metrics */}
                      <div className="bg-white dark:bg-[#0d0d0d]/60 dark:backdrop-blur-md border border-slate-150 dark:border-white/5 rounded-3xl p-5 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center space-x-2 font-display">
                          <Trophy className="w-4 h-4 text-orange-500" />
                          <span>Conquistas Desbloqueadas</span>
                        </h3>
                        <div className="flex flex-wrap gap-2">
                          {unlockedBadges.slice(0, 3).map(b => (
                            <span key={b.id} className="text-[11px] font-bold bg-orange-50 dark:bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2.5 py-1 rounded-full border border-orange-100 dark:border-orange-500/10">
                              🏆 {b.title}
                            </span>
                          ))}
                          {unlockedBadges.length === 0 && (
                            <span className="text-xs text-slate-400">Inicie um timer para ganhar troféus!</span>
                          )}
                          {unlockedBadges.length > 3 && (
                            <span className="text-xs text-slate-400 font-bold self-center">
                              +{unlockedBadges.length - 3} mais
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. LOG DETAILS SYSTEM HISTORICO */}
                {activeTab === 'history' && (
                  <div className="bg-white dark:bg-[#0d0d0d]/60 dark:backdrop-blur-md border border-slate-150 dark:border-white/5 rounded-3xl p-6 md:p-8">
                    <div className="flex items-center justify-between mb-6">
                      <div className="font-display">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Histórico de Atividades</h2>
                        <p className="text-xs text-slate-400 dark:text-zinc-500">Acompanhamento granular das fatias de produtividade</p>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-slate-800 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                            <th className="pb-3">Data</th>
                            <th className="pb-3">Descrição / Tarefa</th>
                            <th className="pb-3">Tipo de Ciclo</th>
                            <th className="pb-3">Duração (Min)</th>
                            <th className="pb-3">Status</th>
                            <th className="pb-3 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-sm">
                          {logs.map(log => (
                            <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-zinc-950/40 transition group">
                              <td className="py-4 font-medium text-slate-400">
                                {new Date(log.createdAt).toLocaleString()}
                              </td>
                              <td className="py-4 font-bold text-slate-900 dark:text-white">
                                {log.taskName || 'Foco Direcionado'}
                              </td>
                              <td className="py-4">
                                <span className={`text-[10px] uppercase font-semibold px-2.5 py-1 rounded-full ${
                                  log.type === 'focus' 
                                    ? 'bg-orange-50 text-orange-500 dark:bg-orange-500/10' 
                                    : log.type === 'short_break'
                                    ? 'bg-indigo-50 text-indigo-500 dark:bg-indigo-500/10'
                                    : 'bg-emerald-50 text-emerald-500 dark:bg-emerald-500/10'
                                }`}>
                                  {log.type === 'focus' ? 'Foco' : log.type === 'short_break' ? 'Pausa Curta' : 'Pausa Longa'}
                                </span>
                              </td>
                              <td className="py-4 font-bold text-slate-700 dark:text-slate-300">
                                {log.duration} minutos
                              </td>
                              <td className="py-4">
                                <div className="flex items-center space-x-2">
                                  {log.completed ? (
                                    <span className="flex items-center space-x-1 text-xs font-bold text-emerald-500">
                                      <Check className="w-4 h-4" />
                                      <span>Completo</span>
                                    </span>
                                  ) : (
                                    <span className="flex items-center space-x-1 text-xs font-bold text-red-400">
                                      <X className="w-4 h-4" />
                                      <span>Abortado</span>
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 text-right">
                                <button
                                  onClick={() => handleDeleteLog(log.id)}
                                  className="p-1.5 text-slate-300 hover:text-red-500 dark:text-slate-700 dark:hover:text-red-400 rounded-lg opacity-0 group-hover:opacity-100 transition"
                                  title="Apagar do histórico"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </td>
                            </tr>
                          ))}

                          {logs.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-8 text-center text-slate-400">
                                <Clock className="w-10 h-10 mx-auto opacity-20 mb-2" />
                                <span>Nenhum ciclo produtivo registrado ainda. Inicie seu temporizador!</span>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* 3. PERFORMANCE STATS & CHART REPORTS */}
                {activeTab === 'stats' && (
                  <ReportCharts logs={logs} dailyGoal={settings.dailyGoal} />
                )}

                {/* 4. TROPHY AND ACHIEVEMENTS DISPLAY */}
                {activeTab === 'badges' && (
                  <BadgeRack 
                    unlockedBadges={unlockedBadges} 
                    xp={settings.xp} 
                    level={settings.level} 
                  />
                )}

                {/* 5. APP SETTINGS CODES */}
                {activeTab === 'settings' && (
                  <SettingsPanel 
                    settings={settings} 
                    onSaveSettings={handleSaveSettings}
                    user={user}
                    onLogout={handleLogout}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Simple Bottom Footer Info containing standard system instructions layouts */}
          <footer className="py-8 border-t border-slate-100 dark:border-white/5 text-center text-xs text-slate-400 dark:text-zinc-500 transition-colors duration-300">
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 font-sans text-[10px] uppercase tracking-wider">
              <p>Pomodoro Tracker • Suporte em tempo real e offline ativo.</p>
              <p className="font-mono opacity-80">Version 4.2.0-Alpha • Last Backup Recente</p>
            </div>
          </footer>
        </>
      )}

      {/* Interactive Bottom bar for mobile navigation */}
      {!needsAuth && !isAuthLoading && (
        <div className="md:hidden sticky bottom-0 z-40 bg-white/95 dark:bg-black/95 border-t border-slate-105 dark:border-white/5 backdrop-blur-md grid grid-cols-5 h-16 text-[10px] font-semibold text-slate-400 dark:text-zinc-500">
          <button
            onClick={() => setActiveTab('timer')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'timer' ? 'text-orange-500 dark:text-white' : ''
            }`}
          >
            <Clock className="w-5 h-5" />
            <span>Timer</span>
          </button>
          
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'history' ? 'text-orange-500 dark:text-white' : ''
            }`}
          >
            <Calendar className="w-5 h-5" />
            <span>Histórico</span>
          </button>

          <button
            onClick={() => setActiveTab('stats')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'stats' ? 'text-orange-500 dark:text-white' : ''
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Stats</span>
          </button>

          <button
            onClick={() => setActiveTab('badges')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'badges' ? 'text-orange-500 dark:text-white' : ''
            }`}
          >
            <Trophy className="w-5 h-5" />
            <span>Trofés</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center justify-center space-y-1 ${
              activeTab === 'settings' ? 'text-orange-500 dark:text-white' : ''
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Ajustes</span>
          </button>
        </div>
      )}
    </div>
  );
}
