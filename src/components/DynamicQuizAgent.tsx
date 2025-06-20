'use client';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { useAgent } from '../contexts/AgentContext';
import { getUserProgress, upsertUserProgress } from '../lib/supabase';

interface QuizQuestion {
  question: string;
  type: 'mcq' | 'open_ended' | 'coding';
  options?: string[];
  correct_answer?: string;
  explanation: string;
}

interface DynamicQuizAgentProps {
  lessonId: number;
  moduleId: number;
  moduleTitle: string;
  keyTerms: string[];
  topics: string[];
  onPass: () => void;
}

export default function DynamicQuizAgent({ 
  lessonId, 
  moduleId, 
  moduleTitle, 
  keyTerms, 
  topics, 
  onPass 
}: DynamicQuizAgentProps) {
  const { getQuizProgress, setQuizProgress } = useAgent();
  const progressKey = `dynamic-quiz-${moduleId || lessonId}`;

  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState('');
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [correctAnswers, setCorrectAnswers] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [loadingQuestions, setLoadingQuestions] = useState(true);
  const [progressLoaded, setProgressLoaded] = useState(false);

  useEffect(() => {
    async function loadProgress() {
      try {
        const saved = await getUserProgress(moduleId, lessonId);
        if (saved) {
          setQuestions(saved.questions || []);
          setCurrentQuestionIndex(saved.currentQuestionIndex || 0);
          setAnswer(saved.answer || '');
          setSelectedOption(saved.selectedOption ?? null);
          setFeedback(saved.feedback || '');
          setCorrectAnswers(saved.correctAnswers || 0);
          setTotalAttempts(saved.totalAttempts || 0);
          setShowExplanation(saved.showExplanation || false);
          setLoadingQuestions(!saved.questions);
        }
      } catch (e) {
        const saved = getQuizProgress(progressKey) || {};
        setQuestions(saved.questions || []);
        setCurrentQuestionIndex(saved.currentQuestionIndex || 0);
        setAnswer(saved.answer || '');
        setSelectedOption(saved.selectedOption ?? null);
        setFeedback(saved.feedback || '');
        setCorrectAnswers(saved.correctAnswers || 0);
        setTotalAttempts(saved.totalAttempts || 0);
        setShowExplanation(saved.showExplanation || false);
        setLoadingQuestions(!saved.questions);
      } finally {
        setProgressLoaded(true);
      }
    }
    loadProgress();
  }, [moduleId, lessonId]);

  useEffect(() => {
    if (!progressLoaded) return;
    const progress = {
      questions,
      currentQuestionIndex,
      answer,
      selectedOption,
      feedback,
      correctAnswers,
      totalAttempts,
      showExplanation
    };
    setQuizProgress(progressKey, progress);
    upsertUserProgress(moduleId, lessonId, progress).catch(() => {});
  }, [questions, currentQuestionIndex, answer, selectedOption, feedback, correctAnswers, totalAttempts, showExplanation, progressLoaded]);

  const generateQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const response = await fetch('http://localhost:8000/generate-quiz-questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          module_id: moduleId,
          module_title: moduleTitle,
          key_terms: keyTerms,
          topics: topics
        }),
      });

      if (!response.ok) throw new Error('Failed to generate questions');
      
      const data = await response.json();
      setQuestions(data.questions);
    } catch (err) {
      setError('Failed to generate quiz questions. Please refresh the page.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const evaluateAnswer = async () => {
    if (!questions[currentQuestionIndex]) return;
    
    setIsLoading(true);
    setError('');
    setFeedback('');
    setShowExplanation(false);

    try {
      const currentQuestion = questions[currentQuestionIndex];
      let studentAnswer = answer;
      
      // For MCQ, use the selected option text
      if (currentQuestion.type === 'mcq' && selectedOption !== null && currentQuestion.options) {
        studentAnswer = currentQuestion.options[selectedOption];
      }

      const response = await fetch('http://localhost:8000/dynamic-quiz-eval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lessonId,
          module_id: moduleId,
          question: currentQuestion.question,
          question_type: currentQuestion.type,
          answer: studentAnswer,
          correct_answer: currentQuestion.correct_answer
        }),
      });

      if (!response.ok) throw new Error('Failed to evaluate answer');
      
      const result = await response.json();
      setFeedback(result.feedback);
      setShowExplanation(true);
      
      if (result.pass_) {
        setCorrectAnswers(prev => prev + 1);
      }
      
      setTotalAttempts(prev => prev + 1);
      
    } catch (err) {
      setError('Failed to evaluate answer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    
    // Validate input based on question type
    const currentQuestion = questions[currentQuestionIndex];
    if (currentQuestion.type === 'mcq' && selectedOption === null) {
      setError('Please select an option.');
      return;
    }
    if ((currentQuestion.type === 'open_ended' || currentQuestion.type === 'coding') && !answer.trim()) {
      setError('Please provide an answer.');
      return;
    }
    
    evaluateAnswer();
  };

  const handleNext = () => {
    setShowExplanation(false);
    setFeedback('');
    setError('');
    setAnswer('');
    setSelectedOption(null);
    
    if (correctAnswers >= 10) {
      onPass();
    } else if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // If we've gone through all questions but haven't reached 10 correct answers,
      // shuffle and restart with new questions
      generateQuestions();
      setCurrentQuestionIndex(0);
      setCorrectAnswers(0);
      setTotalAttempts(0);
    }
  };

  const getQuestionTypeIcon = (type: string) => {
    switch (type) {
      case 'mcq': return '📝';
      case 'open_ended': return '💭';
      case 'coding': return '💻';
      default: return '❓';
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    switch (type) {
      case 'mcq': return 'Multiple Choice';
      case 'open_ended': return 'Open-Ended';
      case 'coding': return 'Coding';
      default: return 'Question';
    }
  };

  if (loadingQuestions) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating quiz questions...</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error || 'Failed to load quiz questions. Please refresh the page.'}
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progressPercent = (correctAnswers / 10) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Section */}
      <div className="bg-blue-50 rounded-lg p-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-blue-800">
            Progress: {correctAnswers}/10 correct answers needed
          </span>
          <span className="text-sm text-blue-600">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="w-full bg-blue-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
        <div className="mt-2 text-xs text-blue-600">
          Total attempts: {totalAttempts}
        </div>
      </div>

      {/* Question Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <div className="flex items-center mb-4">
          <span className="text-2xl mr-3">{getQuestionTypeIcon(currentQuestion.type)}</span>
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              {getQuestionTypeLabel(currentQuestion.type)} Question
            </h3>
            <p className="text-sm text-gray-500">
              {currentQuestion.type === 'mcq' ? 'Select the best answer' : 
               currentQuestion.type === 'coding' ? 'Write code to solve the problem' : 
               'Provide a detailed explanation'}
            </p>
          </div>
        </div>
        
        <div className="text-lg font-semibold text-gray-900" style={{opacity: 1}}>
          <ReactMarkdown>{currentQuestion.question}</ReactMarkdown>
        </div>
      </div>

      {/* Answer Section */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {currentQuestion.type === 'mcq' ? (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Select the correct answer:
            </label>
            {currentQuestion.options?.map((option, index) => (
              <label key={index} className="flex items-center p-3 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
                <input
                  type="radio"
                  name="mcq-option"
                  value={index}
                  checked={selectedOption === index}
                  onChange={() => setSelectedOption(index)}
                  className="mr-3 text-indigo-600 focus:ring-indigo-500"
                  disabled={isLoading || showExplanation}
                />
                <span className="text-gray-700">{option}</span>
              </label>
            ))}
          </div>
        ) : (
          <div>
            <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
              {currentQuestion.type === 'coding' ? 'Your Code/Answer:' : 'Your Answer:'}
            </label>
            <textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-white text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200 font-mono"
              rows={currentQuestion.type === 'coding' ? 8 : 4}
              placeholder={
                currentQuestion.type === 'coding' 
                  ? "Write your code here..." 
                  : "Type your answer here..."
              }
              disabled={isLoading || showExplanation}
            />
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {feedback && showExplanation && (
          <div className={`p-4 rounded-lg ${feedback.includes('Good job') || feedback.includes('Great job') || feedback.includes('Pass: true') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-yellow-50 border border-yellow-200 text-yellow-700'}`}>
            <div className="prose max-w-none">
              <ReactMarkdown>{feedback}</ReactMarkdown>
            </div>
            {currentQuestion.explanation && (
              <div className="mt-3 pt-3 border-t border-current">
                <strong>Explanation:</strong> {currentQuestion.explanation}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end space-x-4">
          {!showExplanation && (
            <button
              type="submit"
              disabled={isLoading || 
                (currentQuestion.type === 'mcq' && selectedOption === null) ||
                ((currentQuestion.type === 'open_ended' || currentQuestion.type === 'coding') && !answer.trim())
              }
              className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center ${
                isLoading || 
                (currentQuestion.type === 'mcq' && selectedOption === null) ||
                ((currentQuestion.type === 'open_ended' || currentQuestion.type === 'coding') && !answer.trim())
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              }`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Evaluating...
                </>
              ) : (
                'Submit Answer'
              )}
            </button>
          )}
          {showExplanation && (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors duration-200"
            >
              {correctAnswers >= 10 ? 'Complete Module' : 'Next Question'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
} 