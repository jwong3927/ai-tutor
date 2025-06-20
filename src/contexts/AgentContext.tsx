'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

// Types for lessons and quizzes
export type Lesson = {
  id: number;
  title: string;
  content: string;
  media?: { type: string; src: string; alt?: string }[];
  lastUpdated?: string;
};

export type Quiz = {
  lessonId: number;
  question: string;
  answerType: 'text';
};

export type Feedback = {
  message: string;
  type: 'success' | 'error' | 'hint';
};

export type QuizProgress = {
  questions: any[];
  currentQuestionIndex: number;
  answer: string;
  selectedOption: number | null;
  feedback: string;
  correctAnswers: number;
  totalAttempts: number;
  showExplanation: boolean;
};

export type AgentState = {
  currentLesson: number;
  quizAttempts: Record<number, number>;
  feedback: Feedback[];
  completedLessons: number[];
  cooldowns: Record<number, number>; // lessonId -> timestamp when cooldown ends
  quizProgress: Record<string, QuizProgress>; // progressKey -> progress data
};

const AgentContext = createContext<any>(undefined);

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const [syllabus, setSyllabus] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [state, setState] = useState<AgentState>({
    currentLesson: 1,
    quizAttempts: {},
    feedback: [],
    completedLessons: [],
    cooldowns: {},
    quizProgress: {},
  });
  const [loading, setLoading] = useState(true);

  // Load syllabus and quizzes from JSON
  useEffect(() => {
    async function fetchData() {
      const syllabusRes = await fetch('/syllabus.json');
      const quizzesRes = await fetch('/quizzes.json');
      setSyllabus(await syllabusRes.json());
      setQuizzes(await quizzesRes.json());
      setLoading(false);
    }
    fetchData();
  }, []);

  // Advance to next lesson
  const advanceLesson = () => {
    setState((prev) => ({
      ...prev,
      currentLesson: prev.currentLesson + 1,
      completedLessons: [...prev.completedLessons, prev.currentLesson],
      feedback: [],
    }));
  };

  // Record a quiz attempt and set cooldown if needed
  const recordQuizAttempt = (lessonId: number, failed: boolean) => {
    setState((prev) => {
      const attempts = (prev.quizAttempts[lessonId] || 0) + 1;
      let cooldowns = { ...prev.cooldowns };
      if (failed && attempts >= 3) {
        // Set cooldown for 60 seconds
        cooldowns[lessonId] = Date.now() + 60 * 1000;
      }
      return {
        ...prev,
        quizAttempts: {
          ...prev.quizAttempts,
          [lessonId]: attempts,
        },
        cooldowns,
      };
    });
  };

  // Add feedback
  const addFeedback = (feedback: Feedback) => {
    setState((prev) => ({
      ...prev,
      feedback: [...prev.feedback, feedback],
    }));
  };

  // Get quiz progress
  const getQuizProgress = (progressKey: string): QuizProgress | undefined => {
    return state.quizProgress[progressKey];
  };

  // Set quiz progress
  const setQuizProgress = (progressKey: string, progress: QuizProgress) => {
    setState((prev) => ({
      ...prev,
      quizProgress: {
        ...prev.quizProgress,
        [progressKey]: progress,
      },
    }));
  };

  // Placeholder for LLM evaluation (to be replaced with API call)
  const evaluateAnswer = async (lessonId: number, answer: string): Promise<{ pass: boolean; feedback: Feedback }> => {
    // Simple logic: pass if answer length > 10 chars
    if (answer.trim().length > 10) {
      return { pass: true, feedback: { message: 'Great job! You passed.', type: 'success' } };
    } else {
      return { pass: false, feedback: { message: 'Try to elaborate more. Here is a hint: Think about the main idea of the lesson.', type: 'hint' } };
    }
  };

  return (
    <AgentContext.Provider
      value={{
        syllabus,
        quizzes,
        state,
        loading,
        advanceLesson,
        recordQuizAttempt,
        addFeedback,
        evaluateAnswer,
        setState,
        getQuizProgress,
        setQuizProgress,
      }}
    >
      {children}
    </AgentContext.Provider>
  );
}

export function useAgent() {
  const context = useContext(AgentContext);
  if (context === undefined) {
    throw new Error('useAgent must be used within an AgentProvider');
  }
  return context;
} 