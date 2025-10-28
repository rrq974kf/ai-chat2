'use client';

import { useState, useEffect, useRef } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Sidebar from '@/components/Sidebar';
import { Chat, Message } from '@/types/chat';

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 현재 채팅방의 메시지 가져오기
  const currentChat = chats.find(chat => chat.id === currentChatId);
  const messages = currentChat?.messages || [];

  // 채팅방 제목 생성 헬퍼
  const generateTitle = (firstMessage: string) => {
    const cleaned = firstMessage.trim();
    if (cleaned.length === 0) return '새 채팅';
    return cleaned.length > 30 ? cleaned.substring(0, 30) + '...' : cleaned;
  };

  // LocalStorage에서 채팅방 불러오기
  useEffect(() => {
    const savedChats = localStorage.getItem('ai-chat-rooms');
    const savedCurrentId = localStorage.getItem('ai-current-chat-id');
    
    if (savedChats) {
      try {
        const parsedChats = JSON.parse(savedChats);
        if (parsedChats.length > 0) {
          setChats(parsedChats);
          
          // 마지막 선택된 채팅방 또는 첫 번째 채팅방 선택
          if (savedCurrentId && parsedChats.some((c: Chat) => c.id === savedCurrentId)) {
            setCurrentChatId(savedCurrentId);
          } else {
            setCurrentChatId(parsedChats[0].id);
          }
          return;
        }
      } catch (e) {
        console.error('Failed to load chats:', e);
      }
    }
    
    // 채팅방이 없으면 새로 생성
    createNewChat();
  }, []);

  // 채팅방 변경 시 LocalStorage에 저장
  useEffect(() => {
    if (chats.length > 0) {
      localStorage.setItem('ai-chat-rooms', JSON.stringify(chats));
    }
  }, [chats]);

  // 현재 채팅방 ID 변경 시 저장
  useEffect(() => {
    if (currentChatId) {
      localStorage.setItem('ai-current-chat-id', currentChatId);
    }
  }, [currentChatId]);

  // 메시지 목록 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 새 채팅방 생성
  const createNewChat = () => {
    const newChat: Chat = {
      id: Date.now().toString(),
      title: '새 채팅',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setChats(prev => [newChat, ...prev]);
    setCurrentChatId(newChat.id);
    setSidebarOpen(false);
  };

  // 채팅방 전환
  const switchChat = (id: string) => {
    setCurrentChatId(id);
    setSidebarOpen(false);
    setError(null);
  };

  // 채팅방 삭제
  const deleteChat = (id: string) => {
    if (chats.length <= 1) {
      alert('마지막 채팅방은 삭제할 수 없습니다.');
      return;
    }

    const newChats = chats.filter(chat => chat.id !== id);
    setChats(newChats);

    // 삭제한 채팅방이 현재 채팅방이면 다른 채팅방으로 전환
    if (currentChatId === id) {
      setCurrentChatId(newChats[0].id);
    }
  };

  // 채팅방 제목 업데이트
  const updateChatTitle = (id: string, title: string) => {
    setChats(prev =>
      prev.map(chat =>
        chat.id === id ? { ...chat, title, updatedAt: Date.now() } : chat
      )
    );
  };

  // 현재 채팅방 메시지 업데이트
  const updateCurrentChatMessages = (newMessages: Message[]) => {
    if (!currentChatId) return;

    setChats(prev =>
      prev.map(chat => {
        if (chat.id === currentChatId) {
          // 첫 메시지가 추가되면 제목 업데이트
          const shouldUpdateTitle = chat.messages.length === 0 && newMessages.length > 0;
          return {
            ...chat,
            messages: newMessages,
            title: shouldUpdateTitle ? generateTitle(newMessages[0].content) : chat.title,
            updatedAt: Date.now(),
          };
        }
        return chat;
      })
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!input.trim() || isLoading || !currentChatId) return;

    const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY;
    if (!apiKey) {
      setError('API 키가 설정되지 않았습니다. .env.local 파일에 NEXT_PUBLIC_GEMINI_API_KEY를 설정해주세요.');
      return;
    }

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    updateCurrentChatMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-001' });

      // 채팅 기록을 Gemini API 형식으로 변환
      const history = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      const chat = model.startChat({ history });
      const result = await chat.sendMessageStream(userMessage.content);

      // 스트리밍 응답 처리
      let fullResponse = '';
      updateCurrentChatMessages([...newMessages, { role: 'assistant', content: '' }]);

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        
        updateCurrentChatMessages([
          ...newMessages,
          { role: 'assistant', content: fullResponse }
        ]);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : '메시지 전송 중 오류가 발생했습니다.');
      
      // 오류 발생 시 빈 assistant 메시지 제거
      const currentMessages = chats.find(c => c.id === currentChatId)?.messages || [];
      if (currentMessages[currentMessages.length - 1]?.content === '') {
        updateCurrentChatMessages(currentMessages.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const clearCurrentChat = () => {
    if (!currentChatId) return;
    updateCurrentChatMessages([]);
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Sidebar */}
      <Sidebar
        chats={chats}
        currentChatId={currentChatId}
        onSelectChat={switchChat}
        onCreateChat={createNewChat}
        onDeleteChat={deleteChat}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* 메인 채팅 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 px-4 py-4">
          <div className="max-w-4xl mx-auto flex justify-between items-center">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-800 dark:text-white truncate">
              {currentChat?.title || 'AI Chat Assistant'}
            </h1>
            {messages.length > 0 && (
              <button
                onClick={clearCurrentChat}
                className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors whitespace-nowrap"
              >
                대화 초기화
              </button>
            )}
          </div>
        </header>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 dark:text-gray-400 mt-20">
              <p className="text-lg mb-2">안녕하세요! 무엇을 도와드릴까요?</p>
              <p className="text-sm">메시지를 입력하여 대화를 시작하세요.</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-800 text-gray-800 dark:text-white shadow-md'
                  }`}
                >
                  {message.role === 'user' ? (
                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                  ) : (
                    <MarkdownRenderer content={message.content} />
                  )}
                </div>
              </div>
            ))
          )}
          {isLoading && messages[messages.length - 1]?.content === '' && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 rounded-2xl px-4 py-3 shadow-md">
                <Loader2 className="w-5 h-5 animate-spin text-gray-600 dark:text-gray-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="px-4 pb-2">
          <div className="max-w-4xl mx-auto bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex gap-2 items-end">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)"
              disabled={isLoading}
              rows={1}
              className="flex-1 px-4 py-3 rounded-2xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed resize-none min-h-[52px] max-h-[200px]"
              style={{ height: 'auto' }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = 'auto';
                target.style.height = target.scrollHeight + 'px';
              }}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 rounded-full bg-blue-600 text-white font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2 h-[52px]"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
}
