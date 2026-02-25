import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LogEntry {
  timestamp: string;
  agent?: string;
  action: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

export const LiveLog = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLive, setIsLive] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Connect to SSE endpoint - use environment variable for production
    const schedulerUrl = import.meta.env.VITE_SCHEDULER_URL || 'http://localhost:3001';
    const eventSource = new EventSource(`${schedulerUrl}/logs`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsLive(true);
    };

    eventSource.onerror = () => {
      setIsLive(false);
      // Auto-reconnect after delay
      setTimeout(() => {
        if (eventSource.readyState === EventSource.CLOSED) {
          setIsLive(true);
        }
      }, 3000);
    };

    eventSource.onmessage = (event) => {
      try {
        const newLog: LogEntry = JSON.parse(event.data);
        setLogs(prev => {
          const updated = [...prev, newLog];
          // Limit to 100 entries
          return updated.slice(-100);
        });
      } catch (e) {
        console.error('Failed to parse log:', e);
      }
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, []);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const getActionClass = (type: LogEntry['type']) => {
    switch (type) {
      case 'success':
        return 'text-[#00FF41]';
      case 'error':
        return 'text-red-500';
      case 'warning':
        return 'text-yellow-500';
      default:
        return 'text-[#00FF41]';
    }
  };

  return (
    <div className="log-terminal" ref={scrollRef}>
      {logs.length === 0 && (
        <div className="log-entry font-mono text-sm text-neutral-500">
          CONNECTING TO SCHEDULER...
        </div>
      )}
      <AnimatePresence mode="popLayout">
        {logs.map((log, index) => (
          <motion.div
            key={`${log.timestamp}-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="log-entry font-mono text-sm"
          >
            <span className="log-timestamp">[{log.timestamp}]</span>
            {log.agent && <span className="log-agent"> {log.agent}:</span>}
            <span className={getActionClass(log.type)}> {log.action}</span>
          </motion.div>
        ))}
      </AnimatePresence>
      {isLive && logs.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: [1, 0.5, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
          className="log-entry font-mono text-xs text-[#FF00F5] mt-2"
        >
          LIVE UPDATES
        </motion.div>
      )}
    </div>
  );
};
