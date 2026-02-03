import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * useBranchingLogic Hook
 * Manages branching decision tree logic during training sessions
 */
function useBranchingLogic(sessionId, branchingPoints, transcript) {
  const { authFetch } = useAuth();
  const [currentNode, setCurrentNode] = useState(null);
  const [isShowingChoice, setIsShowingChoice] = useState(false);
  const [pathTaken, setPathTaken] = useState([]);
  const [triggeredNodes, setTriggeredNodes] = useState(new Set());
  const lastTranscriptLength = useRef(0);

  // Monitor transcript for trigger keywords
  useEffect(() => {
    if (!branchingPoints?.nodes || !transcript || transcript.length === 0) {
      return;
    }

    // Only process new transcript content
    if (transcript.length <= lastTranscriptLength.current) {
      return;
    }

    lastTranscriptLength.current = transcript.length;

    // Get the latest transcript text
    const latestText = typeof transcript === 'string'
      ? transcript
      : Array.isArray(transcript)
      ? transcript.map(t => t.content || t.text || '').join(' ')
      : '';

    if (!latestText) return;

    // Check each node for trigger matches
    for (const node of branchingPoints.nodes) {
      // Skip if already triggered
      if (triggeredNodes.has(node.id)) {
        continue;
      }

      // Check trigger based on type
      const shouldTrigger = checkTrigger(node, latestText);

      if (shouldTrigger) {
        console.log('[Branching] Trigger matched for node:', node.id);
        setTriggeredNodes(prev => new Set([...prev, node.id]));
        setCurrentNode(node);
        setIsShowingChoice(true);
        break; // Only show one choice at a time
      }
    }
  }, [transcript, branchingPoints, triggeredNodes]);

  /**
   * Check if a node's trigger condition is met
   */
  const checkTrigger = (node, text) => {
    if (!node.trigger) return false;

    const lowerText = text.toLowerCase();
    const triggerType = node.trigger_type || 'keyword';

    switch (triggerType) {
      case 'keyword':
        // Split by pipe for OR conditions
        const keywords = node.trigger.toLowerCase().split('|');
        return keywords.some(keyword => lowerText.includes(keyword.trim()));

      case 'time':
        // Time-based triggers would need additional implementation
        return false;

      case 'score':
        // Score-based triggers would need current score tracking
        return false;

      default:
        return false;
    }
  };

  /**
   * Handle when user selects a choice
   */
  const handleChoiceSelected = useCallback(async (choice) => {
    if (!currentNode || !sessionId) {
      console.error('[Branching] Missing node or session ID');
      return;
    }

    try {
      // Record the choice in database
      await authFetch(`/api/training/session/${sessionId}/branch-choice`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          node_id: currentNode.id,
          choice_id: choice.id,
          choice_text: choice.text,
          score_modifier: choice.score_modifier || 1.0
        })
      });

      // Add to path taken
      const pathEntry = {
        nodeId: currentNode.id,
        choiceId: choice.id,
        choiceText: choice.text,
        scoreModifier: choice.score_modifier || 1.0,
        timestamp: new Date().toISOString()
      };

      setPathTaken(prev => [...prev, pathEntry]);

      // Hide the choice UI
      setIsShowingChoice(false);
      setCurrentNode(null);

      // Return AI context for this choice (to be used in prompt)
      return {
        aiContext: choice.ai_context,
        nextNode: choice.next_node
      };
    } catch (error) {
      console.error('[Branching] Error recording choice:', error);
      throw error;
    }
  }, [currentNode, sessionId, authFetch]);

  /**
   * Calculate path score
   */
  const calculatePathScore = useCallback(() => {
    if (pathTaken.length === 0) return null;

    const totalScore = pathTaken.reduce((sum, path) => {
      return sum + (path.scoreModifier || 1.0);
    }, 0);

    return totalScore / pathTaken.length;
  }, [pathTaken]);

  /**
   * Get path quality based on score
   */
  const getPathQuality = useCallback(() => {
    const score = calculatePathScore();
    if (score === null) return null;

    if (score >= 0.9) return 'optimal';
    if (score >= 0.7) return 'acceptable';
    return 'poor';
  }, [calculatePathScore]);

  /**
   * Save final path score to session
   */
  const saveFinalPathScore = useCallback(async () => {
    if (!sessionId || pathTaken.length === 0) return;

    try {
      const pathScore = calculatePathScore();
      const pathQuality = getPathQuality();

      await authFetch(`/api/training/session/${sessionId}/branch-path`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path_score: pathScore,
          path_quality: pathQuality
        })
      });

      console.log('[Branching] Path score saved:', pathScore, pathQuality);
    } catch (error) {
      console.error('[Branching] Error saving path score:', error);
    }
  }, [sessionId, pathTaken, calculatePathScore, getPathQuality, authFetch]);

  /**
   * Get path taken for visualization
   */
  const getPathForVisualization = useCallback(() => {
    return {
      path: pathTaken,
      score: calculatePathScore(),
      quality: getPathQuality()
    };
  }, [pathTaken, calculatePathScore, getPathQuality]);

  /**
   * Reset branching state (for replay)
   */
  const reset = useCallback(() => {
    setCurrentNode(null);
    setIsShowingChoice(false);
    setPathTaken([]);
    setTriggeredNodes(new Set());
    lastTranscriptLength.current = 0;
  }, []);

  return {
    // State
    currentNode,
    isShowingChoice,
    pathTaken,
    hasBranching: branchingPoints?.nodes?.length > 0,

    // Actions
    handleChoiceSelected,
    saveFinalPathScore,
    getPathForVisualization,
    reset,

    // Computed values
    pathScore: calculatePathScore(),
    pathQuality: getPathQuality()
  };
}

export default useBranchingLogic;
