from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from typing import List, Optional, Literal
import json
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class QuizEvalRequest(BaseModel):
    lesson_id: int
    answer: str

class QuizEvalResponse(BaseModel):
    pass_: bool
    feedback: str

class LessonUpdateRequest(BaseModel):
    lesson_id: int
    topic: str

class LessonUpdateResponse(BaseModel):
    content: str
    last_updated: str

class ChatMessage(BaseModel):
    sender: str  # 'student' or 'agent'
    text: str

class ChatRequest(BaseModel):
    lesson_id: int
    topic: str
    chat_history: List[ChatMessage]
    question: str

class ChatResponse(BaseModel):
    answer: str

class SuperChatRequest(BaseModel):
    lesson_id: int
    topic: str
    chat_history: List[ChatMessage]
    question: str
    mode: Literal['explain', 'example', 'practice']

class SuperChatResponse(BaseModel):
    answer: str
    type: Literal['explanation', 'example', 'hint', 'practice']

class QuizQuestionRequest(BaseModel):
    lesson_id: int
    module_id: int
    module_title: str
    key_terms: List[str]
    topics: List[str]

class QuizQuestion(BaseModel):
    question: str
    type: Literal['mcq', 'open_ended', 'coding']
    options: Optional[List[str]] = None
    correct_answer: Optional[str] = None
    explanation: str

class QuizQuestionResponse(BaseModel):
    questions: List[QuizQuestion]

class DynamicQuizEvalRequest(BaseModel):
    lesson_id: int
    module_id: int
    question: str
    question_type: str
    answer: str
    correct_answer: Optional[str] = None

