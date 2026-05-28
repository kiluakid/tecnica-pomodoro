/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { PRESET_BADGES, BadgeItem } from '../types';
import { 
  Zap, 
  Target, 
  Award, 
  Sparkles, 
  Crown, 
  Moon, 
  Trophy, 
  ChevronRight,
  ShieldAlert
} from 'lucide-react';
import { motion } from 'motion/react';

interface BadgeRackProps {
  unlockedBadges: BadgeItem[];
  xp: number;
  level: number;
}

export const BadgeRack: React.FC<BadgeRackProps> = ({ unlockedBadges, xp, level }) => {
  const xpNeededForNextLevel = 100;
  const xpInCurrentLevel = xp % xpNeededForNextLevel;
  const progressPercent = Math.min(100, Math.round((xpInCurrentLevel / xpNeededForNextLevel) * 100));

  // Determine user title
  const getTitle = (lvl: number) => {
    if (lvl <= 1) return 'Iniciante do Tempo';
    if (lvl === 2) return 'Explorador da Atenção';
    if (lvl === 3) return 'Guerreiro Produtivo';
    if (lvl === 4) return 'Perito da Concentração';
    return 'Mestre Supremo do Foco';
  };

  // Pre-configured icon mapping
  const renderIcon = (iconName: string, isUnlocked: boolean) => {
    const props = {
      className: `w-6 h-6 ${isUnlocked ? 'text-red-500 dark:text-red-400' : 'text-slate-300 dark:text-slate-600'}`
    };

    switch (iconName) {
      case 'Zap': return <Zap {...props} />;
      case 'Target': return <Target {...props} />;
      case 'Award': return <Award {...props} />;
      case 'Sparkles': return <Sparkles {...props} />;
      case 'Crown': return <Crown {...props} />;
      case 'Moon': return <Moon {...props} />;
      default: return <Trophy {...props} />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Level Card */}
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-3xl p-6 shadow-xl shadow-orange-500/10 font-display">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
          <div>
            <span className="text-xs bg-white/20 px-3 py-1 rounded-full font-bold uppercase tracking-wider">
              Sistema de Níveis & XP
            </span>
            <h2 className="text-3xl font-black tracking-tight mt-2">Nível {level}</h2>
            <p className="text-sm text-orange-100 font-medium">{getTitle(level)}</p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-orange-50 opacity-80 uppercase">Experiência Total</span>
            <h3 className="text-2xl font-black">{xp} EXP</h3>
          </div>
        </div>

        {/* Level Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-xs font-bold text-orange-50 mb-2 font-sans">
            <span>Progresso do Nível</span>
            <span>{xpInCurrentLevel} / {xpNeededForNextLevel} XP</span>
          </div>
          <div className="w-full bg-black/15 h-3 rounded-full overflow-hidden">
            <motion.div 
              className="bg-white h-full rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[11px] text-orange-100 mt-2 font-medium font-sans">
            Faltam {xpNeededForNextLevel - xpInCurrentLevel} XP para subir para o Nível {level + 1}! Ganhe XP completando sessões de foco e pausas.
          </p>
        </div>
      </div>

      {/* Badges Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="font-display">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase">Conquistas e Medalhas</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Milestones atingidos e troféus coletados</p>
          </div>
          <span className="text-xs bg-slate-100 dark:bg-zinc-900 border dark:border-white/5 text-slate-500 dark:text-zinc-400 px-3 py-1 rounded-full font-bold">
            {unlockedBadges.length} de {PRESET_BADGES.length} Desbloqueadas
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PRESET_BADGES.map(badge => {
            const isUnlocked = unlockedBadges.some(b => b.badgeId === badge.id);
            const unlockedDetails = unlockedBadges.find(b => b.badgeId === badge.id);

            return (
              <div 
                key={badge.id}
                className={`border rounded-2xl p-4 flex items-start space-x-3 transition-all ${
                  isUnlocked 
                    ? 'bg-white dark:bg-zinc-900/40 dark:backdrop-blur-md border-orange-100 dark:border-orange-500/10 shadow-sm' 
                    : 'bg-slate-50/50 dark:bg-zinc-950/20 border-slate-100 dark:border-white/5 opacity-70'
                }`}
              >
                <div className={`p-3 rounded-xl ${
                  isUnlocked 
                    ? 'bg-orange-50 dark:bg-orange-500/10 ring-1 ring-orange-100 dark:ring-orange-500/20' 
                    : 'bg-slate-100 dark:bg-zinc-800'
                }`}>
                  {renderIcon(badge.icon, isUnlocked)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className={`text-sm font-bold truncate ${
                      isUnlocked ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {badge.title}
                    </h4>
                    {isUnlocked && (
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                    {badge.description}
                  </p>
                  
                  {isUnlocked && unlockedDetails && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-2">
                      Conquistado em {new Date(unlockedDetails.earnedAt).toLocaleDateString()}
                    </span>
                  )}

                  {!isUnlocked && (
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 block mt-2">
                       {badge.requirementType === 'sessions' && `Requisito: ${badge.requirementValue} fatias de foco`}
                       {badge.requirementType === 'level' && `Requisito: Nível ${badge.requirementValue}`}
                       {badge.requirementType === 'night' && `Requisito: Sessão de foco noturna`}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
