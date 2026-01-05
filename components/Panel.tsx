import React from 'react';

interface PanelProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

export const Panel: React.FC<PanelProps> = ({ children, title, className = '' }) => {
  return (
    <div className={`bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden ${className}`}>
      {title && (
        <div className="px-4 py-3 border-b border-gray-700 bg-gray-800/50 backdrop-blur-sm">
          <h3 className="text-sm font-semibold text-gray-100 uppercase tracking-wider">
            {title}
          </h3>
        </div>
      )}
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};