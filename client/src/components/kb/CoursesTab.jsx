import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp, BookOpen, Layers, Target } from 'lucide-react';

const DIFFICULTIES = ['easy', 'medium', 'hard'];

function emptyCourse() {
  return { name: '', description: '', category: 'custom', icon: '📚', modules: [] };
}
function emptyModule() {
  return { name: '', description: '', difficulty: 'medium', scenario_count: 10, scenarios: [] };
}
function emptyScenario() {
  return {
    base_situation: '',
    csr_objectives: [],
    scoring_focus: [],
    customer_goals: '',
    resolution_conditions: '',
    difficulty: 'medium'
  };
}

export default function CoursesTab({ courses, onChange }) {
  const [expandedCourses, setExpandedCourses] = useState({});
  const [expandedModules, setExpandedModules] = useState({});
  const [expandedScenarios, setExpandedScenarios] = useState({});

  const toggleCourse = (ci) => setExpandedCourses(prev => ({ ...prev, [ci]: !prev[ci] }));
  const toggleModule = (key) => setExpandedModules(prev => ({ ...prev, [key]: !prev[key] }));
  const toggleScenario = (key) => setExpandedScenarios(prev => ({ ...prev, [key]: !prev[key] }));

  const updateCourse = (ci, field, value) => {
    const updated = [...courses];
    updated[ci] = { ...updated[ci], [field]: value };
    onChange(updated);
  };

  const addCourse = () => {
    onChange([...courses, emptyCourse()]);
    setExpandedCourses(prev => ({ ...prev, [courses.length]: true }));
  };

  const removeCourse = (ci) => onChange(courses.filter((_, i) => i !== ci));

  const addModule = (ci) => {
    const updated = [...courses];
    updated[ci] = { ...updated[ci], modules: [...(updated[ci].modules || []), emptyModule()] };
    onChange(updated);
    const key = `${ci}-${updated[ci].modules.length - 1}`;
    setExpandedModules(prev => ({ ...prev, [key]: true }));
  };

  const updateModule = (ci, mi, field, value) => {
    const updated = [...courses];
    const modules = [...(updated[ci].modules || [])];
    modules[mi] = { ...modules[mi], [field]: value };
    updated[ci] = { ...updated[ci], modules };
    onChange(updated);
  };

  const removeModule = (ci, mi) => {
    const updated = [...courses];
    updated[ci] = { ...updated[ci], modules: (updated[ci].modules || []).filter((_, i) => i !== mi) };
    onChange(updated);
  };

  const addScenario = (ci, mi) => {
    const updated = [...courses];
    const modules = [...(updated[ci].modules || [])];
    modules[mi] = {
      ...modules[mi],
      scenarios: [...(modules[mi].scenarios || []), emptyScenario()]
    };
    updated[ci] = { ...updated[ci], modules };
    onChange(updated);
  };

  const updateScenario = (ci, mi, si, field, value) => {
    const updated = [...courses];
    const modules = [...(updated[ci].modules || [])];
    const scenarios = [...(modules[mi].scenarios || [])];
    scenarios[si] = { ...scenarios[si], [field]: value };
    modules[mi] = { ...modules[mi], scenarios };
    updated[ci] = { ...updated[ci], modules };
    onChange(updated);
  };

  const removeScenario = (ci, mi, si) => {
    const updated = [...courses];
    const modules = [...(updated[ci].modules || [])];
    modules[mi] = {
      ...modules[mi],
      scenarios: (modules[mi].scenarios || []).filter((_, i) => i !== si)
    };
    updated[ci] = { ...updated[ci], modules };
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      {courses.map((course, ci) => (
        <div key={ci} className="bg-gray-700/30 rounded-lg border border-gray-600/50">
          {/* Course header */}
          <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => toggleCourse(ci)}>
            <BookOpen className="w-5 h-5 text-purple-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-gray-100 font-medium truncate">
                {course.icon} {course.name || `Course ${ci + 1}`}
              </p>
              <p className="text-gray-500 text-xs">
                {course.modules?.length || 0} modules
              </p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); removeCourse(ci); }} className="text-gray-500 hover:text-red-400 p-1">
              <Trash2 className="w-4 h-4" />
            </button>
            {expandedCourses[ci] ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>

          {expandedCourses[ci] && (
            <div className="px-4 pb-4 space-y-4 border-t border-gray-600/50 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-400">Course Name</label>
                  <input
                    type="text"
                    value={course.name}
                    onChange={(e) => updateCourse(ci, 'name', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400">Category</label>
                  <input
                    type="text"
                    value={course.category || ''}
                    onChange={(e) => updateCourse(ci, 'category', e.target.value)}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400">Description</label>
                <textarea
                  value={course.description || ''}
                  onChange={(e) => updateCourse(ci, 'description', e.target.value)}
                  rows={2}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-gray-100 text-sm"
                />
              </div>

              {/* Modules */}
              <div className="space-y-2">
                <h4 className="text-xs text-gray-400 font-medium flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" /> Modules
                </h4>

                {(course.modules || []).map((mod, mi) => {
                  const mKey = `${ci}-${mi}`;
                  return (
                    <div key={mi} className="bg-gray-700/50 rounded-lg border border-gray-600/30">
                      <div className="flex items-center gap-2 p-3 cursor-pointer" onClick={() => toggleModule(mKey)}>
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-200 text-sm truncate">{mod.name || `Module ${mi + 1}`}</p>
                          <p className="text-gray-500 text-xs">
                            {mod.difficulty} · {mod.scenarios?.length || 0} scenarios
                          </p>
                        </div>
                        <button onClick={(e) => { e.stopPropagation(); removeModule(ci, mi); }} className="text-gray-500 hover:text-red-400 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        {expandedModules[mKey] ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                      </div>

                      {expandedModules[mKey] && (
                        <div className="px-3 pb-3 space-y-3 border-t border-gray-600/30 pt-3">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="text-xs text-gray-400">Name</label>
                              <input
                                type="text"
                                value={mod.name}
                                onChange={(e) => updateModule(ci, mi, 'name', e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-gray-100 text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-gray-400">Difficulty</label>
                              <select
                                value={mod.difficulty}
                                onChange={(e) => updateModule(ci, mi, 'difficulty', e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-gray-100 text-sm"
                              >
                                {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs text-gray-400">Scenario Count</label>
                              <input
                                type="number"
                                value={mod.scenario_count || 10}
                                onChange={(e) => updateModule(ci, mi, 'scenario_count', Number(e.target.value))}
                                className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-gray-100 text-sm"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs text-gray-400">Description</label>
                            <textarea
                              value={mod.description || ''}
                              onChange={(e) => updateModule(ci, mi, 'description', e.target.value)}
                              rows={2}
                              className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1.5 text-gray-100 text-sm"
                            />
                          </div>

                          {/* Scenarios */}
                          <div className="space-y-2">
                            <h5 className="text-xs text-gray-400 font-medium flex items-center gap-1">
                              <Target className="w-3 h-3" /> Scenario Templates
                            </h5>

                            {(mod.scenarios || []).map((sc, si) => {
                              const sKey = `${ci}-${mi}-${si}`;
                              return (
                                <div key={si} className="bg-gray-800/50 rounded border border-gray-600/20">
                                  <div className="flex items-center gap-2 p-2 cursor-pointer" onClick={() => toggleScenario(sKey)}>
                                    <p className="flex-1 text-gray-300 text-xs truncate">
                                      {sc.base_situation?.slice(0, 60) || `Scenario ${si + 1}`}
                                    </p>
                                    <button onClick={(e) => { e.stopPropagation(); removeScenario(ci, mi, si); }} className="text-gray-500 hover:text-red-400 p-0.5">
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                    {expandedScenarios[sKey] ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                                  </div>

                                  {expandedScenarios[sKey] && (
                                    <div className="px-2 pb-2 space-y-2 border-t border-gray-600/20 pt-2">
                                      <div>
                                        <label className="text-xs text-gray-400">Situation</label>
                                        <textarea
                                          value={sc.base_situation || ''}
                                          onChange={(e) => updateScenario(ci, mi, si, 'base_situation', e.target.value)}
                                          rows={2}
                                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-100 text-xs"
                                        />
                                      </div>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-xs text-gray-400">Customer Goals</label>
                                          <textarea
                                            value={sc.customer_goals || ''}
                                            onChange={(e) => updateScenario(ci, mi, si, 'customer_goals', e.target.value)}
                                            rows={2}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-100 text-xs"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-xs text-gray-400">Resolution Conditions</label>
                                          <textarea
                                            value={sc.resolution_conditions || ''}
                                            onChange={(e) => updateScenario(ci, mi, si, 'resolution_conditions', e.target.value)}
                                            rows={2}
                                            className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-100 text-xs"
                                          />
                                        </div>
                                      </div>
                                      <div>
                                        <label className="text-xs text-gray-400">Difficulty</label>
                                        <select
                                          value={sc.difficulty || 'medium'}
                                          onChange={(e) => updateScenario(ci, mi, si, 'difficulty', e.target.value)}
                                          className="w-full bg-gray-700 border border-gray-600 rounded px-2 py-1 text-gray-100 text-xs"
                                        >
                                          {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                                        </select>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}

                            <button
                              onClick={() => addScenario(ci, mi)}
                              className="w-full px-2 py-1.5 border border-dashed border-gray-600 rounded text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors text-xs flex items-center justify-center gap-1"
                            >
                              <Plus className="w-3 h-3" /> Add Scenario
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => addModule(ci)}
                  className="w-full px-3 py-2 border border-dashed border-gray-600 rounded-lg text-gray-500 hover:text-gray-300 hover:border-gray-500 transition-colors text-sm flex items-center justify-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Module
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <button
        onClick={addCourse}
        className="w-full px-4 py-3 border-2 border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="w-4 h-4" /> Add Course
      </button>
    </div>
  );
}
