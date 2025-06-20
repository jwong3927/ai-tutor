'use client';

import { useState, useEffect } from 'react';
import { evaluateQuizAnswer } from '@/lib/quizApi';
import ReactMarkdown from 'react-markdown';

interface QuizAgentProps {
  lessonId: number;
  moduleId?: number;
  questions: string[];
  onPass: () => void;
}

export default function QuizAgent({ lessonId, moduleId, questions, onPass }: QuizAgentProps) {
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showNext, setShowNext] = useState(false);

  useEffect(() => {
    setCurrentQuestionIndex(0);
    setAnswer('');
    setFeedback('');
    setShowNext(false);
    setError('');
    setAttempts(0);
    setCooldown(false);
  }, [questions]);

  // Debug output
  useEffect(() => {
    console.log('QuizAgent questions:', questions);
    console.log('Current question index:', currentQuestionIndex);
  }, [questions, currentQuestionIndex]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown) return;

    setIsLoading(true);
    setError('');
    setFeedback('');

    try {
      const result = await evaluateQuizAnswer(lessonId, answer);
      setFeedback(result.feedback);
      
      if (result.pass_) {
        setShowNext(true);
      } else {
        setAttempts(prev => prev + 1);
        if (attempts >= 2) {
          setCooldown(true);
          setTimeout(() => setCooldown(false), 300000); // 5 minutes
        }
      }
    } catch (err) {
      setError('Failed to evaluate answer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    setShowNext(false);
    if (currentQuestionIndex >= questions.length - 1) {
      onPass();
      setCurrentQuestionIndex(0);
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
    setAnswer('');
    setFeedback('');
    setError('');
    setAttempts(0);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Question</h3>
        <div className="text-sm text-gray-500 mb-2">Question {currentQuestionIndex + 1} of {questions.length}</div>
        <p className="text-gray-800">{questions[currentQuestionIndex]}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="answer" className="block text-sm font-medium text-gray-700 mb-2">
            Your Answer
          </label>
          <textarea
            id="answer"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!isLoading && !cooldown && answer.trim() && !showNext) {
                  const form = e.currentTarget.form;
                  if (form) form.requestSubmit();
                }
              }
            }}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-100 text-gray-800 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors duration-200"
            rows={4}
            placeholder="Type your answer here..."
            disabled={isLoading || cooldown || showNext}
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {feedback && (
          <div className={`p-4 rounded-lg ${feedback.includes('Good job') || feedback.includes('Great job') ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-yellow-50 border border-yellow-200 text-yellow-700'}`}>
            <div className="prose max-w-none"><ReactMarkdown>{feedback}</ReactMarkdown></div>
          </div>
        )}

        {cooldown && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg">
            Please wait 5 minutes before trying again. Take this time to review the lesson material.
          </div>
        )}

        <div className="flex justify-end space-x-4">
          {!showNext && (
            <button
              type="submit"
              disabled={isLoading || cooldown || !answer.trim()}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors duration-200 flex items-center ${
                isLoading || cooldown || !answer.trim()
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
          {showNext && (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-3 rounded-lg font-semibold bg-green-600 text-white hover:bg-green-700 transition-colors duration-200"
            >
              Next Question
            </button>
          )}
        </div>
      </form>
    </div>
  );
} 