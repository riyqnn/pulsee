import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface LogEntry {
  timestamp: string;
  agent: string;
  action: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

const mockLogs: LogEntry[] = [
  { timestamp: '14:32:01', agent: 'AGENT_01', action: 'Analyzing LPR inventory...', type: 'info' },
  { timestamp: '14:32:03', agent: 'AGENT_01', action: 'Price Match Found (95%)', type: 'success' },
  { timestamp: '14:32:05', agent: 'AGENT_01', action: 'Executing Buy...', type: 'info' },
  { timestamp: '14:32:07', agent: 'AGENT_02', action: 'Monitoring Dutch Auction decay', type: 'info' },
  { timestamp: '14:32:10', agent: 'AGENT_01', action: 'Ticket Purchased! Saved 2.5 SOL', type: 'success' },
  { timestamp: '14:32:15', agent: 'AGENT_03', action: 'Secondary market listing detected', type: 'warning' },
];

export const LiveLog = () => {
  const [logs] = useState<LogEntry[]>(mockLogs);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  };

  // Initial scroll
  scrollToBottom();

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
      <AnimatePresence mode="popLayout">
        {logs.map((log, index) => (
          <motion.div
            key={`${log.timestamp}-${index}`}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="log-entry font-mono text-sm"
          >
            <span className="log-timestamp">[{log.timestamp}]</span>{' '}
            <span className="log-agent">{log.agent}:</span>{' '}
            <span className={getActionClass(log.type)}>{log.action}</span>
          </motion.div>
        ))}
      </AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [1, 0.5, 1] }}
        transition={{ repeat: Infinity, duration: 1 }}
        className="log-entry font-mono text-sm text-[#FF00F5]"
      >
        ▊
      </motion.div>
    </div>
  );
};
