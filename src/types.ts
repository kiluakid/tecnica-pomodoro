/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum TimerMode {
  FOCUS = 'focus',
  SHORT_BREAK = 'short_break',
  LONG_BREAK = 'long_break',
}

export interface UserSettings {
  userId: string;
  email: string;
  displayName?: string;
  focusDuration: number; // in minutes
  shortBreakDuration: number; // in minutes
  longBreakDuration: number; // in minutes
  dailyGoal: number; // target count of focus sessions
  theme: 'light' | 'dark';
  xp: number;
  level: number;
}

export interface ActivityLog {
  id: string;
  userId: string;
  taskName?: string;
  type: 'focus' | 'short_break' | 'long_break';
  duration: number; // completed duration in minutes
  completed: boolean;
  createdAt: number; // Timestamp in ms
}

export interface BadgeItem {
  id: string;
  userId: string;
  badgeId: string;
  title: string;
  description: string;
  earnedAt: number; // Timestamp in ms
}

export interface PresetBadge {
  id: string;
  title: string;
  description: string;
  requirementType: 'sessions' | 'level' | 'streak' | 'night';
  requirementValue: number;
  icon: string;
}

export const PRESET_BADGES: PresetBadge[] = [
  {
    id: 'first_step',
    title: 'Primeiro Passo',
    description: 'Complete sua primeira sessão de foco de Pomodoro.',
    requirementType: 'sessions',
    requirementValue: 1,
    icon: 'Zap',
  },
  {
    id: 'focus_master_5',
    title: 'Concentração Firme',
    description: 'Complete 5 sessões de foco com sucesso.',
    requirementType: 'sessions',
    requirementValue: 5,
    icon: 'Target',
  },
  {
    id: 'focus_master_10',
    title: 'Mestre da Produtividade',
    description: 'Complete 10 sessões de foco com sucesso.',
    requirementType: 'sessions',
    requirementValue: 10,
    icon: 'Award',
  },
  {
    id: 'level_3',
    title: 'Guerreiro do Tempo',
    description: 'Alcance o Nível 3.',
    requirementType: 'level',
    requirementValue: 3,
    icon: 'Sparkles',
  },
  {
    id: 'level_5',
    title: 'Sábio do Foco',
    description: 'Alcance o Nível 5.',
    requirementType: 'level',
    requirementValue: 5,
    icon: 'Crown',
  },
  {
    id: 'night_owl',
    title: 'Coruja da Noite',
    description: 'Trabalhe em um bloco de foco após as 18:00 (6 PM).',
    requirementType: 'night',
    requirementValue: 1,
    icon: 'Moon',
  },
];
