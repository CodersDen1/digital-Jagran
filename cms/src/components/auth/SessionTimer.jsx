import React, { useState, useEffect } from 'react';
import { Clock, LogOut } from 'lucide-react';
import useAuthStore from '../../store/authStore';

function SessionTimer() {
  const { getSessionTimeRemaining, logout } = useAuthStore();
  const [timeRemaining, setTimeRemaining] = useState(getSessionTimeRemaining());

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getSessionTimeRemaining();
      setTimeRemaining(remaining);

      if (remaining <= 0) {
        logout();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [getSessionTimeRemaining, logout]);

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const isWarning = timeRemaining < 15 * 60 * 1000; // Less than 15 minutes

  return (
    <div className="flex items-center gap-4">
      <div
        className={`flex items-center gap-2 text-sm ${
          isWarning ? 'text-red-600' : 'text-gray-600'
        }`}
      >
        <Clock className="w-4 h-4" />
        <span className="font-mono">{formatTime(timeRemaining)}</span>
      </div>
      <button
        onClick={logout}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        title="Logout"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">Logout</span>
      </button>
    </div>
  );
}

export default SessionTimer;
