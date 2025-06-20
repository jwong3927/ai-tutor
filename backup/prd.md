# AI Tutor Website Build Prompt for Cursor

## Overview

Build an AI Tutor website using Cursor that features an **agentic learning experience**—not just a generic chatbot. The AI agent should guide students through a structured syllabus, deliver lessons, administer quizzes, evaluate answers using an LLM, and adapt content and feedback based on each learner’s progress and needs[2][3].

---

## Core Requirements

### 1. Agentic Tutoring Workflow

- The agent orchestrates the entire learning journey:  
  - Presents lessons in order  
  - Checks for readiness before quizzes  
  - Administers open-ended quiz questions  
  - Evaluates answers with an LLM and unlocks the next lesson upon mastery  
  - Provides actionable, adaptive feedback (hints, examples, simpler explanations) if the student struggles[2][3]

### 2. Learning Module

- Sequential lesson delivery (text, images, video) using Markdown or JSON syllabus files
- Each lesson is presented by the agent, who explains the content and checks for understanding before proceeding[2]
- Rich media support (images, diagrams, embedded video)

### 3. Quiz Module

- After each lesson, the agent issues an open-ended quiz question
- Collects free-form student responses
- Sends answers to an LLM (OpenAI, Gemini, Claude, OSS) for grading
- Unlocks the next lesson only if the answer passes; otherwise, provides adaptive feedback and enforces retry logic (including cooldowns after repeated failures)[2][3]

### 4. Progress Tracking

- The agent tracks each student’s current lesson, quiz attempts, and feedback history
- Progress is stored per user and resumes on re-login[2]

---

## Implementation Guidelines

### Frontend

- Use React (or similar) for lesson and quiz UI, driven by the agent’s workflow
- Render content from Markdown/JSON syllabus files
- Navigation and feedback are controlled by the agent, not by free-form chat

### Backend

- Use Supabase or Convex for authentication, data storage, and file/media management
- Secure API for LLM integration; agent orchestrates all LLM calls for evaluation and feedback[2][3]
- Agent logic (preferably using LangGraph or similar) manages state, lesson progression, and adaptive feedback

### Data

- Syllabus and quizzes are defined in structured files (Markdown or JSON)
- Student progress and quiz attempts are stored per user, with agent updating state

### Security

- All user data must be stored securely
- API keys and LLM endpoints must be protected

---

## User Stories

- As a student, I want the AI agent to teach lessons in order, so I can build knowledge step by step[2][3]
- As a student, I want the agent to quiz me after each lesson, evaluate my answers, and only let me proceed when I’m ready
- As a student, I want the agent to give me targeted feedback and extra help if I’m struggling, not just generic responses
- As a student, I want my progress to be tracked so I can resume learning where I left off

---

## Out of Scope

- No admin dashboard or analytics
- No real-time chat, video, or advanced adaptive algorithms
- No multi-user management beyond basic authentication

---

## Success Criteria

- Students complete at least one lesson and quiz (agent-guided)
- Average number of quiz attempts before passing (shows adaptivity)
- Student satisfaction with agent feedback and guidance
