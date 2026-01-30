import { useNavigate } from 'react-router-dom';
import { Clock, User, Target } from 'lucide-react';
import Card from '../ui/Card';
import { DifficultyBadge, CategoryBadge } from '../ui/Badge';
import BookmarkButton from './BookmarkButton';

function ScenarioCard({ scenario }) {
  const navigate = useNavigate();

  const handleClick = () => {
    navigate(`/scenario/${scenario.id}`);
  };

  return (
    <Card hover onClick={handleClick} className="h-full flex flex-col">
      <Card.Header>
        <div className="flex items-start justify-between gap-2">
          <Card.Title className="flex-1">{scenario.name}</Card.Title>
          <div className="flex items-center gap-2">
            <BookmarkButton scenarioId={scenario.id} size="small" />
            <DifficultyBadge difficulty={scenario.difficulty} />
          </div>
        </div>
        {scenario.category && (
          <div className="mt-2">
            <CategoryBadge category={scenario.category} />
          </div>
        )}
      </Card.Header>

      <Card.Content className="flex-1">
        <p className="text-sm text-gray-400 line-clamp-3 mb-4">
          {scenario.situation}
        </p>

        <div className="space-y-2">
          {scenario.customerName && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <User className="w-4 h-4" />
              <span>{scenario.customerName}</span>
            </div>
          )}
          {scenario.estimatedDuration && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock className="w-4 h-4" />
              <span>{scenario.estimatedDuration}</span>
            </div>
          )}
          {scenario.csrObjective && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Target className="w-4 h-4" />
              <span className="line-clamp-1">{scenario.csrObjective}</span>
            </div>
          )}
        </div>
      </Card.Content>

      <Card.Footer className="flex items-center justify-between">
        <span className="text-xs text-gray-500">
          {scenario.scoringFocus?.slice(0, 2).join(' • ')}
        </span>
        <span className="text-sm text-blue-400 font-medium">
          Start Training →
        </span>
      </Card.Footer>
    </Card>
  );
}

export default ScenarioCard;
