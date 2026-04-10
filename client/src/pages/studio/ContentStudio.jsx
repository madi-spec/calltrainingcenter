import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useStudioChat } from '../../hooks/useStudioChat';
import ChatPanel from '../../components/studio/ChatPanel';
import PreviewPanel from '../../components/studio/PreviewPanel';
import { ArrowLeft } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function ContentStudio() {
  const { id: sessionId } = useParams();
  const navigate = useNavigate();
  const { getToken } = useAuth();
  const { messages, setMessages, loading, coverageStats, fetchMessages, sendMessage, uploadFiles } = useStudioChat(sessionId);

  const [activeTab, setActiveTab] = useState('knowledge');
  const [versions, setVersions] = useState([]);
  const [activeVersion, setActiveVersion] = useState(null);
  const [versionData, setVersionData] = useState(null);
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [knowledgeStats, setKnowledgeStats] = useState(null);

  // Load initial data
  useEffect(() => {
    if (sessionId) {
      fetchMessages();
      fetchKnowledge();
      fetchVersions();
    }
  }, [sessionId]);

  // If knowledge exists but chat is empty, prompt the user
  useEffect(() => {
    if (messages.length === 0 && knowledgeStats?.total > 0 && !loading) {
      // Knowledge exists from a previous session — nudge the user
      const nudge = {
        id: 'system-nudge',
        role: 'assistant',
        content: `I already have ${knowledgeStats.total} knowledge items from your previous uploads. You can:\n\n• **Upload more documents** using the 📎 button\n• **Ask me questions** about what I know ("What products did you find?")\n• **Tell me to generate** a training program ("Generate my training program")\n\nWhat would you like to do?`,
        message_type: 'chat',
        created_at: new Date().toISOString()
      };
      setMessages([nudge]);
    }
  }, [knowledgeStats, messages.length, loading]);

  // Poll for new messages after upload (background ingestion produces messages)
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    const isProcessing = lastMsg?.message_type === 'upload' ||
      lastMsg?.content?.includes('analyzing them now');

    if (!isProcessing) return;

    const interval = setInterval(() => {
      fetchMessages();
      fetchKnowledge();
    }, 5000);

    return () => clearInterval(interval);
  }, [messages, fetchMessages]);

  // Reload data when messages change (new content generated)
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.message_type === 'generation') {
      fetchVersions();
      fetchKnowledge();
    }
  }, [messages]);

  // Load version details when active version changes
  useEffect(() => {
    if (activeVersion) fetchVersionDetails(activeVersion);
  }, [activeVersion]);

  async function fetchKnowledge() {
    try {
      const token = await getToken();
      const [itemsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/api/studio/sessions/${sessionId}/knowledge`, {
          headers: { Authorization: `Bearer ${token}` }
        }),
        fetch(`${API_URL}/api/studio/sessions/${sessionId}/knowledge/stats`, {
          headers: { Authorization: `Bearer ${token}` }
        })
      ]);
      if (itemsRes.ok) setKnowledgeItems(await itemsRes.json());
      if (statsRes.ok) setKnowledgeStats(await statsRes.json());
    } catch (error) {
      console.error('Failed to fetch knowledge:', error);
    }
  }

  async function fetchVersions() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/versions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setVersions(data);
        if (data.length > 0 && !activeVersion) {
          setActiveVersion(data[0].id);
        }
      }
    } catch (error) {
      console.error('Failed to fetch versions:', error);
    }
  }

  async function fetchVersionDetails(versionId) {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/versions/${versionId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) setVersionData(await res.json());
    } catch (error) {
      console.error('Failed to fetch version details:', error);
    }
  }

  async function handleGenerate() {
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/generate`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchVersions();
        fetchMessages();
      }
    } catch (error) {
      console.error('Generate error:', error);
    }
  }

  async function handlePublish() {
    if (!activeVersion) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/studio/sessions/${sessionId}/versions/${activeVersion}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchVersions();
    } catch (error) {
      console.error('Publish error:', error);
    }
  }

  function renderTabContent() {
    switch (activeTab) {
      case 'knowledge':
        return <KnowledgeGraphView stats={knowledgeStats} items={knowledgeItems} />;
      case 'scripts':
        return <ScriptsView scripts={versionData?.scripts || []} />;
      case 'scenarios':
        return <ScenariosView scenarios={versionData?.scenarios || []} />;
      case 'courses':
        return <CoursesView courses={versionData?.courses || []} />;
      default:
        return null;
    }
  }

  return (
    <div className="h-[calc(100vh-64px)] flex flex-col">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-700">
        <button onClick={() => navigate('/studio')} className="text-gray-400 hover:text-white">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-white font-medium">Content Studio</span>
        {knowledgeStats && (
          <span className="text-xs text-gray-400 ml-2">
            {knowledgeStats.total} knowledge items
          </span>
        )}
        <div className="ml-auto flex gap-2">
          {activeVersion && versionData?.version?.status === 'draft' && (
            <button
              onClick={handlePublish}
              className="px-3 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
            >
              Publish
            </button>
          )}
        </div>
      </div>

      {/* Main content: chat on top, preview below */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="h-[280px] shrink-0">
          <ChatPanel
            messages={messages}
            loading={loading}
            onSendMessage={sendMessage}
            onUploadFiles={uploadFiles}
          />
        </div>
        <PreviewPanel
          activeTab={activeTab}
          onTabChange={setActiveTab}
          versions={versions}
          activeVersion={activeVersion}
          onVersionChange={setActiveVersion}
        >
          {renderTabContent()}
        </PreviewPanel>
      </div>
    </div>
  );
}

