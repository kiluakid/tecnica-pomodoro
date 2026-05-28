/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Play, Pause, RotateCcw, FastForward, Award, Shield, Sparkles } from 'lucide-react';
import { TimerMode } from '../types';

interface SimulatedWidgetProps {
  timerLabel: string; // e.g. "25:00"
  isRunning: boolean;
  mode: TimerMode;
  taskName: string;
  onToggle: () => void;
  onReset: () => void;
  onSkip: () => void;
  todayCount: number;
  dailyGoal: number;
  level: number;
}

export const SimulatedWidget: React.FC<SimulatedWidgetProps> = ({
  timerLabel,
  isRunning,
  mode,
  taskName,
  onToggle,
  onReset,
  onSkip,
  todayCount,
  dailyGoal,
  level,
}) => {
  const getModeLabelAndColor = () => {
    switch (mode) {
      case TimerMode.FOCUS:
        return { text: 'FOCO', bg: 'bg-red-500', textClr: 'text-red-500' };
      case TimerMode.SHORT_BREAK:
        return { text: 'PAUSA', bg: 'bg-blue-500', textClr: 'text-blue-500' };
      case TimerMode.LONG_BREAK:
        return { text: 'PAUSA LONGA', bg: 'bg-emerald-500', textClr: 'text-emerald-500' };
    }
  };

  const modeInfo = getModeLabelAndColor();

  return (
    <div id="homescreen-widget-container" className="bg-slate-100 dark:bg-slate-950 p-6 rounded-3xl border border-slate-200/50 dark:border-slate-850 max-w-sm mx-auto shadow-inner">
      <div className="flex items-center justify-between mb-3 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest">
        <span>Visualizador de Widget</span>
        <span className="flex items-center space-x-1">
          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
          <span>Ativo na Tela Inicial</span>
        </span>
      </div>

      {/* Actual Glassmorphic Widget Mockup */}
      <div className="relative overflow-hidden bg-white/70 dark:bg-slate-900/80 backdrop-blur-md rounded-2xl p-4 border border-white dark:border-slate-800 shadow-xl">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full text-white ${modeInfo.bg} tracking-wider`}>
              {modeInfo.text}
            </span>
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 line-clamp-1 max-w-[150px] mt-1.5">
              {taskName || 'Concentração Geral'}
            </h4>
          </div>
          <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Nível {level}</span>
          </div>
        </div>

        {/* Big Compact Clock */}
        <div className="my-3 flex items-baseline space-x-2">
          <span className="text-4xl font-extrabold text-slate-900 dark:text-white tracking-tighter">
            {timerLabel}
          </span>
          <span className="text-xs text-slate-400 dark:text-slate-500 font-bold">
            ({todayCount}/{dailyGoal} metas)
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80">
          <div className="flex items-center space-x-2">
            <button
              onClick={onToggle}
              className={`p-2.5 rounded-full text-white shadow transition-all duration-200 active:scale-95 ${
                isRunning ? 'bg-amber-500 hover:bg-amber-600' : 'bg-red-500 hover:bg-red-600'
              }`}
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            <button
              onClick={onReset}
              className="p-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full transition-all duration-200"
              title="Reiniciar"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={onSkip}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-lg flex items-center space-x-1 text-[11px] font-bold transition"
          >
            <span>Pular</span>
            <FastForward className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 mt-3 font-semibold">
        Arraste ou instale no seu celular para ver esse widget compacto na tela do seu aparelho. Sincronização offline ativa!
      </p>
    </div>
  );
};
