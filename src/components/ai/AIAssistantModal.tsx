import React, { useState, useRef, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import { Sparkles, Send, Bot, User, Church, Loader2 } from 'lucide-react';

interface AIAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAssistantModal: React.FC<AIAssistantModalProps> = ({
  isOpen,
  onClose
}) => {
  const { firebaseUser, member, role } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: `Peace be with you! I am your FaithTrack Church Assistant. You can ask me about upcoming church gatherings, your attendance history, or church departments.`
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const memberSuggestions = [
    'When is the next Faith Clinic?',
    'What is my attendance percentage?',
    'How many times have I attended Digging Deep?',
    'What department am I in?'
  ];

  const adminSuggestions = [
    'How many people attended Sunday Service this month?',
    'Show me attendance for Faith Clinic',
    'How many active members do we have?',
    'When is the next Sunday Service?'
  ];

  const suggestions = role === 'admin' || role === 'super_admin' ? adminSuggestions : memberSuggestions;

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = (textToSend || input).trim();
    if (!queryText || loading) return;

    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: queryText }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await fetch('/api/ai/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: firebaseUser?.uid,
          prompt: queryText,
          chatHistory: newMessages.slice(1, -1)
        })
      });

      const data = await res.json();
      if (res.ok && data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: data.reply || 'I apologize, I could not retrieve that right now. Please try again.' }
        ]);
      }
    } catch (e) {
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Connection issue. Please check your network and try again.' }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="FaithTrack Church AI Assistant"
      description="Powered by Gemini with verified church records"
      maxWidth="lg"
    >
      <div className="flex flex-col h-[520px]">
        {/* Chat message list */}
        <div className="flex-1 overflow-y-auto space-y-3 p-1">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-emerald-600 text-white rounded-br-xs'
                    : 'bg-slate-100 text-slate-800 rounded-bl-xs border border-slate-200/60'
                }`}
              >
                {m.content}
              </div>

              {m.role === 'user' && (
                <div className="w-8 h-8 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold">
                  {member?.firstName ? member.firstName[0] : 'U'}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-start gap-2.5 justify-start">
              <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-slate-100 rounded-2xl p-3 text-xs text-slate-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                <span>Checking church database...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt suggestions */}
        <div className="py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar border-t border-slate-100 mt-2">
          {suggestions.map((s, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(s)}
              className="text-[11px] font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-full shrink-0 border border-emerald-200 transition-colors text-left"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="pt-2 flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about activities, attendance, or ministries..."
            className="flex-1 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500"
            disabled={loading}
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            loading={loading}
            disabled={!input.trim()}
            className="shrink-0 rounded-2xl"
          >
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Modal>
  );
};
