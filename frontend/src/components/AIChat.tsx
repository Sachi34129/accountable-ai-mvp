import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, ChatMessage } from '../types';
import { Send, Paperclip, Bot, User, Sparkles } from 'lucide-react';
import { generateAICAResponse } from '../services/geminiService';

interface AIChatProps {
  userProfile: UserProfile;
}

const AIChat: React.FC<AIChatProps> = ({ userProfile }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'model',
      text: `Hello ${userProfile.name}. I am your AI Chartered Accountant. I can help you with tax planning, drafting notice replies, or understanding your financial health. What would you like to discuss today?`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Prepare history for API
    const history = messages.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    }));

    try {
      const responseText = await generateAICAResponse(userMsg.text, history);

      const aiMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: responseText,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (error) {
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: "I apologize, but I'm having trouble connecting to my knowledge base right now. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Suggestion chips
  const suggestions = [
    'How can I save tax under Old Regime?',
    'Explain Section 80C limits',
    'Draft a reply to a mismatch notice',
    'Analyze my GST liability for this month',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
            <Bot size={24} />
          </div>
          <div>
            <h2 className="font-bold text-slate-900">AI CA Assistant</h2>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <span className="text-xs text-slate-500 font-medium">Online & Ready</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="text-xs font-medium px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
            Clear Chat
          </button>
          <button className="text-xs font-medium px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors">
            Export Transcript
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/30">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`flex gap-4 max-w-3xl ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center mt-1 ${
                  msg.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-blue-100 text-blue-600'
                }`}
              >
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>

              {/* Bubble */}
              <div
                className={`rounded-2xl p-4 shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-sm'
                    : 'bg-white text-slate-800 border border-slate-100 rounded-tl-sm'
                }`}
              >
                <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed">{msg.text}</div>
                <div
                  className={`text-[10px] mt-2 opacity-70 ${
                    msg.role === 'user' ? 'text-blue-100' : 'text-slate-400'
                  }`}
                >
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-4 max-w-3xl">
              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mt-1">
                <Bot size={16} />
              </div>
              <div className="bg-white p-4 rounded-2xl rounded-tl-sm border border-slate-100 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: '150ms' }}
                ></div>
                <div
                  className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                  style={{ animationDelay: '300ms' }}
                ></div>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white border-t border-slate-200">
        {messages.length < 3 && (
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2 scrollbar-hide">
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(s);
                }}
                className="whitespace-nowrap px-3 py-1.5 rounded-full border border-blue-100 bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100 transition-colors flex items-center gap-1"
              >
                <Sparkles size={12} /> {s}
              </button>
            ))}
          </div>
        )}

        <div className="relative flex items-end gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400 transition-all">
          <button className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Paperclip size={20} />
          </button>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about taxes, compliance, or finance..."
            className="w-full bg-transparent border-none focus:ring-0 resize-none max-h-32 py-2 text-sm text-slate-800 placeholder:text-slate-400"
            rows={1}
            style={{ minHeight: '40px' }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className={`p-2 rounded-lg transition-all ${
              input.trim() && !isTyping
                ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
        <div className="text-center mt-2">
          <p className="text-[10px] text-slate-400">
            AI can make mistakes. Verify important financial decisions with a human expert.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIChat;


