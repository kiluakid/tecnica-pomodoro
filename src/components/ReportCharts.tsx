/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { ActivityLog } from '../types';
import { Calendar, Award, Clock, BarChart2 } from 'lucide-react';

interface ReportChartsProps {
  logs: ActivityLog[];
  dailyGoal: number;
}

export const ReportCharts: React.FC<ReportChartsProps> = ({ logs, dailyGoal }) => {
  // Convert logs into formatted chart datasets
  const reportsData = useMemo(() => {
    // 1. Weekly active days chart data
    const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const now = new Date();
    
    // Get timestamps representing start of today and 7 days ago
    const tempDate = new Date();
    tempDate.setHours(0, 0, 0, 0);
    const startOfTodayMs = tempDate.getTime();
    const startOfSevenDaysAgoMs = startOfTodayMs - 6 * 24 * 60 * 60 * 1000;

    // Initialize daily array
    const dailyMap = new Map<string, { label: string; dateStr: string; focusMin: number; breaksCount: number; timestamp: number }>();
    
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfSevenDaysAgoMs + i * 24 * 60 * 60 * 1000);
      const dayLabel = daysOfWeek[d.getDay()];
      const key = `${d.getFullYear()}-${(d.getMonth()+1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
      dailyMap.set(key, {
        label: `${dayLabel} (${d.getDate()}/${d.getMonth() + 1})`,
        dateStr: key,
        focusMin: 0,
        breaksCount: 0,
        timestamp: d.getTime()
      });
    }

    // Populate daily records
    let totalFocusMin = 0;
    let completedCount = 0;
    let focusSegmentsCount = 0;

    logs.forEach(log => {
      const logDate = new Date(log.createdAt);
      const key = `${logDate.getFullYear()}-${(logDate.getMonth()+1).toString().padStart(2, '0')}-${logDate.getDate().toString().padStart(2, '0')}`;
      
      if (log.completed) {
        completedCount++;
      }

      if (dailyMap.has(key)) {
        const item = dailyMap.get(key)!;
        if (log.type === 'focus') {
          item.focusMin += log.duration;
          if (log.completed) focusSegmentsCount++;
        } else {
          item.breaksCount += 1;
        }
        totalFocusMin += log.type === 'focus' ? log.duration : 0;
      }
    });

    const weeklyChart = Array.from(dailyMap.values()).sort((a, b) => a.timestamp - b.timestamp);

    // 2. Performance categorization segment
    let focusTotal = 0;
    let shortTotal = 0;
    let longTotal = 0;

    logs.forEach(log => {
      if (log.type === 'focus') focusTotal += log.duration;
      else if (log.type === 'short_break') shortTotal += log.duration;
      else if (log.type === 'long_break') longTotal += log.duration;
    });

    const categoriesChart = [
      { name: 'Foco (Min)', value: focusTotal, color: '#f97316' }, // glowing orange
      { name: 'Pausa Curta (Min)', value: shortTotal, color: '#4f46e5' }, // indigo
      { name: 'Pausa Longa (Min)', value: longTotal, color: '#10b981' }, // emerald
    ].filter(item => item.value > 0);

    return {
      weeklyChart,
      categoriesChart,
      totalFocusMin,
      completedSessionsCount: completedCount,
      successRate: logs.length > 0 ? Math.round((completedCount / logs.length) * 100) : 0,
      todaySessionsCount: logs.filter(log => {
        const logDate = new Date(log.createdAt);
        const today = new Date();
        return log.type === 'focus' && log.completed &&
          logDate.getDate() === today.getDate() &&
          logDate.getMonth() === today.getMonth() &&
          logDate.getFullYear() === today.getFullYear();
      }).length
    };
  }, [logs]);

  const COLORS = ['#f97316', '#4f46e5', '#10b981'];

  return (
    <div id="statistics-panel" className="space-y-6 font-sans">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric Card 1 */}
        <div className="bg-white dark:bg-zinc-900/40 dark:backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-orange-50 dark:bg-orange-500/10 text-orange-500 rounded-xl">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-450 dark:text-zinc-500">Tempo de Foco (Total)</p>
            <h4 className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {reportsData.totalFocusMin} <span className="text-xs font-normal">min</span>
            </h4>
          </div>
        </div>

        {/* Metric Card 2 */}
        <div className="bg-white dark:bg-zinc-900/40 dark:backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 rounded-xl">
            <Award className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-450 dark:text-zinc-500">Meta Diária</p>
            <h4 className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {reportsData.todaySessionsCount} / {dailyGoal}
              <span className="text-xs font-normal text-slate-400 block sm:inline sm:ml-2">
                ({Math.min(100, Math.round((reportsData.todaySessionsCount / dailyGoal) * 100))}% hoje)
              </span>
            </h4>
          </div>
        </div>

        {/* Metric Card 3 */}
        <div className="bg-white dark:bg-zinc-900/40 dark:backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 rounded-xl">
            <Calendar className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-450 dark:text-zinc-500">Ciclos Registrados</p>
            <h4 className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {logs.length} <span className="text-sm font-normal text-slate-400">({reportsData.completedSessionsCount} concluídos)</span>
            </h4>
          </div>
        </div>

        {/* Metric Card 4 */}
        <div className="bg-white dark:bg-zinc-900/40 dark:backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-2xl p-4 flex items-center space-x-4">
          <div className="p-3 bg-violet-50 dark:bg-violet-500/10 text-violet-500 rounded-xl">
            <BarChart2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-450 dark:text-zinc-500">Taxa de Conclusão</p>
            <h4 className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
              {reportsData.successRate}%
            </h4>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Bar Chart: Weekly focused time */}
        <div className="bg-white dark:bg-zinc-900/40 dark:backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-3xl p-6 lg:col-span-2 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="font-display">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase">Produtividade Semanal</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500">Minutos dedicados ao foco nos últimos 7 dias</p>
            </div>
          </div>
          
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportsData.weeklyChart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis 
                  dataKey="label" 
                  stroke="#6b7280" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis 
                  stroke="#6b7280" 
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(9, 9, 11, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '12px',
                    color: '#FFF',
                    fontSize: '11px',
                    fontFamily: 'monospace'
                  }}
                  itemStyle={{ color: '#f97316' }}
                />
                <Bar 
                  dataKey="focusMin" 
                  name="Minutos de Foco" 
                  fill="#f97316" 
                  radius={[4, 4, 0, 0]} 
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Categories Pie Chart: Focus / Break Split */}
        <div className="bg-white dark:bg-zinc-900/40 dark:backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-sm">
          <div className="font-display">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white uppercase">Distribuição de Tempo</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">Proporção entre Foco e Pausas</p>
          </div>

          <div className="h-56 mt-4 flex items-center justify-center relative">
            {reportsData.categoriesChart.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reportsData.categoriesChart}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {reportsData.categoriesChart.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(9, 9, 11, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '12px',
                      color: '#FFF',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="absolute inset-x-0 inset-y-0 flex flex-col items-center justify-center text-slate-400">
                <BarChart2 className="w-10 h-10 opacity-30 mb-2" />
                <span className="text-sm">Sem dados suficientes</span>
              </div>
            )}
            {reportsData.categoriesChart.length > 0 && (
              <div className="absolute flex flex-col items-center">
                <span className="text-2xl font-bold font-mono text-slate-900 dark:text-white">
                  {reportsData.totalFocusMin}m
                </span>
                <span className="text-[10px] text-zinc-550 uppercase tracking-wider font-semibold">
                  Foco Total
                </span>
              </div>
            )}
          </div>

          <div className="mt-2 space-y-1 text-[11px] font-medium">
            {reportsData.categoriesChart.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 dark:text-zinc-400">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900 dark:text-white font-mono">{item.value} min</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
