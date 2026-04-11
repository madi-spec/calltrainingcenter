import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, User, Target, Pencil, Trash2 } from 'lucide-react';
import Card from '../ui/Card';
import { DifficultyBadge, CategoryBadge } from '../ui/Badge';
import BookmarkButton from './BookmarkButton';

function ScenarioCard({ scenario, canEdit, onDelete }) {
  const navigate = useNavigate();
  const [confirming, setConfirming] = useState(false);

  const handleClick = () => {
    if (confirming) return;
    navigate(`/scenario/${scenario.id}`);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    navigate(`/builder/${scenario.id}`);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!confirming) {
      setConfirming(true);
      return;
    }
    if (onDelete) onDelete(scenario.id);
    setConfirming(false);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setConfirming(false);
  };

  const showActions = canEdit && scenario.isCustom;

  return (
    <Card hover onClick={handleClick} className="h-full flex flex-col">
      <Card.Header>
        <div className="flex items-start justify-between gap-2">
          <Card.Title className="flex-1">{scenario.name}</Card.Title>
          <div className="flex items-center gap-2">
            {showActions && (
              <button
                onClick={handleEdit}
                className="p-1.5 text-muted-foreground hover:text-primary-400 transition-colors rounded"
                title="Edit scenario"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <BookmarkButton scenarioId={scenario.id} size="small" />
            <DifficultyBadge difficulty={scenario.difficulty} />
          </div>
        </div>
        {scenario.category && (
          <div className="mt-2 flex items-center gap-2">
            <CategoryBadge category={scenario.category} />
            {scenario.isCustom && (
              <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">Custom</span>
            )}
          </div>
        )}
      </Card.Header>

      <Card.Content className="flex-1">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
          {scenario.situation}
        </p>

        <div className="space-y-2">
          {scenario.customerName && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="w-4 h-4" />
              <span>{scenario.customerName}</span>
            </div>
          )}
          {scenario.estimatedDuration && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{scenario.estimatedDuration}</span>
            </div>
          )}
          {scenario.csrObjective && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Target className="w-4 h-4" />
              <span className="line-clamp-1">{scenario.csrObjective}</span>
            </div>
          )}
        </div>
      </Card.Content>

      <Card.Footer className="flex items-center justify-between">
        {confirming ? (
          <div className="flex items-center gap-2 w-full">
            <span className="text-xs text-red-400">Delete this scenario?</span>
            <button
              onClick={handleDelete}
              className="text-xs px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={handleCancelDelete}
              className="text-xs px-2 py-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <>
            <span className="text-xs text-muted-foreground">
              {scenario.scoringFocus?.slice(0, 2).join(' • ')}
            </span>
            <div className="flex items-center gap-2">
              {showActions && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirming(true); }}
                  className="p-1 text-muted-foreground hover:text-red-400 transition-colors rounded"
                  title="Delete scenario"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <span className="text-sm text-muted-foreground group-hover:text-foreground font-medium transition-colors">
                Start →
              </span>
            </div>
          </>
        )}
      </Card.Footer>
    </Card>
  );
}

export default ScenarioCard;
