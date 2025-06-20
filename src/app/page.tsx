'use client';

import { useAgent } from '../contexts/AgentContext';
import QuizAgent from '../components/QuizAgent';
import DynamicQuizAgent from '../components/DynamicQuizAgent';
import TutoringAgent from '../components/TutoringAgent';
import SuperAgent from '../components/SuperAgent';
import { useState } from 'react';

// Sample diagnostic questions
const diagnosticQuestions = [
  // Basic
  { id: 1, text: 'What is a variable in programming?', options: ['A value', 'A container for data', 'A function', 'A loop'], answer: 1, skill: 'basic' },
  { id: 2, text: 'Which of these is a valid Python variable name?', options: ['2value', 'value_2', 'value-2', 'value 2'], answer: 1, skill: 'basic' },
  { id: 3, text: 'What does "if" do in code?', options: ['Repeats code', 'Stores data', 'Makes a decision', 'Defines a function'], answer: 2, skill: 'basic' },
  // Intermediate
  { id: 4, text: 'What is the output of 2 ** 3 in Python?', options: ['6', '8', '9', '5'], answer: 1, skill: 'intermediate' },
  { id: 5, text: 'Which data structure uses key-value pairs?', options: ['List', 'Tuple', 'Dictionary', 'Set'], answer: 2, skill: 'intermediate' },
  { id: 6, text: 'What is the time complexity of binary search?', options: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'], answer: 1, skill: 'intermediate' },
  // Advanced
  { id: 7, text: 'Which algorithm is used for finding shortest paths in a graph?', options: ['DFS', 'Dijkstra', 'Bubble Sort', 'Binary Search'], answer: 1, skill: 'advanced' },
  { id: 8, text: 'What does backpropagation do in neural networks?', options: ['Updates weights', 'Sorts data', 'Splits data', 'Encrypts data'], answer: 0, skill: 'advanced' },
  { id: 9, text: 'Which is a non-linear data structure?', options: ['Array', 'Linked List', 'Stack', 'Tree'], answer: 3, skill: 'advanced' },
  // More questions for each skill level
  { id: 10, text: 'Which of these is a loop structure?', options: ['if', 'for', 'def', 'try'], answer: 1, skill: 'basic' },
  { id: 11, text: 'What is the result of len([1,2,3])?', options: ['2', '3', '1', '0'], answer: 1, skill: 'basic' },
  { id: 12, text: 'Which is used to handle exceptions in Python?', options: ['try-except', 'for', 'while', 'def'], answer: 0, skill: 'intermediate' },
  { id: 13, text: 'Which ML model is best for classification?', options: ['Linear Regression', 'Decision Tree', 'K-Means', 'PCA'], answer: 1, skill: 'advanced' },
  { id: 14, text: 'What is the main purpose of normalization in data preprocessing?', options: ['Reduce overfitting', 'Speed up training', 'Scale features', 'Remove outliers'], answer: 2, skill: 'intermediate' },
  { id: 15, text: 'Which activation function can output negative values?', options: ['ReLU', 'Sigmoid', 'Tanh', 'Softmax'], answer: 2, skill: 'advanced' },
];

function getNextQuestionIdx(currentIdx: number, answers: { [idx: number]: number }, skill: string): number {
  // Adaptive logic: if correct, go harder; if wrong, go easier or stay
  const currentQ = diagnosticQuestions[currentIdx];
  const correct = answers[currentIdx] === currentQ.answer;
  
  // Find next question that hasn't been answered yet
  if (currentQ.skill === 'basic') {
    if (correct) {
      // Try intermediate first, then basic if no intermediate available
      const nextIdx = diagnosticQuestions.findIndex((q, i) => q.skill === 'intermediate' && !answers.hasOwnProperty(i));
      if (nextIdx !== -1) return nextIdx;
      return diagnosticQuestions.findIndex((q, i) => q.skill === 'basic' && !answers.hasOwnProperty(i) && i !== currentIdx);
    } else {
      return diagnosticQuestions.findIndex((q, i) => q.skill === 'basic' && !answers.hasOwnProperty(i) && i !== currentIdx);
    }
  }
  if (currentQ.skill === 'intermediate') {
    if (correct) {
      // Try advanced first, then intermediate if no advanced available
      const nextIdx = diagnosticQuestions.findIndex((q, i) => q.skill === 'advanced' && !answers.hasOwnProperty(i));
      if (nextIdx !== -1) return nextIdx;
      return diagnosticQuestions.findIndex((q, i) => q.skill === 'intermediate' && !answers.hasOwnProperty(i) && i !== currentIdx);
    } else {
      // Try basic first, then intermediate if no basic available
      const nextIdx = diagnosticQuestions.findIndex((q, i) => q.skill === 'basic' && !answers.hasOwnProperty(i));
      if (nextIdx !== -1) return nextIdx;
      return diagnosticQuestions.findIndex((q, i) => q.skill === 'intermediate' && !answers.hasOwnProperty(i) && i !== currentIdx);
    }
  }
  if (currentQ.skill === 'advanced') {
    if (correct) {
      return diagnosticQuestions.findIndex((q, i) => q.skill === 'advanced' && !answers.hasOwnProperty(i) && i !== currentIdx);
    } else {
      // Try intermediate first, then advanced if no intermediate available
      const nextIdx = diagnosticQuestions.findIndex((q, i) => q.skill === 'intermediate' && !answers.hasOwnProperty(i));
      if (nextIdx !== -1) return nextIdx;
      return diagnosticQuestions.findIndex((q, i) => q.skill === 'advanced' && !answers.hasOwnProperty(i) && i !== currentIdx);
    }
  }
  return -1;
}

export default function Home() {
  const { syllabus, quizzes, state, loading, advanceLesson } = useAgent();
  const [quizPassed, setQuizPassed] = useState(false);
  const [currentModule, setCurrentModule] = useState(1);
  const [tab, setTab] = useState<'overview' | 'lesson' | 'tutor' | 'super' | 'diagnostic'>('lesson');
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [expandedModule, setExpandedModule] = useState<number | null>(null);
  const [diagStarted, setDiagStarted] = useState(false);
  const [diagCurrentIdx, setDiagCurrentIdx] = useState(0);
  const [diagAnswers, setDiagAnswers] = useState<{ [idx: number]: number }>({});
  const [diagDone, setDiagDone] = useState(false);

  // Progress calculation
  const completedCount = state.completedLessons.length;
  const totalCount = syllabus.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Helper for status
  function getLessonStatus(lesson: any) {
    if (state.completedLessons.includes(lesson.id)) return 'completed';
    if (lesson.id === state.currentLesson) return 'current';
    if (lesson.id > state.currentLesson) return 'locked';
    return 'upcoming';
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  const lesson = syllabus.find((l: any) => l.id === state.currentLesson);
  const moduleQuizzes = quizzes.filter((q: any) => q.lessonId === state.currentLesson && q.moduleId === currentModule);
  const blockAssessment = quizzes.find((q: any) => q.lessonId === state.currentLesson && !q.moduleId);

  if (!lesson || !moduleQuizzes.length) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-white">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-4xl font-bold text-indigo-600 mb-4">🎉 Congratulations!</h1>
          <p className="text-gray-600 text-lg">You've completed all lessons!</p>
        </div>
      </div>
    );
  }

  const handleModuleComplete = () => {
    if (currentModule < 5) { // Assuming max 5 modules per lesson
      setCurrentModule(prev => prev + 1);
      setQuizPassed(false);
    } else {
      // Show block assessment
      setCurrentModule(0);
    }
  };

  const handleBlockComplete = () => {
    advanceLesson();
    setCurrentModule(1);
    setQuizPassed(false);
  };

  function handleDiagAnswer(optionIdx: number) {
    setDiagAnswers(prev => ({ ...prev, [diagCurrentIdx]: optionIdx }));
    // Count all answered questions towards the 15 total
    if (Object.keys(diagAnswers).length + 1 >= 15) {
      setDiagDone(true);
      return;
    }
    const nextIdx = getNextQuestionIdx(diagCurrentIdx, { ...diagAnswers, [diagCurrentIdx]: optionIdx }, diagnosticQuestions[diagCurrentIdx].skill);
    if (nextIdx === -1) setDiagDone(true);
    else setDiagCurrentIdx(nextIdx);
  }

  function getDiagLevel() {
    // Simple logic: more advanced correct = higher level
    let basic = 0, intermediate = 0, advanced = 0;
    Object.entries(diagAnswers).forEach(([idx, ans]) => {
      const q = diagnosticQuestions[Number(idx)];
      if (ans === q.answer) {
        if (q.skill === 'basic') basic++;
        if (q.skill === 'intermediate') intermediate++;
        if (q.skill === 'advanced') advanced++;
      }
    });
    if (advanced >= 4) return 'Advanced';
    if (intermediate >= 4) return 'Intermediate';
    if (basic >= 4) return 'Basic';
    return 'Beginner';
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">AI Tutor</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setTab('overview')}
              className={`px-4 py-2 rounded-lg ${
                tab === 'overview'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setTab('lesson')}
              className={`px-4 py-2 rounded-lg ${
                tab === 'lesson'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Lesson
            </button>
            <button
              onClick={() => setTab('tutor')}
              className={`px-4 py-2 rounded-lg ${
                tab === 'tutor'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Tutor
            </button>
            <button
              onClick={() => setTab('super')}
              className={`px-4 py-2 rounded-lg ${
                tab === 'super'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              Super
            </button>
            <button
              onClick={() => setTab('diagnostic')}
              className={`px-4 py-2 rounded-lg ${tab === 'diagnostic' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
            >
              Diagnostic Test
            </button>
          </div>
        </div>

        {tab === 'overview' ? (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Your Progress</h2>
            {/* Progress bar with circles */}
            <div className="flex items-center mb-4">
              {syllabus.map((lesson: any, idx: number) => {
                const status = getLessonStatus(lesson);
                return (
                  <div key={lesson.id} className="flex items-center">
                    <div
                      className={`w-8 h-8 flex items-center justify-center rounded-full border-2 text-sm font-bold
                        ${status === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                          status === 'current' ? 'bg-blue-500 border-blue-500 text-white animate-pulse' :
                          'bg-gray-200 border-gray-300 text-gray-400'}
                      `}
                      title={lesson.title}
                    >
                      {status === 'completed' ? <span>&#10003;</span> : lesson.id}
                    </div>
                    {idx < syllabus.length - 1 && (
                      <div className={`h-1 w-8 ${status === 'completed' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                    )}
                  </div>
                );
              })}
            </div>
            {/* Completion stats */}
            <div className="mb-6 text-gray-700 font-medium">
              {completedCount === totalCount
                ? '🎉 All lessons completed!'
                : `You have completed ${completedCount} of ${totalCount} lessons (${progressPercent}%)`}
            </div>
            {/* List of lessons with status and expandable modules for current lesson */}
            <ol className="space-y-4">
              {syllabus.map((lesson: any) => {
                const status = getLessonStatus(lesson);
                const isExpanded = expandedLesson === lesson.id;
                const isCurrentLesson = lesson.id === state.currentLesson;
                // Determine current module for this lesson
                const currentModuleIdx = isCurrentLesson ? currentModule - 1 : 0;
                return (
                  <li
                    key={lesson.id}
                    className={`flex flex-col p-4 rounded-lg border transition cursor-pointer
                      ${status === 'completed' ? 'border-green-300 bg-green-50 hover:bg-green-100' :
                        status === 'current' ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-300' :
                        'border-gray-200 bg-gray-50'}
                    `}
                    onClick={() => isCurrentLesson ? setExpandedLesson(isExpanded ? null : lesson.id) : undefined}
                  >
                    <div className="flex items-center">
                      <span className={`mr-4 w-6 h-6 flex items-center justify-center rounded-full border-2
                        ${status === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                          status === 'current' ? 'bg-blue-500 border-blue-500 text-white' :
                          'bg-gray-200 border-gray-300 text-gray-400'}
                      `}>
                        {status === 'completed' ? <span>&#10003;</span> : lesson.id}
                      </span>
                      <span className={`font-semibold text-lg ${status === 'current' ? 'text-blue-700' : status === 'completed' ? 'text-green-700' : 'text-gray-700'}`}>{lesson.title}</span>
                      {status === 'current' && <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Current</span>}
                      {status === 'completed' && <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Completed</span>}
                      {status === 'locked' && <span className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-500 rounded">Locked</span>}
                    </div>
                    {/* Expand to show modules if current lesson is expanded */}
                    {isExpanded && lesson.modules && (
                      <ol className="mt-4 ml-8 space-y-2">
                        {lesson.modules.map((mod: any, idx: number) => {
                          let modStatus = 'locked';
                          if (idx < currentModuleIdx) modStatus = 'completed';
                          else if (idx === currentModuleIdx) modStatus = 'current';
                          return (
                            <li
                              key={idx}
                              className={`flex items-center p-3 rounded-lg border transition
                                ${modStatus === 'completed' ? 'border-green-300 bg-green-50' :
                                  modStatus === 'current' ? 'border-blue-400 bg-blue-50 ring-2 ring-blue-300' :
                                  'border-gray-200 bg-gray-50'}
                                ${modStatus === 'current' ? 'cursor-pointer' : 'cursor-not-allowed'}
                              `}
                              onClick={() => modStatus === 'current' ? setExpandedModule(idx) : undefined}
                            >
                              <span className={`mr-3 w-5 h-5 flex items-center justify-center rounded-full border-2
                                ${modStatus === 'completed' ? 'bg-green-500 border-green-500 text-white' :
                                  modStatus === 'current' ? 'bg-blue-500 border-blue-500 text-white' :
                                  'bg-gray-200 border-gray-300 text-gray-400'}
                              `}>
                                {modStatus === 'completed' ? <span>&#10003;</span> : idx + 1}
                              </span>
                              <span className={`font-medium ${modStatus === 'current' ? 'text-blue-700' : modStatus === 'completed' ? 'text-green-700' : 'text-gray-700'}`}>{mod.title}</span>
                              {modStatus === 'current' && <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Current Module</span>}
                              {modStatus === 'completed' && <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded">Completed</span>}
                              {modStatus === 'locked' && <span className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-500 rounded">Locked</span>}
                            </li>
                          );
                        })}
                      </ol>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        ) : tab === 'lesson' ? (
          <>
            <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">Lesson {lesson.id}: {lesson.title}</h2>
              <div className="prose max-w-none text-gray-800 mb-6">
                <p className="text-lg leading-relaxed">{lesson.description}</p>
              </div>
              
              {/* Reading List */}
              {lesson.reading_list && lesson.reading_list.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">📚 Recommended Reading</h3>
                  <ul className="space-y-2">
                    {lesson.reading_list.map((book: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="text-indigo-600 mr-2 mt-1">📖</span>
                        <span className="text-gray-700">{book}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Module Overview Section */}
            {lesson.modules && lesson.modules[currentModule - 1] && (
              <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Module {currentModule}: {lesson.modules[currentModule - 1].title}</h3>
                
                {/* Module Topics */}
                <div className="mb-6">
                  <h4 className="text-lg font-medium text-gray-800 mb-3">What You'll Learn:</h4>
                  <ul className="space-y-2">
                    {lesson.modules[currentModule - 1].topics.map((topic: string, index: number) => (
                      <li key={index} className="flex items-start">
                        <span className="text-indigo-600 mr-2 mt-1">•</span>
                        <span className="text-gray-700">{topic}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Key Terms */}
                <div>
                  <h4 className="text-lg font-medium text-gray-800 mb-3">Key Terms:</h4>
                  <div className="flex flex-wrap gap-2">
                    {lesson.modules[currentModule - 1].keyTerms.map((term: string, index: number) => (
                      <span
                        key={index}
                        className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Additional Resources */}
                {lesson.modules[currentModule - 1].additionalResources && (
                  <div className="mt-6">
                    <h4 className="text-lg font-medium text-gray-800 mb-3">🔗 Additional Resources:</h4>
                    <div className="space-y-3">
                      {lesson.modules[currentModule - 1].additionalResources.map((resource: any, index: number) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                          <a
                            href={resource.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block group"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-indigo-700 group-hover:text-indigo-800 transition-colors">
                                  {resource.title}
                                </h5>
                                <p className="text-sm text-gray-600 mt-1">{resource.description}</p>
                              </div>
                              <span className="text-gray-400 group-hover:text-indigo-600 transition-colors ml-2">
                                ↗
                              </span>
                            </div>
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl shadow-lg p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                {currentModule === 0 ? 'Block Assessment' : `Module ${currentModule} Quiz`}
              </h2>
              {currentModule === 0 ? (
                <QuizAgent
                  lessonId={lesson.id}
                  moduleId={currentModule}
                  questions={[blockAssessment?.question]}
                  onPass={handleBlockComplete}
                />
              ) : (
                <DynamicQuizAgent
                  lessonId={lesson.id}
                  moduleId={currentModule}
                  moduleTitle={lesson.modules[currentModule - 1].title}
                  keyTerms={lesson.modules[currentModule - 1].keyTerms}
                  topics={lesson.modules[currentModule - 1].topics}
                  onPass={handleModuleComplete}
                />
              )}
            </div>
          </>
        ) : tab === 'tutor' ? (
          <TutoringAgent lesson={lesson} />
        ) : tab === 'super' ? (
          <SuperAgent lesson={lesson} />
        ) : tab === 'diagnostic' ? (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-8 max-w-xl mx-auto">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Diagnostic Test</h2>
            {!diagStarted ? (
              <div className="text-center">
                <p className="text-gray-800 mb-4 text-lg">Take this 15-question adaptive test to determine your entry level.</p>
                <button
                  className="px-6 py-3 rounded-lg font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors duration-200"
                  onClick={() => { setDiagStarted(true); setDiagCurrentIdx(0); setDiagAnswers({}); setDiagDone(false); }}
                >
                  Start Test
                </button>
              </div>
            ) : diagDone ? (
              <div>
                <div className="text-xl font-bold mb-4 text-gray-900">Your Entry Level: <span className="text-indigo-700">{getDiagLevel()}</span></div>
                <div className="mb-2 text-gray-800 font-medium">Your answers:</div>
                <ul className="list-disc ml-6 mb-4">
                  {Object.entries(diagAnswers).map(([idx, ans]) => {
                    const q = diagnosticQuestions[Number(idx)];
                    return (
                      <li key={q.id} className={ans === q.answer ? 'text-green-700 font-medium' : 'text-red-700 font-medium'}>
                        <span className="text-gray-900">{q.text}</span> — <b>{ans === q.answer ? 'Correct' : 'Incorrect'}</b>
                      </li>
                    );
                  })}
                </ul>
                <button
                  className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 font-medium"
                  onClick={() => { setDiagStarted(false); setDiagAnswers({}); setDiagDone(false); }}
                >
                  Retake Test
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4 font-medium text-gray-800">Question {Object.keys(diagAnswers).length + 1} of 15</div>
                <div className="mb-4 text-lg font-semibold text-gray-900">{diagnosticQuestions[diagCurrentIdx].text}</div>
                <div className="space-y-2 mb-6">
                  {diagnosticQuestions[diagCurrentIdx].options.map((opt, i) => (
                    <button
                      key={i}
                      className="block w-full text-left px-4 py-3 rounded-lg border border-gray-300 bg-gray-50 hover:bg-indigo-100 text-gray-900 font-medium"
                      onClick={() => handleDiagAnswer(i)}
                    >
                      {String.fromCharCode(65 + i)}. {opt}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </div>
    </main>
  );
}
