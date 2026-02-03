import { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  GitBranch,
  CheckCircle2,
  Circle,
  TrendingUp,
  TrendingDown,
  Minus,
  RotateCcw
} from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';

/**
 * DecisionTreeVisualization Component
 * Shows the decision tree path taken through the scenario
 */
function DecisionTreeVisualization({
  branchingPoints,
  pathTaken,
  pathScore,
  pathQuality,
  onReplay
}) {
  // Build the tree structure with path taken highlighted
  const treeData = useMemo(() => {
    if (!branchingPoints?.nodes) return null;

    const pathMap = new Map(pathTaken.map(p => [p.nodeId, p.choiceId]));

    return branchingPoints.nodes.map(node => ({
      ...node,
      selectedChoice: pathMap.get(node.id),
      wasTaken: pathMap.has(node.id)
    }));
  }, [branchingPoints, pathTaken]);

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'optimal':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'acceptable':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'poor':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getQualityIcon = (quality) => {
    switch (quality) {
      case 'optimal':
        return <TrendingUp className="w-5 h-5" />;
      case 'acceptable':
        return <Minus className="w-5 h-5" />;
      case 'poor':
        return <TrendingDown className="w-5 h-5" />;
      default:
        return <Circle className="w-5 h-5" />;
    }
  };

  const getScorePercentage = (score) => {
    return Math.round(score * 100);
  };

  if (!treeData || treeData.length === 0) {
    return null;
  }

  return (
    <Card className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 pb-4 border-b border-gray-200">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
            <GitBranch className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              Your Decision Path
            </h3>
            <p className="text-gray-600">
              Review the choices you made during this scenario
            </p>
          </div>
        </div>

        {onReplay && (
          <Button
            onClick={onReplay}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Try Different Path
          </Button>
        )}
      </div>

      {/* Overall Path Score */}
      {pathScore !== undefined && (
        <div className={`
          flex items-center justify-between p-4 rounded-lg border-2 mb-6
          ${getQualityColor(pathQuality)}
        `}>
          <div className="flex items-center gap-3">
            {getQualityIcon(pathQuality)}
            <div>
              <p className="font-bold text-lg">
                {pathQuality === 'optimal' && 'Optimal Path'}
                {pathQuality === 'acceptable' && 'Acceptable Path'}
                {pathQuality === 'poor' && 'Needs Improvement'}
              </p>
              <p className="text-sm opacity-90">
                Path quality score: {getScorePercentage(pathScore)}%
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">
              {getScorePercentage(pathScore)}%
            </div>
            <div className="text-xs opacity-75">
              {pathTaken.length} decision{pathTaken.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      )}

      {/* Decision Tree */}
      <div className="space-y-6">
        {treeData.map((node, nodeIndex) => {
          const takenChoice = node.choices?.find(c => c.id === node.selectedChoice);
          const wasTaken = node.wasTaken;

          return (
            <motion.div
              key={node.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: nodeIndex * 0.1 }}
              className={`
                relative pl-8 pb-6 border-l-2
                ${wasTaken ? 'border-blue-500' : 'border-gray-200'}
              `}
            >
              {/* Node Indicator */}
              <div className="absolute left-0 top-0 -translate-x-1/2">
                {wasTaken ? (
                  <CheckCircle2 className="w-6 h-6 text-blue-500 bg-white" />
                ) : (
                  <Circle className="w-6 h-6 text-gray-300 bg-white" />
                )}
              </div>

              {/* Node Content */}
              <div className={`
                ${wasTaken ? '' : 'opacity-50'}
              `}>
                <h4 className="font-bold text-gray-900 mb-2">
                  Decision Point {nodeIndex + 1}
                </h4>
                <p className="text-gray-600 mb-4">
                  {node.description}
                </p>

                {/* Choices */}
                <div className="space-y-2">
                  {node.choices?.map((choice, choiceIndex) => {
                    const isSelected = choice.id === node.selectedChoice;
                    const outcomeColor = choice.outcome_type === 'optimal'
                      ? 'border-green-500 bg-green-50'
                      : choice.outcome_type === 'acceptable'
                      ? 'border-yellow-500 bg-yellow-50'
                      : choice.outcome_type === 'poor'
                      ? 'border-red-500 bg-red-50'
                      : 'border-gray-300 bg-gray-50';

                    return (
                      <div
                        key={choice.id}
                        className={`
                          p-3 rounded-lg border transition-all
                          ${isSelected
                            ? `${outcomeColor} border-2 shadow-md`
                            : 'border-gray-200 bg-gray-50'
                          }
                          ${!wasTaken ? 'opacity-50' : ''}
                        `}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`
                            flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                            ${isSelected
                              ? 'bg-white text-blue-600'
                              : 'bg-gray-200 text-gray-600'
                            }
                          `}>
                            {choiceIndex + 1}
                          </div>

                          <div className="flex-1">
                            <p className={`
                              ${isSelected ? 'font-medium text-gray-900' : 'text-gray-600'}
                            `}>
                              {choice.text}
                            </p>

                            {isSelected && wasTaken && (
                              <div className="mt-2 flex items-center gap-2 text-sm">
                                {choice.outcome_type === 'optimal' && (
                                  <>
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                    <span className="text-green-700 font-medium">
                                      Optimal choice ({Math.round(choice.score_modifier * 100)}%)
                                    </span>
                                  </>
                                )}
                                {choice.outcome_type === 'acceptable' && (
                                  <>
                                    <Minus className="w-4 h-4 text-yellow-600" />
                                    <span className="text-yellow-700 font-medium">
                                      Acceptable ({Math.round(choice.score_modifier * 100)}%)
                                    </span>
                                  </>
                                )}
                                {choice.outcome_type === 'poor' && (
                                  <>
                                    <TrendingDown className="w-4 h-4 text-red-600" />
                                    <span className="text-red-700 font-medium">
                                      Needs improvement ({Math.round(choice.score_modifier * 100)}%)
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>

                          {isSelected && wasTaken && (
                            <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Connection Line to Next Node */}
              {nodeIndex < treeData.length - 1 && wasTaken && (
                <div className="absolute left-0 bottom-0 h-6 border-l-2 border-blue-500" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Path Analysis */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h4 className="font-bold text-gray-900 mb-3">Path Analysis</h4>
        <div className="space-y-2">
          {pathQuality === 'optimal' && (
            <div className="flex items-start gap-2 text-green-700">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Excellent work! You consistently chose the best approaches, demonstrating
                strong sales and customer service skills. This is the optimal path through
                this scenario.
              </p>
            </div>
          )}
          {pathQuality === 'acceptable' && (
            <div className="flex items-start gap-2 text-yellow-700">
              <Minus className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                Good effort! Some of your choices could be improved. Consider trying
                different approaches to see how they affect the outcome. Focus on
                building value before discussing price.
              </p>
            </div>
          )}
          {pathQuality === 'poor' && (
            <div className="flex items-start gap-2 text-red-700">
              <TrendingDown className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p className="text-sm">
                This path needs improvement. Several of your choices weren't optimal
                for this situation. Try replaying the scenario with different approaches,
                focusing on empathy, value-building, and professional communication.
              </p>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default DecisionTreeVisualization;
