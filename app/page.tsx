'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Send, Loader2, AlertCircle } from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';
import Sidebar from '@/components/Sidebar';
import { Chat, Message } from '@/types/chat';
import { useMCP } from '@/lib/MCPContext';

export default function Home() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toolsCache, connections } = useMCP();

  // 현재 채팅방의 메시지 가져오기
  const currentChat = chats.find(chat => chat.id === currentChatId);
  const messages = useMemo(() => currentChat?.messages || [], [currentChat?.messages]);

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

  // 채팅방 제목 업데이트 (미사용 - 향후 사용 예정)
  // const updateChatTitle = (id: string, title: string) => {
  //   setChats(prev =>
  //     prev.map(chat =>
  //       chat.id === id ? { ...chat, title, updatedAt: Date.now() } : chat
  //     )
  //   );
  // };

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
      handleSubmit(e as unknown as React.FormEvent);
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
    const thinkingMessage: Message = { role: 'assistant', content: '...' };
    const newMessages = [...messages, userMessage, thinkingMessage];
    updateCurrentChatMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      
      // 연결된 MCP 서버의 도구 수집
      const connectedServerIds = connections
        .filter((c) => c.connected)
        .map((c) => c.serverId);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mcpTools: any[] = [];
      for (const serverId of connectedServerIds) {
        const tools = toolsCache.get(serverId) || [];
        for (const tool of tools) {
          mcpTools.push({
            name: tool.name,
            description: tool.description || tool.name,
            parameters: tool.inputSchema,
          });
        }
      }

      // 채팅 기록을 Gemini API 형식으로 변환
      const history = messages.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: msg.content }],
      }));

      // 모델 목록 (폴백 순서)
      const modelNames = ['gemini-2.0-flash-exp', 'gemini-1.5-flash', 'gemini-1.5-pro'];
      let result;

      // 모델을 순서대로 시도
      for (let i = 0; i < modelNames.length; i++) {
        const modelName = modelNames[i];
        try {
          console.log(`🤖 AI 모델 시도 (${i + 1}/${modelNames.length}): ${modelName}`);
          
          // Gemini 모델 설정 (도구가 있으면 함께 전달)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const modelConfig: any = { model: modelName };
          
          if (mcpTools.length > 0) {
            modelConfig.tools = [{
              functionDeclarations: mcpTools,
            }];
          }

          const model = genAI.getGenerativeModel(modelConfig);
          const chat = model.startChat({ history });
          result = await chat.sendMessage(userMessage.content);
          
          console.log(`✅ AI 모델 성공: ${modelName}`);
          break; // 성공하면 루프 종료
        } catch (modelError: unknown) {
          const errorMsg = modelError instanceof Error ? modelError.message : '';
          console.error(`❌ AI 모델 실패 (${i + 1}/${modelNames.length}): ${modelName}`, errorMsg);
          
          // 503 오류가 아니거나 마지막 모델이면 즉시 throw
          const isOverloadError = errorMsg.includes('503') || errorMsg.includes('overloaded');
          const isLastModel = i === modelNames.length - 1;
          
          if (!isOverloadError || isLastModel) {
            if (isLastModel && isOverloadError) {
              throw new Error('모든 AI 모델이 과부하 상태입니다. 잠시 후 다시 시도해주세요.');
            }
            throw modelError;
          }
          
          // 다음 모델 시도 전 짧은 대기
          console.log(`⏳ 1초 후 다음 모델 시도...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      // 모든 모델이 실패한 경우 (이론적으로 도달하지 않음)
      if (!result) {
        throw new Error('AI 응답을 생성할 수 없습니다. 다시 시도해주세요.');
      }

      // Function call 확인
      const response = result.response;
      const functionCalls = response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        // Function call이 있는 경우
        let toolResultsText = '';

        for (const fc of functionCalls) {
          try {
            // 도구가 속한 서버 찾기
            let targetServerId = '';
            for (const serverId of connectedServerIds) {
              const tools = toolsCache.get(serverId) || [];
              if (tools.some((t) => t.name === fc.name)) {
                targetServerId = serverId;
                break;
              }
            }

            if (!targetServerId) {
              toolResultsText += `\n\n❌ **도구 실행 실패**\n요청하신 "${fc.name}" 도구를 찾을 수 없습니다.\n`;
              continue;
            }

            // 도구 호출 정보 로그
            console.log('🔧 MCP Tool Call:', {
              toolName: fc.name,
              arguments: fc.args,
              serverId: targetServerId
            });

            // MCP 도구 실행
            const executeRes = await fetch('/api/mcp/tools/execute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                serverId: targetServerId,
                toolName: fc.name,
                arguments: fc.args,
              }),
            });

            const executeData = await executeRes.json();

            // 도구 실행 결과 로그
            console.log('🔧 MCP Tool Result:', executeData);

            if (!executeRes.ok || executeData.isError) {
              toolResultsText += `\n\n❌ **${fc.name} 실행 실패**\n${executeData.error || '알 수 없는 오류가 발생했습니다.'}\n`;
            } else {
              // 도구 실행 결과를 읽기 쉬운 텍스트로 변환
              let resultText = '';
              
              if (executeData.content && Array.isArray(executeData.content)) {
                // content 배열 처리
                for (const item of executeData.content) {
                  if (item.type === 'text' && item.text) {
                    // 텍스트 콘텐츠를 그대로 사용 (JSON 파싱 시도하지 않음)
                    resultText += item.text;
                  } else if (item.text) {
                    resultText += item.text;
                  } else {
                    // 다른 타입의 데이터는 JSON으로 표시하되 읽기 쉽게
                    const jsonData = typeof item === 'string' ? item : JSON.stringify(item, null, 2);
                    resultText += jsonData;
                  }
                }
              } else {
                // content가 없으면 전체 결과를 표시
                resultText = typeof executeData === 'string' ? executeData : JSON.stringify(executeData, null, 2);
              }
              
              // 결과 텍스트 정리 (앞뒤 공백 제거)
              resultText = resultText.trim();
              
              // 도구 이름 없이 결과만 자연스럽게 표시
              toolResultsText += `\n\n${resultText}\n`;
            }
          } catch (err) {
            toolResultsText += `\n\n❌ **${fc.name} 실행 중 오류 발생**\n${err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.'}\n`;
          }
        }

        // 도구 실행 결과를 포함한 최종 응답
        const finalText = (response.text() || '') + toolResultsText;
        // thinking 메시지를 실제 응답으로 교체
        updateCurrentChatMessages([
          ...newMessages.slice(0, -1),
          { role: 'assistant', content: finalText },
        ]);
      } else {
        // 일반 텍스트 응답
        const responseText = response.text();
        // thinking 메시지를 실제 응답으로 교체
        updateCurrentChatMessages([
          ...newMessages.slice(0, -1),
          { role: 'assistant', content: responseText },
        ]);
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : '메시지 전송 중 오류가 발생했습니다.');
      
      // 오류 발생 시 thinking 메시지 제거
      updateCurrentChatMessages(newMessages.slice(0, -1));
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
                  ) : message.content === '...' ? (
                    <div className="flex items-center gap-1 text-2xl">
                      <span className="animate-pulse" style={{ animationDelay: '0ms' }}>.</span>
                      <span className="animate-pulse" style={{ animationDelay: '200ms' }}>.</span>
                      <span className="animate-pulse" style={{ animationDelay: '400ms' }}>.</span>
                    </div>
                  ) : (
                    <MarkdownRenderer content={message.content} />
                  )}
                </div>
              </div>
            ))
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
