/**
 * Cycle Calendar Component
 * Visual calendar for tracking menstrual cycle
 */

import { useState, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Droplets, Heart, Flower2, Sun, Moon, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CycleDay {
  date: Date;
  phase: 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'premenstrual' | 'unknown';
  symptoms?: {
    cramps: number;
    headaches: number;
    fatigue: number;
    mood: number;
  };
  notes?: string;
}

interface CycleCalendarProps {
  cycleLength: number;
  onDateSelect?: (date: Date) => void;
}

export function CycleCalendar({ cycleLength, onDateSelect }: CycleCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<'month' | 'cycle'>('month');

  // Generate cycle data (in real app, this would come from user data)
  const cycleData = useMemo(() => {
    const days: CycleDay[] = [];
    const today = new Date();
    
    // Simulate a cycle starting 15 days ago
    const cycleStart = new Date(today);
    cycleStart.setDate(today.getDate() - 15);
    
    for (let i = 0; i < cycleLength; i++) {
      const date = new Date(cycleStart);
      date.setDate(cycleStart.getDate() + i);
      
      let phase: CycleDay['phase'] = 'unknown';
      
      if (i < 5) {
        phase = 'menstrual';
      } else if (i < 10) {
        phase = 'follicular';
      } else if (i >= 12 && i <= 14) {
        phase = 'ovulatory';
      } else if (i < cycleLength - 3) {
        phase = 'luteal';
      } else {
        phase = 'premenstrual';
      }
      
      days.push({
        date,
        phase,
        symptoms: {
          cramps: phase === 'menstrual' ? Math.floor(Math.random() * 5) : 0,
          headaches: Math.random() > 0.7 ? Math.floor(Math.random() * 3) : 0,
          fatigue: Math.random() > 0.5 ? Math.floor(Math.random() * 3) : 0,
          mood: Math.random() > 0.6 ? Math.floor(Math.random() * 2) : 0,
        }
      });
    }
    
    return days;
  }, [cycleLength]);

  const getPhaseColor = (phase: CycleDay['phase']) => {
    switch (phase) {
      case 'menstrual': return 'bg-rose-500 text-white';
      case 'follicular': return 'bg-teal-500 text-white';
      case 'ovulatory': return 'bg-blue-500 text-white';
      case 'luteal': return 'bg-purple-500 text-white';
      case 'premenstrual': return 'bg-orange-500 text-white';
      default: return 'bg-[var(--surface-2)] text-[var(--text-secondary)]';
    }
  };

  const getPhaseIcon = (phase: CycleDay['phase']) => {
    switch (phase) {
      case 'menstrual': return Droplets;
      case 'follicular': return Flower2;
      case 'ovulatory': return Sun;
      case 'luteal': return Moon;
      case 'premenstrual': return AlertCircle;
      default: return Calendar;
    }
  };

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderMonthView = () => {
    const daysInMonth = getDaysInMonth(currentDate);
    const firstDay = getFirstDayOfMonth(currentDate);
    const days = [];

    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10" />);
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const cycleDay = cycleData.find(d => 
        d.date.getDate() === day && 
        d.date.getMonth() === currentDate.getMonth() &&
        d.date.getFullYear() === currentDate.getFullYear()
      );

      const isToday = date.toDateString() === new Date().toDateString();
      const isSelected = selectedDate?.toDateString() === date.toDateString();

      days.push(
        <div
          key={day}
          onClick={() => {
            setSelectedDate(date);
            onDateSelect?.(date);
          }}
          className={`h-10 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
            isToday ? 'ring-2 ring-primary' : ''
          } ${isSelected ? 'bg-primary text-primary-foreground' : ''} ${
            cycleDay ? getPhaseColor(cycleDay.phase) : 'bg-[var(--surface-2)] text-[var(--text-secondary)] border border-[var(--border)]'
          }`}
        >
          <span className="text-sm font-medium">{day}</span>
        </div>
      );
    }

    return days;
  };

  const renderCycleView = () => {
    return cycleData.map((day, index) => {
      const Icon = getPhaseIcon(day.phase);
      const isToday = day.date.toDateString() === new Date().toDateString();
      const isSelected = selectedDate?.toDateString() === day.date.toDateString();

      return (
        <div
          key={index}
          onClick={() => {
            setSelectedDate(day.date);
            onDateSelect?.(day.date);
          }}
          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
            isToday ? 'ring-2 ring-primary' : ''
          } ${isSelected ? 'bg-primary text-primary-foreground' : ''} ${
            day.phase !== 'unknown' ? 'border-opacity-50' : 'border-[var(--border)]'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">Day {index + 1}</span>
            </div>
            <Badge variant="outline" className="text-xs">
              {day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </Badge>
          </div>
          
          <div className={`w-full h-2 rounded-full ${getPhaseColor(day.phase).replace('text-', 'bg-').replace('text-white', 'bg-white')}`} />
          
          {day.symptoms && (
            <div className="mt-2 flex gap-1">
              {day.symptoms.cramps > 0 && <Droplets className="w-3 h-3" />}
              {day.symptoms.headaches > 0 && <AlertCircle className="w-3 h-3" />}
              {day.symptoms.fatigue > 0 && <Moon className="w-3 h-3" />}
            </div>
          )}
        </div>
      );
    });
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Cycle Calendar
        </h3>
        <Select value={viewMode} onValueChange={(value: 'month' | 'cycle') => setViewMode(value)}>
          <SelectTrigger className="w-24">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Month</SelectItem>
            <SelectItem value="cycle">Cycle</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {viewMode === 'month' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <h4 className="font-medium">
              {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </h4>
            <Button variant="ghost" size="icon" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-xs font-medium text-muted-foreground p-2">
                {day}
              </div>
            ))}
            {renderMonthView()}
          </div>
        </div>
      )}

      {viewMode === 'cycle' && (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-2">
            {renderCycleView()}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 pt-4 border-t">
        <h4 className="text-sm font-medium mb-2">Phase Legend</h4>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-rose-500" />
            <span>Menstrual</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-teal-500" />
            <span>Follicular</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>Ovulatory</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-purple-500" />
            <span>Luteal</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded bg-orange-500" />
            <span>Premenstrual</span>
          </div>
        </div>
      </div>
    </Card>
  );
}

export default CycleCalendar;
