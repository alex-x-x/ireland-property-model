import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, Info } from 'lucide-react';

interface InfoTooltipProps {
  title?: string;
  content: React.ReactNode;
  iconType?: 'help' | 'info';
  size?: 'sm' | 'md';
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
  children?: React.ReactNode;
}

export const InfoTooltip: React.FC<InfoTooltipProps> = ({
  title,
  content,
  iconType = 'help',
  size = 'sm',
  className = '',
  children,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);

  const updatePosition = () => {
    if (!triggerRef.current) return null;
    const rect = triggerRef.current.getBoundingClientRect();
    const tooltipWidth = 320;
    const tooltipEstimatedHeight = 120;
    const padding = 12;

    // Determine if placing above or below
    const spaceAbove = rect.top;
    const spaceBelow = window.innerHeight - rect.bottom;
    const placement: 'top' | 'bottom' = spaceAbove < tooltipEstimatedHeight && spaceBelow > spaceAbove ? 'bottom' : 'top';

    const top = placement === 'top' ? rect.top - 8 : rect.bottom + 8;
    // Center horizontally on trigger
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    // Clamp left within window boundaries
    left = Math.max(padding, Math.min(window.innerWidth - tooltipWidth - padding, left));

    const newCoords = { top, left, placement };
    setCoords(newCoords);
    return newCoords;
  };

  const handleOpen = () => {
    updatePosition();
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  useEffect(() => {
    if (isOpen) {
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('scroll', handleScrollOrResize, true);
      window.addEventListener('resize', handleScrollOrResize);
      return () => {
        window.removeEventListener('scroll', handleScrollOrResize, true);
        window.removeEventListener('resize', handleScrollOrResize);
      };
    }
  }, [isOpen]);

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

  return (
    <div
      ref={triggerRef}
      className={`inline-flex items-center align-middle ${className}`}
      onMouseEnter={handleOpen}
      onMouseLeave={handleClose}
      onClick={(e) => {
        e.stopPropagation();
        if (isOpen) {
          handleClose();
        } else {
          handleOpen();
        }
      }}
    >
      {children ? (
        children
      ) : (
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
      )}

      {isOpen && coords &&
        createPortal(
          <div
            ref={tooltipRef}
            className={`fixed z-[99999] w-72 sm:w-80 p-3 rounded-xl bg-slate-900/98 backdrop-blur-md border border-slate-700 shadow-2xl text-slate-200 text-xs font-normal leading-relaxed pointer-events-none ${
              coords.placement === 'top' ? '-translate-y-full' : ''
            }`}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              maxWidth: 'calc(100vw - 24px)',
            }}
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
          </div>,
          document.body
        )}
    </div>
  );
};
