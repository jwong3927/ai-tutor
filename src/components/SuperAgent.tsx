import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import ChatSidebar from './ChatSidebar';
import { getChatMessages, addChatMessage } from '../lib/supabase';

export default function SuperAgent({ lesson }: { lesson: any }) {
  const [selectedSession, setSelectedSession] = useState<any>(null);
  const [messages, setMessages] = useState<{ sender: 'student' | 'agent'; text: string; type?: 'question' | 'explanation' | 'example' | 'hint' }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'explain' | 'example' | 'practice'>('explain');

  // Load messages for selected session
  useEffect(() => {
    async function loadMessages() {
      if (!selectedSession) return;
      try {
        const msgs = await getChatMessages(selectedSession.id);
        setMessages(msgs.map((m: any) => ({ sender: m.sender, text: m.text, type: m.type })));
      } catch {
        setMessages([]);
      }
    }
    loadMessages();
  }, [selectedSession]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !selectedSession) return;
    const question = input.trim();
    setMessages((msgs) => [...msgs, { sender: 'student', text: question }]);
    setInput('');
    setLoading(true);
    setError('');
    try {
      await addChatMessage(selectedSession.id, 'student', question);
      const res = await fetch('http://localhost:8000/super-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lesson_id: lesson.id,
          topic: lesson.title,
          chat_history: [...messages, { sender: 'student', text: question }],
          question,
          mode,
        }),
      });
      if (!res.ok) throw new Error('Failed to get answer from super agent');
      const data = await res.json();
      setMessages((msgs) => [...msgs, {
        sender: 'agent',
        text: data.answer,
        type: data.type || 'explanation'
      }]);
      await addChatMessage(selectedSession.id, 'agent', data.answer);
    } catch (err) {
      setMessages((msgs) => [...msgs, {
        sender: 'agent',
        text: '[Super Agent unavailable. Please try again later.]',
        type: 'explanation'
      }]);
      setError('Super Agent unavailable.');
    } finally {
      setLoading(false);
    }
  };

  const getMessageStyle = (type?: string) => {
    switch (type) {
      case 'example':
        return 'bg-blue-50 text-blue-900 border border-blue-200';
      case 'hint':
        return 'bg-yellow-50 text-yellow-900 border border-yellow-200';
      case 'practice':
        return 'bg-green-50 text-green-900 border border-green-200';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex h-[500px] bg-white rounded-xl shadow-lg overflow-hidden">
      <ChatSidebar
        agentType="super"
        onSelectSession={setSelectedSession}
        selectedSessionId={selectedSession ? selectedSession.id : null}
      />
      <div className="flex-1 flex flex-col p-8 min-h-[500px]">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-gray-900">Super Agent Tutor</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setMode('explain')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                mode === 'explain' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Explain
            </button>
            <button
              onClick={() => setMode('example')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                mode === 'example' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Examples
            </button>
            <button
              onClick={() => setMode('practice')}
              className={`px-3 py-1 rounded-lg text-sm font-medium ${
                mode === 'practice' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Practice
            </button>
          </div>
        </div>
        <div className="text-sm text-gray-500 mb-2">
          Current topic: <span className="font-medium text-indigo-700">{lesson.title}</span>
        </div>
        <div className="flex-1 overflow-y-auto mb-4 space-y-3">
          {!selectedSession && (
            <div className="text-gray-400 text-center py-8">
              Select or start a chat from the sidebar.
            </div>
          )}
          {selectedSession && messages.length === 0 && (
            <div className="text-gray-400 text-center py-8">
              Ask any question about this lesson! The Super Agent can provide detailed explanations, examples, and practice problems.
            </div>
          )}
          {selectedSession && messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.sender === 'student' ? 'justify-end' : 'justify-start'}`}>
              <div className={`px-4 py-2 rounded-lg max-w-2xl ${msg.sender === 'student' ? 'bg-indigo-100 text-indigo-900' : getMessageStyle(msg.type)}`}>
                {msg.sender === 'agent' ? (
                  <div className="prose max-w-2xl"><ReactMarkdown>{msg.text}</ReactMarkdown></div>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="px-4 py-2 rounded-lg bg-gray-100 text-gray-400">Thinking...</div>
            </div>
          )}
          {error && (
            <div className="text-red-500 text-sm text-center mt-2">{error}</div>
          )}
        </div>
        <form onSubmit={sendMessage} className="flex space-x-2">
          <input
            type="text"
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-800 bg-gray-50"
            placeholder={`Ask for ${mode === 'explain' ? 'an explanation' : mode === 'example' ? 'examples' : 'practice problems'}...`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                if (!loading && input.trim()) {
                  const form = e.currentTarget.form;
                  if (form) form.requestSubmit();
                }
              }
            }}
            disabled={loading || !selectedSession}
          />
          <button
            type="submit"
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors duration-200"
            disabled={loading || !input.trim() || !selectedSession}
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
} 