// ============================================================
// Inline tab content components (will extract to files if they grow large)
// ============================================================

function KnowledgeGraphView({ stats, items }) {
  if (!stats) return <div className="text-gray-500 text-sm">Upload documents to build your knowledge graph</div>;

  const domainLabels = {
    products: { label: 'Products & Services', color: 'bg-blue-500' },
    objections: { label: 'Objections & Responses', color: 'bg-red-500' },
    processes: { label: 'Processes & Policies', color: 'bg-green-500' },
    sales_playbook: { label: 'Sales Playbook', color: 'bg-yellow-500' },
    competitive_intel: { label: 'Competitive Intel', color: 'bg-purple-500' },
    tribal_knowledge: { label: 'Tribal Knowledge', color: 'bg-orange-500' },
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(stats.byDomain || stats.domains || {}).map(([domain, data]) => {
          const config = domainLabels[domain] || { label: domain, color: 'bg-gray-500' };
          return (
            <div key={domain} className="bg-gray-800 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2 h-2 rounded-full ${config.color}`} />
                <span className="text-xs text-gray-300 font-medium">{config.label}</span>
              </div>
              <div className="text-2xl font-bold text-white">{data.count}</div>
              <div className="text-xs text-gray-500">{data.verified} verified</div>
            </div>
          );
        })}
      </div>

      {stats.validationIssues?.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
          <div className="text-xs font-medium text-yellow-400 mb-2">Validation Issues</div>
          {stats.validationIssues.slice(0, 5).map((issue, i) => (
            <div key={i} className="text-xs text-yellow-300/80 mb-1">• {issue.message}</div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        {(items || []).slice(0, 20).map(item => (
          <div key={item.id} className="bg-gray-800/50 rounded-lg p-3 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="text-white font-medium">{item.title}</span>
              <span className="text-gray-500">{item.domain}/{item.item_type}</span>
            </div>
            {item.document?.filename && (
              <span className="text-gray-500">📄 {item.document.filename}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function ScriptsView({ scripts }) {
  if (!scripts.length) return <div className="text-gray-500 text-sm">No scripts generated yet</div>;

  const typeLabels = { talk_track: 'Talk Track', reference_card: 'Reference Card', role_play: 'Role-Play' };
  const typeColors = { talk_track: 'border-orange-500', reference_card: 'border-blue-500', role_play: 'border-purple-500' };

  return (
    <div className="space-y-3">
      {scripts.map(script => (
        <div key={script.id} className={`bg-gray-800 rounded-lg p-4 border-l-[3px] ${typeColors[script.script_type] || 'border-gray-500'}`}>
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="text-sm font-medium text-white">{script.title}</div>
              <div className="text-xs text-gray-400">
                {typeLabels[script.script_type]} · {script.difficulty} · {script.category}
              </div>
            </div>
            {script.quality_score != null && (
              <span className={`text-xs px-2 py-0.5 rounded ${
                script.quality_score >= 80 ? 'bg-green-500/10 text-green-400' :
                script.quality_score >= 60 ? 'bg-yellow-500/10 text-yellow-400' :
                'bg-red-500/10 text-red-400'
              }`}>
                {Math.round(script.quality_score)}
              </span>
            )}
          </div>
          <pre className="text-xs text-gray-300 bg-gray-900 rounded p-3 overflow-x-auto whitespace-pre-wrap max-h-48">
            {typeof script.content === 'string' ? script.content : JSON.stringify(script.content, null, 2)}
          </pre>
        </div>
      ))}
    </div>
  );
}

function ScenariosView({ scenarios }) {
  if (!scenarios.length) return <div className="text-gray-500 text-sm">No scenarios generated yet</div>;

  return (
    <div className="space-y-3">
      {scenarios.map(scenario => (
        <div key={scenario.id} className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm font-medium text-white mb-1">{scenario.name}</div>
          <div className="text-xs text-gray-400 mb-2">
            {scenario.difficulty} · {scenario.module?.name}
          </div>
          <div className="text-xs text-gray-300 mb-3">{scenario.base_situation}</div>
          {scenario.scoring_rubric && (
            <div className="bg-gray-900 rounded p-2">
              <div className="text-xs text-gray-500 mb-1">Scoring Rubric</div>
              {(Array.isArray(scenario.scoring_rubric) ? scenario.scoring_rubric : []).map((r, i) => (
                <div key={i} className="text-xs text-gray-400">• {r.behavior} ({r.weight}pts)</div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CoursesView({ courses }) {
  if (!courses.length) return <div className="text-gray-500 text-sm">No courses generated yet</div>;

  return (
    <div className="space-y-4">
      {courses.map(course => (
        <div key={course.id} className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm font-medium text-white mb-1">{course.name}</div>
          <div className="text-xs text-gray-400 mb-3">{course.description}</div>
          <div className="space-y-2">
            {(course.modules || []).map(mod => (
              <div key={mod.id} className="bg-gray-900 rounded p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-white">{mod.name}</span>
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    mod.difficulty === 'easy' ? 'bg-green-500/10 text-green-400' :
                    mod.difficulty === 'medium' ? 'bg-yellow-500/10 text-yellow-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {mod.difficulty}
                  </span>
                </div>
                <div className="text-xs text-gray-400">{mod.description}</div>
                {mod.learning_objectives && (
                  <div className="mt-2 text-xs text-gray-500">
                    {(Array.isArray(mod.learning_objectives) ? mod.learning_objectives : []).map((obj, i) => (
                      <div key={i}>• {obj}</div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
