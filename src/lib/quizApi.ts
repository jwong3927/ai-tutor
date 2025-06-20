export async function evaluateQuizAnswer(lessonId: number, answer: string) {
  const res = await fetch('http://localhost:8000/quiz-eval', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lesson_id: lessonId, answer }),
  });
  if (!res.ok) {
    throw new Error('Failed to evaluate quiz answer');
  }
  return res.json();
} 