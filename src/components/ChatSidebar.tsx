import { useEffect, useState } from 'react';
import { getChatSessions, createChatSession } from '../lib/supabase';

interface ChatSidebarProps {
  agentType: string;
  onSelectSession: (session: any) => void;
  selectedSessionId: string | null;
}

export default function ChatSidebar({ agentType, onSelectSession, selectedSessionId }: ChatSidebarProps) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchSessions() {
      setLoading(true);
      try {
        const data = await getChatSessions(agentType);
        setSessions(data);
      } catch (e) {
        setError('Failed to load chat history.');
      } finally {
        setLoading(false);
      }
    }
    fetchSessions();
  }, [agentType]);

  const handleNewChat = async () => {
    const title = `New Chat (${new Date().toLocaleString()})`;
    const session = await createChatSession(agentType, title);
    setSessions([session, ...sessions]);
    onSelectSession(session);
  };

  return (
    <div className="w-64 bg-gray-50 border-r border-gray-200 h-full flex flex-col">
      <div className="p-4 border-b border-gray-200 flex items-center justify-between">
        <span className="font-semibold text-gray-800">Chats</span>
        <button
          className="bg-indigo-600 text-white px-2 py-1 rounded hover:bg-indigo-700 text-xs"
          onClick={handleNewChat}
        >
          + New Chat
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-gray-400 p-4">Loading...</div>
        ) : error ? (
          <div className="text-red-500 p-4">{error}</div>
        ) : sessions.length === 0 ? (
          <div className="text-gray-400 p-4">No chats yet.</div>
        ) : (
          <ul>
            {sessions.map((session) => (
              <li
                key={session.id}
                className={`px-4 py-3 cursor-pointer border-b border-gray-100 hover:bg-indigo-50 ${selectedSessionId === session.id ? 'bg-indigo-100 font-bold' : ''}`}
                onClick={() => onSelectSession(session)}
              >
                <div className="truncate text-sm">{session.title || 'Untitled Chat'}</div>
                <div className="text-xs text-gray-400">{new Date(session.created_at).toLocaleString()}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
} 