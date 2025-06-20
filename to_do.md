# AI Tutor Website: To-Do List for Cursor

## 1. Project Initialization

- [ ] Set up a new repository in Cursor for the AI Tutor website[2][3].
- [ ] Install and configure React (or preferred frontend framework)[2].
- [ ] Set up Supabase or Convex for backend, authentication, and data storage[2][3].
- [ ] Add a `.env` file for API keys and backend endpoints (do not commit to repo)[2].

---

## 2. Data & Content Structure

- [ ] Create a `syllabus.md` or `syllabus.json` file with sequential lesson content (text, images, video links)[2].
- [ ] Create a `quizzes.json` file with open-ended quiz questions for each lesson[2].
- [ ] Prepare sample media assets (images, diagrams, videos) for lessons[2].

---

## 3. Agent Logic & Workflow

- [ ] Implement an agent module to orchestrate lesson delivery, quiz administration, and adaptive feedback (not just a chatbot)[2][3].
- [ ] Design the agent to:
    - Present lessons in order and check for readiness before quizzes[2].
    - Administer open-ended quizzes and collect free-form answers[2].
    - Evaluate answers using an LLM (OpenAI, Gemini, Claude, OSS) via secure API[2].
    - Unlock the next lesson only if the answer passes; otherwise, provide hints, examples, or simpler explanations and enforce retry logic[2][3].
    - Track and persist each student's progress, quiz attempts, and feedback[2].

---

## 4. Frontend Development

- [ ] Build lesson and quiz UI components (e.g., `LessonAgent.jsx`, `QuizAgent.jsx`)[2].
- [ ] Render content from Markdown/JSON syllabus and quizzes[2].
- [ ] Integrate media rendering (images, video, diagrams) in lessons[2].
- [ ] Implement navigation and feedback logic controlled by the agent, not by free-form chat[2][3].
- [ ] Add user authentication and progress resumption on login[2].

---

## 5. Backend & API Integration

- [ ] Set up Supabase/Convex tables for user profiles, progress, quiz attempts, and feedback[2][3].
- [ ] Implement secure API routes for LLM evaluation of quiz answers[2].
- [ ] Ensure all user data is stored securely and backend endpoints are protected[2][3].

---

## 6. Adaptive Feedback & Retry Logic

- [ ] Implement agent logic to provide adaptive feedback if a student fails a quiz (hints, extra examples, simpler explanations)[2][3].
- [ ] Enforce cooldowns or retry limits after repeated quiz failures[2].
- [ ] Track and update student state accordingly[2].

---

## 7. Testing & Quality Assurance

- [ ] Test lesson and quiz flows end-to-end for multiple users[2].
- [ ] Validate agent adaptivity: ensure feedback and progression logic works as intended[2][3].
- [ ] Check security: confirm user data and API keys are protected[2].

---

## 8. Documentation

- [ ] Write a `README.md` with setup, deployment, and usage instructions[2].
- [ ] Document agent workflow, file structure, and backend integration[2].

---

## 9. Success Criteria

- [ ] Students can complete at least one lesson and quiz (agent-guided)[2][3].
- [ ] The agent provides actionable, adaptive feedback and unlocks lessons only upon mastery 