# --- LangChain/LLM setup ---
try:
    print("DEBUG: Starting LLM setup...")
    from langgraph.graph import StateGraph, END
    from langchain_openai import ChatOpenAI
    from langchain.prompts import ChatPromptTemplate
    from langchain.chains import LLMChain
    import openai
    
    print("DEBUG: LangChain imports successful")
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    print(f"DEBUG: OPENAI_API_KEY found: {'Yes' if OPENAI_API_KEY else 'No'}")
    if OPENAI_API_KEY:
        print(f"DEBUG: OPENAI_API_KEY length: {len(OPENAI_API_KEY)}")
        print(f"DEBUG: OPENAI_API_KEY starts with: {OPENAI_API_KEY[:10]}...")
    
    llm = ChatOpenAI(api_key=OPENAI_API_KEY, model="gpt-3.5-turbo") if OPENAI_API_KEY else None
    print(f"DEBUG: LLM object created: {'Yes' if llm else 'No'}")
    
    # Define the lesson update prompt
    LESSON_UPDATE_PROMPT = ChatPromptTemplate.from_messages([
        ("system", """You are an expert AI tutor. Your task is to provide the most up-to-date and comprehensive information about a given topic.
        Focus on:
        1. Latest developments and research
        2. Current best practices
        3. Real-world applications
        4. Common challenges and solutions
        5. Industry trends
        
        Format your response in clear, structured paragraphs suitable for teaching.
        Include specific examples and practical applications where relevant."""),
        ("user", "Please provide comprehensive, up-to-date information about {topic} for lesson {lesson_id}.")
    ])
    print("DEBUG: LESSON_UPDATE_PROMPT created")
    
    # Define the quiz evaluation prompt
    QUIZ_EVAL_PROMPT = ChatPromptTemplate.from_messages([
        ("system", """You are an expert AI tutor evaluating a student's answer. Score strictly and do NOT give credit for information that is not explicitly present in the student's answer. Do NOT infer, assume, or imagine details that are not written by the student.

For each answer, provide:
- A score from 0 to 100 (integer, no decimals) based on the following criteria:
    - Accuracy of technical concepts (0-20)
    - Depth of understanding (0-20)
    - Clarity of explanation (0-20)
    - Use of relevant examples (0-15)
    - Connection to current industry practices (0-15)
    - Overall completeness (0-10)
- For each criterion, briefly justify the sub-score, referencing only what is actually present in the answer.
- If the answer does not address a criterion, give a score of zero for that criterion.
- Penalize vague, incomplete, or overly brief answers (e.g., less than 30 words should get a low score).
- Only give a score above 80 if the answer is thorough, accurate, and well-supported by the student's actual writing.

Format your response as:
Score breakdown:
- Total Score: <number from 0 to 100>
- Accuracy: <score>/20 - <justification>
- Depth: <score>/20 - <justification>
- Clarity: <score>/20 - <justification>
- Examples: <score>/15 - <justification>
- Industry: <score>/15 - <justification>
- Completeness: <score>/10 - <justification>
- Feedback:
<markdown feedback here>
"""),
        ("user", "Evaluate this answer for lesson {lesson_id}: {answer}")
    ])
    print("DEBUG: QUIZ_EVAL_PROMPT created")
    
    # Define the super agent prompt
    SUPER_AGENT_PROMPT = ChatPromptTemplate.from_messages([
        ("system", """You are an advanced AI tutor with deep expertise in teaching and explaining complex topics. Your responses should be:

        1. For explanations:
           - Break down complex concepts into digestible parts
           - Use analogies and real-world examples
           - Highlight key principles and their relationships
           - Address common misconceptions
           - Provide visual descriptions when helpful
           - **Format your answers in clear, well-structured markdown. Use headings, bullet points, sub-bullets (indented lists), and bold/italic for emphasis. Prefer lists over dense paragraphs whenever possible.**

        2. For examples:
           - Provide multiple examples of varying complexity
           - Include both theoretical and practical examples
           - Show step-by-step solutions
           - Explain the reasoning behind each step
           - Connect examples to real-world applications

        3. For practice:
           - Create challenging but achievable problems
           - Include hints and guidance
           - Provide detailed solutions
           - Explain the learning objectives
           - Suggest related topics for further practice

        Always maintain a supportive and encouraging tone while challenging the student to think deeply.
        Adapt your explanations to the student's level of understanding based on the chat history."""),
        ("user", "Mode: {mode}\nTopic: {topic}\nChat History:\n{history}\nStudent Question: {question}")
    ])
    print("DEBUG: SUPER_AGENT_PROMPT created")
    
    # Define the quiz question generation prompt
    QUIZ_GENERATION_PROMPT = ChatPromptTemplate.from_messages([
        ("system", """You are an expert AI tutor creating quiz questions for a specific module. Generate 15 diverse questions that test understanding of the module content.

Question Types:
1. MCQ (Multiple Choice): 4 options, 1 correct answer
2. Open-ended: Conceptual questions requiring explanation
3. Coding: Practical programming questions with code examples

Guidelines:
- Questions should be based on the module topics and key terms
- Vary difficulty from basic to advanced
- Ensure questions are clear and unambiguous
- For coding questions, provide practical scenarios
- For MCQs, make distractors plausible but clearly wrong

Format your response as a JSON array with objects containing:
- question: the question text
- type: "mcq", "open_ended", or "coding"
- options: array of 4 options (for MCQ only)
- correct_answer: the correct answer or expected response
- explanation: brief explanation of the answer

Return only valid JSON without any additional text."""),
        ("user", "Generate quiz questions for Module {module_id}: {module_title}\nTopics: {topics}\nKey Terms: {key_terms}")
    ])
    print("DEBUG: QUIZ_GENERATION_PROMPT created")

    # Define the dynamic quiz evaluation prompt
    DYNAMIC_QUIZ_EVAL_PROMPT = ChatPromptTemplate.from_messages([
        ("system", """You are an expert AI tutor evaluating a student's answer to a quiz question. Score strictly and provide constructive feedback.

For MCQ questions:
- Check if the selected answer matches the correct answer
- Provide explanation for why the answer is correct/incorrect

For Open-ended questions:
- Evaluate understanding, accuracy, and completeness
- Score from 0-100 based on:
  - Technical accuracy (0-40)
  - Depth of understanding (0-30)
  - Clarity of explanation (0-30)
- Pass if score >= 70

For Coding questions:
- Check if the code logic is correct
- Evaluate code quality, syntax, and approach
- Score from 0-100 based on:
  - Correctness (0-50)
  - Code quality (0-30)
  - Problem-solving approach (0-20)
- Pass if score >= 70

Format your response as:
Score: <number>
Pass: <true/false>
Feedback: <detailed feedback with explanation>"""),
        ("user", "Question Type: {question_type}\nQuestion: {question}\nCorrect Answer: {correct_answer}\nStudent Answer: {answer}")
    ])
    print("DEBUG: DYNAMIC_QUIZ_EVAL_PROMPT created")
    print("DEBUG: All prompts created successfully")
    
