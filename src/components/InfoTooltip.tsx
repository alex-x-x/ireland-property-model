import React, { useState, useRef, useEffect } from 'react';
import { HelpCircle, Info } from 'lucide-react';

interface InfoTooltipProps {
  title?: string;
  content: React.ReactNode;
  iconType?: 'help' | 'info';
  size?: 'sm' | 'md';
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  content,
  iconType = 'help',
  size = 'sm',
  position = 'top',
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        tooltipRef.current &&
        !tooltipRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  const iconSizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex items-center align-middle group ${className}`}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
      onClick={(e) => {
        e.stopPropagation();
        setIsOpen((prev) => !prev);
      }}
    >
      <button
        type="button"
        className="p-0.5 rounded text-slate-400 hover:text-brand-300 focus:outline-none focus:text-brand-300 transition-colors"
        aria-label={title || 'More information'}
      >
        {iconType === 'help' ? (
          <HelpCircle className={iconSizeClass} />
        ) : (
          <Info className={iconSizeClass} />
        )}
      </button>

      {isOpen && (
        <div
          ref={tooltipRef}
          className={`absolute z-50 w-72 sm:w-80 p-3 rounded-xl bg-slate-900/98 backdrop-blur-md border border-slate-700/80 shadow-2xl text-slate-200 text-xs font-normal leading-relaxed pointer-events-none animate-in fade-in zoom-in-95 duration-150 ${positionClasses[position]}`}
          style={{ maxWidth: 'calc(100vw - 32px)' }}
        >
          {title && (
            <div className="font-bold text-white mb-1 pb-1 border-b border-slate-800 flex items-center justify-between">
              <span>{title}</span>
              <span className="text-[10px] text-brand-400 uppercase font-semibold">Tip</span>
            </div>
          )}
          <div className="text-slate-300 text-[11px] leading-normal space-y-1">
            {content}
          </div>
        </div>
      )}
    </div>
  );
};
