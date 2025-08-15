import React, { useState } from 'react';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  isSameMonth, 
  isSameDay, 
  isToday, 
  addMonths, 
  subMonths,
  startOfDay,
  differenceInDays 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { useAppState } from '../hooks/useAppState';
import type { Shipment } from '../types';
import type { DateRange } from '../utils/analytics';
import { createDateRange, isDateInRange } from '../utils/analytics';

interface CalendarViewProps {
  selectedDateRange: DateRange | null;
  onDateRangeSelect: (range: DateRange | null) => void;
}

const CalendarView: React.FC<CalendarViewProps> = ({ selectedDateRange, onDateRangeSelect }) => {
  const { state } = useAppState();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dragStart, setDragStart] = useState<Date | null>(null);
  const [dragCurrent, setDragCurrent] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Get shipments for the calendar (excluding rejected)
  const getShipmentsForDate = (date: Date): Shipment[] => {
    return state.shipments.filter(shipment => 
      shipment.approvalStatus !== 'rejected' &&
      isSameDay(shipment.estimatedArrival, date)
    );
  };

  const getDateStatus = (date: Date) => {
    const shipments = getShipmentsForDate(date);
    if (shipments.length === 0) return null;

    const today = startOfDay(new Date());
    const targetDate = startOfDay(date);
    const daysDiff = differenceInDays(targetDate, today);
    
    if (daysDiff < 0) {
      return { status: 'arrived', bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-l-green-500' };
    } else if (daysDiff === 0) {
      return { status: 'today', bgColor: 'bg-blue-50', textColor: 'text-blue-700', borderColor: 'border-l-blue-500' };
    } else if (daysDiff <= 2) {
      return { status: 'soon', bgColor: 'bg-yellow-50', textColor: 'text-yellow-700', borderColor: 'border-l-yellow-500' };
    } else {
      return { status: 'future', bgColor: 'bg-gray-50', textColor: 'text-gray-700', borderColor: 'border-l-gray-400' };
    }
  };

  const truncateShipper = (shipper: string, maxLength: number = 10): string => {
    if (shipper.length <= maxLength) return shipper;
    return shipper.substring(0, maxLength - 3) + '...';
  };

  // Handle mouse events for drag selection
  const handleMouseDown = (date: Date) => {
    setDragStart(date);
    setDragCurrent(date);
    setIsDragging(true);
  };

  const handleMouseEnter = (date: Date) => {
    if (isDragging && dragStart) {
      setDragCurrent(date);
    }
  };

  const handleMouseUp = () => {
    if (isDragging && dragStart && dragCurrent) {
      const range = createDateRange(dragStart, dragCurrent);
      onDateRangeSelect(range);
    }
    setIsDragging(false);
    setDragStart(null);
    setDragCurrent(null);
  };

  // Handle click for single date selection
  const handleDateClick = (date: Date) => {
    if (!isDragging) {
      const range = createDateRange(date, date);
      onDateRangeSelect(range);
    }
  };

  // Determine if a date should be highlighted
  const getDateHighlight = (date: Date) => {
    // Current selection
    if (selectedDateRange && isDateInRange(date, selectedDateRange)) {
      return 'selected';
    }
    
    // Drag preview
    if (isDragging && dragStart && dragCurrent) {
      const previewRange = createDateRange(dragStart, dragCurrent);
      if (isDateInRange(date, previewRange)) {
        return 'dragging';
      }
    }
    
    return null;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentMonth(direction === 'prev' ? subMonths(currentMonth, 1) : addMonths(currentMonth, 1));
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const calendarDays = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* Calendar Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigateMonth('prev')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <h2 className="text-xl font-semibold text-gray-900">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        
        <button
          onClick={() => navigateMonth('next')}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Week Day Headers */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar Grid */}
      <div 
        className="grid grid-cols-7 gap-1 select-none"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {calendarDays.map(date => {
          const shipments = getShipmentsForDate(date);
          const dateStatus = getDateStatus(date);
          const isCurrentMonth = isSameMonth(date, currentMonth);
          const isTodayDate = isToday(date);
          const hasShipments = shipments.length > 0;
          const highlight = getDateHighlight(date);

          return (
            <button
              key={date.toISOString()}
              onClick={() => handleDateClick(date)}
              onMouseDown={() => handleMouseDown(date)}
              onMouseEnter={() => handleMouseEnter(date)}
              className={`
                relative h-20 p-2 text-left rounded-lg transition-colors border-l-4 flex flex-col
                ${isCurrentMonth ? 'text-gray-900' : 'text-gray-400'}
                ${highlight === 'selected'
                  ? 'bg-ocean-600 text-white border-l-ocean-600' 
                  : highlight === 'dragging'
                    ? 'bg-ocean-300 text-white border-l-ocean-500'
                    : isTodayDate 
                      ? 'bg-ocean-50 text-ocean-600 font-semibold border-l-ocean-600' 
                      : hasShipments && dateStatus
                        ? `${dateStatus.bgColor} ${dateStatus.borderColor} hover:opacity-80`
                        : 'hover:bg-gray-50 border-l-transparent'
                }
              `}
            >
              {/* Date Number */}
              <div className="flex items-center justify-between mb-1">
                <span className={`text-sm font-semibold ${
                  highlight ? 'text-white' : isCurrentMonth ? 'text-gray-900' : 'text-gray-400'
                }`}>
                  {format(date, 'd')}
                </span>
                
                {/* Today Indicator */}
                {isTodayDate && !highlight && (
                  <Clock className="w-4 h-4 text-ocean-600" />
                )}
              </div>
              
              {/* Shipper Names */}
              {hasShipments && (
                <div className="flex-1 overflow-hidden">
                  {shipments.slice(0, 2).map((shipment) => (
                    <div
                      key={shipment.id}
                      className={`text-xs mb-1 leading-tight ${
                        highlight 
                          ? 'text-white' 
                          : dateStatus
                            ? dateStatus.textColor
                            : 'text-gray-600'
                      }`}
                    >
                      {truncateShipper(shipment.shipper)}
                    </div>
                  ))}
                  {shipments.length > 2 && (
                    <div className={`text-xs font-medium ${
                      highlight ? 'text-white' : 'text-gray-500'
                    }`}>
                      +{shipments.length - 2} more
                    </div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-4 text-xs text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 border-l-4 border-l-green-500 bg-green-50 rounded-sm"></div>
          <span>Arrived</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 border-l-4 border-l-blue-500 bg-blue-50 rounded-sm"></div>
          <span>Arriving Today</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 border-l-4 border-l-yellow-500 bg-yellow-50 rounded-sm"></div>
          <span>Arriving Soon</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-3 border-l-4 border-l-gray-400 bg-gray-50 rounded-sm"></div>
          <span>Arriving Later</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-ocean-600" />
          <span>Today's Date</span>
        </div>
      </div>
    </div>
  );
};

export default CalendarView;