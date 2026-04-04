import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
interface ContributionGridProps {
  data: number[][];
}
export function ContributionGrid({ data }: ContributionGridProps) {
  const getColor = (count: number): string => {
    if (count === 0) return '#111111';
    if (count <= 3) return '#333333';
    if (count <= 6) return '#666666';
    if (count <= 9) return '#999999';
    return '#ffffff';
  };
  const getHeight = (count: number): number => {
    return Math.min(count * 4, 40);
  };
  return (
    <div className="w-full overflow-x-auto pb-8">
      <div
        className="inline-block min-w-full"
        style={{
          perspective: '1200px',
          perspectiveOrigin: 'center center'
        }}>
        
        <motion.div
          initial={{
            opacity: 0,
            rotateX: 20
          }}
          animate={{
            opacity: 1,
            rotateX: 0
          }}
          transition={{
            duration: 0.8,
            delay: 0.2
          }}
          className="relative"
          style={{
            transformStyle: 'preserve-3d',
            transform: 'rotateX(60deg) rotateZ(-45deg)',
            transformOrigin: 'center center'
          }}>
          
          <div className="flex gap-1 p-8">
            {data.map((week, weekIndex) =>
            <div key={weekIndex} className="flex flex-col gap-1">
                {week.map((count, dayIndex) => {
                const height = getHeight(count);
                const color = getColor(count);
                const delay = (weekIndex * 7 + dayIndex) * 0.005;
                return (
                  <motion.div
                    key={`${weekIndex}-${dayIndex}`}
                    initial={{
                      opacity: 0,
                      scale: 0
                    }}
                    animate={{
                      opacity: 1,
                      scale: 1
                    }}
                    transition={{
                      duration: 0.3,
                      delay: delay,
                      ease: 'easeOut'
                    }}
                    className="relative group cursor-pointer"
                    style={{
                      width: '12px',
                      height: '12px',
                      transformStyle: 'preserve-3d'
                    }}>
                    
                      {/* Top face */}
                      <div
                      className="absolute inset-0 transition-all duration-200"
                      style={{
                        backgroundColor: color,
                        transform: `translateZ(${height}px)`,
                        border: '1px solid rgba(255, 255, 255, 0.1)'
                      }} />
                    

                      {/* Front face */}
                      <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: color,
                        filter: 'brightness(0.7)',
                        transform: `rotateX(-90deg) translateY(6px)`,
                        transformOrigin: 'bottom',
                        height: `${height}px`,
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }} />
                    

                      {/* Right face */}
                      <div
                      className="absolute inset-0"
                      style={{
                        backgroundColor: color,
                        filter: 'brightness(0.5)',
                        transform: `rotateY(90deg) translateX(6px)`,
                        transformOrigin: 'right',
                        height: `${height}px`,
                        border: '1px solid rgba(255, 255, 255, 0.05)'
                      }} />
                    

                      {/* Tooltip */}
                      <div
                      className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-white text-black text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50"
                      style={{
                        fontFamily: 'var(--font-mono)'
                      }}>
                      
                        {count} contributions
                      </div>
                    </motion.div>);

              })}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>);

}