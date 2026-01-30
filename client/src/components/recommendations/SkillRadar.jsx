import { useMemo } from 'react';
import { motion } from 'framer-motion';

/**
 * Radar chart visualization for skill profiles
 */
export default function SkillRadar({
  skills = {},
  benchmarks = {},
  size = 300,
  showLabels = true,
  showBenchmarks = true,
  animated = true
}) {
  const skillCategories = [
    { key: 'empathy', label: 'Empathy', shortLabel: 'EMP' },
    { key: 'problem_solving', label: 'Problem Solving', shortLabel: 'PS' },
    { key: 'product_knowledge', label: 'Product Knowledge', shortLabel: 'PK' },
    { key: 'communication', label: 'Communication', shortLabel: 'COM' },
    { key: 'objection_handling', label: 'Objection Handling', shortLabel: 'OH' },
    { key: 'closing', label: 'Closing', shortLabel: 'CLS' },
    { key: 'time_management', label: 'Time Mgmt', shortLabel: 'TM' }
  ];

  const center = size / 2;
  const radius = (size / 2) - 40;
  const angleStep = (2 * Math.PI) / skillCategories.length;

  // Calculate points for a given set of values
  const calculatePoints = useMemo(() => {
    return (values) => {
      return skillCategories.map((skill, i) => {
        const angle = (i * angleStep) - (Math.PI / 2);
        const value = values[skill.key] || 0;
        const r = (value / 100) * radius;
        return {
          x: center + r * Math.cos(angle),
          y: center + r * Math.sin(angle)
        };
      });
    };
  }, [skillCategories, center, radius, angleStep]);

  // Create path string from points
  const createPath = (points) => {
    if (points.length === 0) return '';
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    return path + ' Z';
  };

  // Calculate label positions
  const labelPositions = useMemo(() => {
    return skillCategories.map((skill, i) => {
      const angle = (i * angleStep) - (Math.PI / 2);
      const r = radius + 25;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
        anchor: Math.abs(angle) < Math.PI / 2 ? 'start' :
                Math.abs(angle) > Math.PI / 2 ? 'end' : 'middle'
      };
    });
  }, [skillCategories, center, radius, angleStep]);

  const skillPoints = calculatePoints(skills);
  const skillPath = createPath(skillPoints);

  const benchmarkPoints = showBenchmarks && Object.keys(benchmarks).length > 0
    ? calculatePoints(Object.fromEntries(
        Object.entries(benchmarks).map(([k, v]) => [k, v.target || 70])
      ))
    : null;
  const benchmarkPath = benchmarkPoints ? createPath(benchmarkPoints) : null;

  // Grid circles
  const gridLevels = [20, 40, 60, 80, 100];

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="overflow-visible">
        {/* Background grid circles */}
        {gridLevels.map((level) => (
          <circle
            key={level}
            cx={center}
            cy={center}
            r={(level / 100) * radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="1"
            className="text-gray-700"
            strokeDasharray="3,3"
          />
        ))}

        {/* Axis lines */}
        {skillCategories.map((_, i) => {
          const angle = (i * angleStep) - (Math.PI / 2);
          return (
            <line
              key={i}
              x1={center}
              y1={center}
              x2={center + radius * Math.cos(angle)}
              y2={center + radius * Math.sin(angle)}
              stroke="currentColor"
              strokeWidth="1"
              className="text-gray-700"
            />
          );
        })}

        {/* Benchmark area */}
        {benchmarkPath && (
          <path
            d={benchmarkPath}
            fill="rgba(59, 130, 246, 0.1)"
            stroke="rgba(59, 130, 246, 0.3)"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
        )}

        {/* Skill area */}
        <motion.path
          d={skillPath}
          fill="rgba(139, 92, 246, 0.3)"
          stroke="rgb(139, 92, 246)"
          strokeWidth="2"
          initial={animated ? { opacity: 0, scale: 0.8 } : false}
          animate={animated ? { opacity: 1, scale: 1 } : false}
          transition={{ duration: 0.5 }}
          style={{ transformOrigin: `${center}px ${center}px` }}
        />

        {/* Skill points */}
        {skillPoints.map((point, i) => (
          <motion.circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="5"
            fill="rgb(139, 92, 246)"
            stroke="white"
            strokeWidth="2"
            initial={animated ? { opacity: 0, scale: 0 } : false}
            animate={animated ? { opacity: 1, scale: 1 } : false}
            transition={{ delay: i * 0.1, duration: 0.3 }}
          />
        ))}

        {/* Labels */}
        {showLabels && skillCategories.map((skill, i) => {
          const pos = labelPositions[i];
          const value = skills[skill.key];

          return (
            <g key={skill.key}>
              <text
                x={pos.x}
                y={pos.y - 8}
                textAnchor={pos.anchor}
                className="text-xs fill-gray-400"
              >
                {skill.shortLabel}
              </text>
              {value !== null && value !== undefined && (
                <text
                  x={pos.x}
                  y={pos.y + 8}
                  textAnchor={pos.anchor}
                  className={`text-sm font-medium ${
                    value >= 80 ? 'fill-green-400' :
                    value >= 60 ? 'fill-yellow-400' :
                    'fill-red-400'
                  }`}
                >
                  {value}%
                </text>
              )}
            </g>
          );
        })}

        {/* Center score */}
        {Object.values(skills).filter(Boolean).length > 0 && (
          <g>
            <circle
              cx={center}
              cy={center}
              r="25"
              fill="rgb(31, 41, 55)"
              stroke="rgb(55, 65, 81)"
              strokeWidth="2"
            />
            <text
              x={center}
              y={center + 5}
              textAnchor="middle"
              className="text-lg font-bold fill-white"
            >
              {Math.round(
                Object.values(skills).filter(Boolean).reduce((a, b) => a + b, 0) /
                Object.values(skills).filter(Boolean).length
              )}
            </text>
          </g>
        )}
      </svg>

      {/* Legend */}
      {showBenchmarks && benchmarkPath && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-2 bg-purple-500/50 rounded" />
            <span className="text-gray-400">Your Skills</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-0.5 bg-blue-500/50 border border-dashed border-blue-500/50" />
            <span className="text-gray-400">Target</span>
          </div>
        </div>
      )}
    </div>
  );
}