except ImportError as e:
    print(f"DEBUG: ImportError in LLM setup: {e}")
    llm = None
except Exception as e:
    print(f"DEBUG: Exception in LLM setup: {e}")
    print(f"DEBUG: Exception type: {type(e)}")
    import traceback
    print(f"DEBUG: Full traceback: {traceback.format_exc()}")
    llm = None

# --- Endpoints ---
@app.get("/health")
def health_check():
    return {"status": "healthy"}

@app.post("/quiz-eval", response_model=QuizEvalResponse)
async def quiz_eval(req: QuizEvalRequest):
    print(f"DEBUG: quiz-eval called with lesson_id={req.lesson_id}")
    print(f"DEBUG: answer length={len(req.answer)}")
    print(f"DEBUG: answer preview: {req.answer[:100]}...")
    
    if not llm:
        print("DEBUG: LLM not available, using mock logic")
        # Simple mock logic if LLM is not available
        if len(req.answer.strip()) > 10:
            return QuizEvalResponse(pass_=True, feedback="Great job! You passed.")
        else:
            return QuizEvalResponse(pass_=False, feedback="Try to elaborate more. Here is a hint: Think about the main idea of the lesson.")
    try:
        print("DEBUG: Creating quiz evaluation chain")
        # Use new LangChain pattern (RunnableSequence)
        chain = QUIZ_EVAL_PROMPT | llm
        print("DEBUG: Invoking LLM for quiz evaluation")
        result = await chain.ainvoke({"lesson_id": req.lesson_id, "answer": req.answer})
        print(f"DEBUG: LLM result received, type={type(result)}")
        
        # If result is an AIMessage, extract its content
        if hasattr(result, 'content'):
            result_text = result.content
            print("DEBUG: Extracted content from AIMessage")
        else:
            result_text = str(result)
            print("DEBUG: Using string representation of result")
        
        print(f"DEBUG: Result text length={len(result_text)}")
        print(f"DEBUG: Result text preview: {result_text[:200]}...")
        
        import re
        total_score_match = re.search(r"Total Score:\s*(\d+)", result_text)
        feedback_match = re.search(r"Feedback:(.*)", result_text, re.DOTALL)
        
        print(f"DEBUG: total_score_match={total_score_match}")
        print(f"DEBUG: feedback_match={feedback_match}")
        
        total_score = int(total_score_match.group(1)) if total_score_match else 0
        feedback = feedback_match.group(1).strip() if feedback_match else result_text
        passed = total_score >= 80
        
        print(f"DEBUG: Final total_score={total_score}, passed={passed}")
        print(f"DEBUG: Final feedback length={len(feedback)}")
        
        return QuizEvalResponse(pass_=passed, feedback=f"{result_text.strip()}")
    except Exception as e:
        print(f"DEBUG: Exception in quiz_eval: {e}")
        print(f"DEBUG: Exception type: {type(e)}")
        import traceback
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        print("QUIZ-EVAL ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/lesson-update", response_model=LessonUpdateResponse)
async def update_lesson_content(req: LessonUpdateRequest):
    if not llm:
        raise HTTPException(status_code=503, detail="LLM service not available")
    
    try:
        # Create lesson update chain
        update_chain = LLMChain(llm=llm, prompt=LESSON_UPDATE_PROMPT)
        
        # Get updated content
        content = await update_chain.arun(topic=req.topic, lesson_id=req.lesson_id)
        
        return LessonUpdateResponse(
            content=content,
            last_updated=datetime.now().isoformat()
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/chat", response_model=ChatResponse)
async def chat_with_agent(req: ChatRequest):
    # If LLM is available, use it with chat history
    if 'llm' in globals() and llm:
        # Compose a prompt with chat history
        history = "\n".join([
            f"{msg['sender'].capitalize()}: {msg['text']}" for msg in [m.dict() for m in req.chat_history]
        ])
        # Add a system prompt for markdown formatting
        system_prompt = (
            "You are an expert AI tutor. Format your answers in clear, well-structured markdown. "
            "Use headings, bullet points, sub-bullets (indented lists), and bold/italic for emphasis. "
            "Prefer lists over dense paragraphs whenever possible."
        )
        prompt = f"{system_prompt}\n\nYou are helping a student with the topic '{req.topic}'. Here is the conversation so far:\n{history}\nStudent: {req.question}\nAgent:"
        try:
            response = await llm.ainvoke(prompt)
            answer = response.content if hasattr(response, 'content') else str(response)
            return ChatResponse(answer=answer)
        except Exception as e:
            return ChatResponse(answer=f"[LLM error: {str(e)}]")
    else:
        # Mock: avoid repeating previous agent answers
        previous_agent_answers = [m.text for m in req.chat_history if m.sender == 'agent']
        if previous_agent_answers:
            answer = f"(New answer) About '{req.topic}': {req.question}"
        else:
            answer = f"This is a mock answer about '{req.topic}'. (Your question: '{req.question}')"
        return ChatResponse(answer=answer)

@app.post("/super-chat", response_model=SuperChatResponse)
async def super_chat(req: SuperChatRequest):
    if not llm:
        # Mock responses based on mode
        mock_responses = {
            'explain': {
                'answer': f"Here's a detailed explanation about {req.topic}: {req.question}",
                'type': 'explanation'
            },
            'example': {
                'answer': f"Let me show you some examples related to {req.topic}: {req.question}",
                'type': 'example'
            },
            'practice': {
                'answer': f"Here's a practice problem about {req.topic}: {req.question}",
                'type': 'practice'
            }
        }
        return SuperChatResponse(**mock_responses[req.mode])
    
    try:
        # Format chat history
        history = "\n".join([
            f"{msg.sender.capitalize()}: {msg.text}" for msg in req.chat_history
        ])
        
        # Create super agent chain
        super_chain = LLMChain(llm=llm, prompt=SUPER_AGENT_PROMPT)
        
        # Get response
        result = await super_chain.arun(
            mode=req.mode,
            topic=req.topic,
            history=history,
            question=req.question
        )
        
        return SuperChatResponse(
            answer=result,
            type=req.mode if req.mode != 'explain' else 'explanation'
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/generate-quiz-questions", response_model=QuizQuestionResponse)
async def generate_quiz_questions(req: QuizQuestionRequest):
    print(f"DEBUG: generate-quiz-questions called with lesson_id={req.lesson_id}, module_id={req.module_id}")
    print(f"DEBUG: module_title={req.module_title}")
    print(f"DEBUG: key_terms={req.key_terms}")
    print(f"DEBUG: topics={req.topics}")
    
    if not llm:
        print("DEBUG: LLM not available")
        raise HTTPException(status_code=503, detail="LLM service not available")
    
    try:
        print("DEBUG: Creating quiz generation chain")
        # Create quiz generation chain
        generation_chain = LLMChain(llm=llm, prompt=QUIZ_GENERATION_PROMPT)
        
        print("DEBUG: Generating questions with LLM")
        # Generate questions
        result = await generation_chain.arun(
            module_id=req.module_id,
            module_title=req.module_title,
            topics=", ".join(req.topics),
            key_terms=", ".join(req.key_terms)
        )
        
        print(f"DEBUG: LLM result received, length={len(str(result))}")
        print(f"DEBUG: LLM result preview: {str(result)[:200]}...")
        
        # Parse the JSON response
        import json
        import re
        try:
            # Remove code block markers if present
            result_clean = re.sub(r'^```(?:json)?\s*|\s*```$', '', result.strip(), flags=re.MULTILINE)
            print(f"DEBUG: Cleaned LLM result for JSON parsing: {result_clean[:200]}...")
            questions_data = json.loads(result_clean)
            print(f"DEBUG: JSON parsed successfully, found {len(questions_data)} questions")
            questions = [QuizQuestion(**q) for q in questions_data]
            print("DEBUG: QuizQuestion objects created successfully")
            return QuizQuestionResponse(questions=questions)
        except json.JSONDecodeError as e:
            print(f"DEBUG: JSON decode error: {e}")
            print(f"DEBUG: Raw result that failed to parse: {result}")
            # Fallback: create simple questions if JSON parsing fails
            fallback_questions = [
                QuizQuestion(
                    question=f"Explain the key concept of {req.key_terms[0] if req.key_terms else 'this module'}",
                    type="open_ended",
                    explanation="This tests your understanding of the core concepts."
                )
            ]
            print("DEBUG: Using fallback questions")
            return QuizQuestionResponse(questions=fallback_questions)
        
    except Exception as e:
        print(f"DEBUG: Exception in generate_quiz_questions: {e}")
        print(f"DEBUG: Exception type: {type(e)}")
        import traceback
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/dynamic-quiz-eval", response_model=QuizEvalResponse)
async def evaluate_dynamic_quiz(req: DynamicQuizEvalRequest):
    print(f"DEBUG: dynamic-quiz-eval called with lesson_id={req.lesson_id}, module_id={req.module_id}")
    print(f"DEBUG: question_type={req.question_type}")
    print(f"DEBUG: question={req.question}")
    print(f"DEBUG: answer length={len(req.answer)}")
    print(f"DEBUG: correct_answer={req.correct_answer}")
    
    if not llm:
        print("DEBUG: LLM not available, using fallback logic")
        # Simple fallback logic
        if req.question_type == "mcq":
            passed = req.answer == req.correct_answer
        else:
            passed = len(req.answer.strip()) > 20
        return QuizEvalResponse(pass_=passed, feedback="Evaluation completed.")
    
    try:
        print("DEBUG: Creating dynamic evaluation chain")
        # Create dynamic evaluation chain
        eval_chain = LLMChain(llm=llm, prompt=DYNAMIC_QUIZ_EVAL_PROMPT)
        
        print("DEBUG: Evaluating answer with LLM")
        # Evaluate answer
        result = await eval_chain.arun(
            question_type=req.question_type,
            question=req.question,
            correct_answer=req.correct_answer or "N/A",
            answer=req.answer
        )
        
        print(f"DEBUG: LLM evaluation result received, length={len(str(result))}")
        print(f"DEBUG: LLM evaluation result: {result}")
        
        # Parse the result
        import re
        score_match = re.search(r"Score:\s*(\d+)", result)
        pass_match = re.search(r"Pass:\s*(true|false)", result, re.IGNORECASE)
        feedback_match = re.search(r"Feedback:(.*)", result, re.DOTALL)
        
        print(f"DEBUG: score_match={score_match}")
        print(f"DEBUG: pass_match={pass_match}")
        print(f"DEBUG: feedback_match={feedback_match}")
        
        score = int(score_match.group(1)) if score_match else 0
        passed = pass_match.group(1).lower() == "true" if pass_match else score >= 70
        feedback = feedback_match.group(1).strip() if feedback_match else result
        
        print(f"DEBUG: Final score={score}, passed={passed}")
        print(f"DEBUG: Final feedback length={len(feedback)}")
        
        return QuizEvalResponse(pass_=passed, feedback=feedback)
        
    except Exception as e:
        print(f"DEBUG: Exception in evaluate_dynamic_quiz: {e}")
        print(f"DEBUG: Exception type: {type(e)}")
        import traceback
        print(f"DEBUG: Full traceback: {traceback.format_exc()}")
        print("DYNAMIC-QUIZ-EVAL ERROR:", e)
        raise HTTPException(status_code=500, detail=str(e))

# Startup message
if __name__ == "__main__":
    print("DEBUG: Backend server starting...")
    print(f"DEBUG: LLM available: {'Yes' if llm else 'No'}")
    print("DEBUG: Server ready to handle requests") 