'use client';

import { useState, useRef, useEffect } from 'react';
import { useMCP } from '@/lib/MCPContext';
import ServerCard from '@/components/mcp/ServerCard';
import ToolExecutor from '@/components/mcp/ToolExecutor';
import PromptViewer from '@/components/mcp/PromptViewer';
import ResourceViewer from '@/components/mcp/ResourceViewer';
import {
  Plus,
  Download,
  Upload,
  Server,
  Wrench,
  MessageSquare,
  FolderOpen,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import type { TransportType } from '@/types/mcp';

type TabType = 'servers' | 'tools' | 'prompts' | 'resources';

export default function MCPManagementPage() {
  const {
    servers,
    connections,
    addServer,
    removeServer,
    connectServer,
    disconnectServer,
    getConnectionStatus,
    exportConfig,
    importConfig,
    toolsCache,
    promptsCache,
    resourcesCache,
  } = useMCP();

  const [activeTab, setActiveTab] = useState<TabType>('servers');
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 서버 추가 폼 상태
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    transport: 'sse' as TransportType,
    command: '',
    args: '',
    url: '',
  });
  const [validationError, setValidationError] = useState('');

  // 프리셋 서버 설정
  const loadPreset = (preset: 'time' | 'greeting') => {
    if (preset === 'time') {
      setFormData({
        name: 'Time Server',
        description: '현재 시간을 제공하는 MCP 서버',
        transport: 'stdio',
        command: 'npx',
        args: '-y @modelcontextprotocol/server-time',
        url: '',
      });
    } else if (preset === 'greeting') {
      setFormData({
        name: 'Greeting Server',
        description: '인사 메시지를 생성하는 MCP 서버',
        transport: 'stdio',
        command: 'npx',
        args: '-y @modelcontextprotocol/server-greeting',
        url: '',
      });
    }
    setValidationError('');
    setShowAddForm(true);
  };

  // STDIO Command 검증
  const validateStdioCommand = (command: string, args: string): string | null => {
    if (!command) return null;

    // 잘못된 패턴 감지
    const invalidPatterns = [
      { pattern: /^time\s+/i, message: 'Command에 "time"을 입력하지 마세요. "npx"를 사용하세요.' },
      { pattern: /^uvx\s+mcp-server/i, message: 'Command는 "uvx"만 입력하고, Args에 "mcp-server-time"을 입력하세요.' },
      { pattern: /^npx\s+-y\s+@modelcontextprotocol/i, message: 'Command는 "npx"만 입력하고, Args에 나머지를 입력하세요.' },
      { pattern: /mcp-server-\w+/i, message: 'Command에 서버 이름을 포함하지 마세요. Args 필드에 입력하세요.' },
    ];

    for (const { pattern, message } of invalidPatterns) {
      if (pattern.test(command)) {
        return message;
      }
    }

    // 전체 명령어가 Command에 입력된 경우
    if (command.includes(' ') && !args) {
      return 'Command와 Args를 분리해서 입력해주세요. 예: Command="npx", Args="-y @modelcontextprotocol/server-time"';
    }

    return null;
  };

  const handleAddServer = () => {
    setValidationError('');

    if (!formData.name) {
      setValidationError('서버 이름을 입력해주세요.');
      return;
    }

    if (formData.transport === 'stdio') {
      if (!formData.command) {
        setValidationError('STDIO Transport는 command가 필요합니다.');
        return;
      }

      // Command 검증
      const validationError = validateStdioCommand(formData.command, formData.args);
      if (validationError) {
        setValidationError(validationError);
        return;
      }
    }

    if (
      (formData.transport === 'sse' || formData.transport === 'streamable-http') &&
      !formData.url
    ) {
      setValidationError('SSE/HTTP Transport는 URL이 필요합니다.');
      return;
    }

    addServer({
      name: formData.name,
      description: formData.description,
      transport: formData.transport,
      command: formData.command || undefined,
      args: formData.args ? formData.args.split(' ').filter(Boolean) : undefined,
      url: formData.url || undefined,
    });

    // 폼 리셋
    setFormData({
      name: '',
      description: '',
      transport: 'sse',
      command: '',
      args: '',
      url: '',
    });
    setValidationError('');
    setShowAddForm(false);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await importConfig(file);
        alert('설정을 성공적으로 가져왔습니다.');
      } catch (error) {
        alert('설정 가져오기 실패: ' + (error instanceof Error ? error.message : ''));
      }
    }
    // input 초기화
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const connectedServers = servers.filter((s) =>
    connections.find((c) => c.serverId === s.id && c.connected)
  );

  // 연결된 서버가 있고 선택된 서버가 없으면 첫 번째 서버를 자동 선택
  useEffect(() => {
    if (connectedServers.length > 0 && !selectedServerId) {
      setSelectedServerId(connectedServers[0].id);
    }
    // 선택된 서버가 연결 해제되면 선택 해제
    if (selectedServerId && !connectedServers.find(s => s.id === selectedServerId)) {
      setSelectedServerId(connectedServers.length > 0 ? connectedServers[0].id : null);
    }
  }, [connectedServers, selectedServerId]);

  const tabs = [
    { id: 'servers', label: '서버 관리', icon: Server, count: servers.length },
    {
      id: 'tools',
      label: '도구',
      icon: Wrench,
      count: selectedServerId ? (toolsCache.get(selectedServerId) || []).length : 0,
    },
    {
      id: 'prompts',
      label: '프롬프트',
      icon: MessageSquare,
      count: selectedServerId ? (promptsCache.get(selectedServerId) || []).length : 0,
    },
    {
      id: 'resources',
      label: '리소스',
      icon: FolderOpen,
      count: selectedServerId ? (resourcesCache.get(selectedServerId) || []).length : 0,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-800 dark:text-white">
                  MCP 서버 관리
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Model Context Protocol 서버를 관리하고 테스트하세요
                </p>
              </div>
            </div>
            {activeTab === 'servers' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  가져오기
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  className="hidden"
                />
                <button
                  onClick={exportConfig}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg transition-colors"
                >
                  <Download className="w-4 h-4" />
                  내보내기
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  {tab.count > 0 && (
                    <span
                      className={`px-2 py-0.5 text-xs rounded-full ${
                        activeTab === tab.id
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                      }`}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* 서버 관리 탭 */}
        {activeTab === 'servers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  등록된 서버
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  연결됨: {connectedServers.length} / {servers.length}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => loadPreset('time')}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Time Server
                </button>
                <button
                  onClick={() => loadPreset('greeting')}
                  className="flex items-center gap-2 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Greeting Server
                </button>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  사용자 정의
                </button>
              </div>
            </div>

            {/* 서버 추가 폼 */}
            {showAddForm && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  새 MCP 서버 추가
                </h3>
                
                {/* 검증 에러 표시 */}
                {validationError && (
                  <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      ⚠️ {validationError}
                    </p>
                  </div>
                )}

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      서버 이름 *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="My MCP Server"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      설명
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="서버 설명"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Transport 타입 *
                    </label>
                    <select
                      value={formData.transport}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          transport: e.target.value as TransportType,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="sse">SSE (Server-Sent Events)</option>
                      <option value="streamable-http">Streamable HTTP</option>
                      <option value="stdio">STDIO (서버 환경만 지원)</option>
                    </select>
                  </div>

                  {formData.transport === 'stdio' ? (
                    <>
                      {/* STDIO 안내 */}
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                        <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200 mb-2">
                          💡 STDIO Transport 설정 가이드
                        </h4>
                        <div className="space-y-2 text-xs text-blue-800 dark:text-blue-300">
                          <p><strong>Command:</strong> 실행할 명령어만 입력 (예: npx, uvx, node)</p>
                          <p><strong>Args:</strong> 명령어의 인자들을 공백으로 구분하여 입력</p>
                          <div className="mt-2 p-2 bg-white dark:bg-gray-800 rounded border border-blue-200 dark:border-blue-700">
                            <p className="font-mono text-green-700 dark:text-green-400">
                              ✅ Command: <span className="font-bold">npx</span>
                            </p>
                            <p className="font-mono text-green-700 dark:text-green-400">
                              ✅ Args: <span className="font-bold">-y @modelcontextprotocol/server-time</span>
                            </p>
                            <p className="font-mono text-red-700 dark:text-red-400 mt-2">
                              ❌ Command: <span className="line-through">npx -y @modelcontextprotocol/server-time</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Command * <span className="text-xs text-gray-500">(실행 파일만)</span>
                        </label>
                        <input
                          type="text"
                          value={formData.command}
                          onChange={(e) =>
                            setFormData({ ...formData, command: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          placeholder="npx"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          Windows에서는 npx 권장 (Node.js와 함께 설치됨)
                        </p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Arguments <span className="text-xs text-gray-500">(공백으로 구분)</span>
                        </label>
                        <input
                          type="text"
                          value={formData.args}
                          onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                          placeholder="-y @modelcontextprotocol/server-time"
                        />
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          명령어의 모든 인자를 공백으로 구분하여 입력
                        </p>
                      </div>
                    </>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        URL *
                      </label>
                      <input
                        type="url"
                        value={formData.url}
                        onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="http://localhost:3000/mcp"
                      />
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <button
                      onClick={handleAddServer}
                      className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                      추가
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors"
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 서버 목록 */}
            <div className="space-y-3">
              {servers.length === 0 ? (
                <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                  <Server className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">
                    등록된 MCP 서버가 없습니다.
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                    &quot;서버 추가&quot; 버튼을 클릭하여 시작하세요.
                  </p>
                </div>
              ) : (
                servers.map((server) => (
                  <ServerCard
                    key={server.id}
                    server={server}
                    status={getConnectionStatus(server.id)}
                    onConnect={connectServer}
                    onDisconnect={disconnectServer}
                    onDelete={removeServer}
                  />
                ))
              )}
            </div>
          </div>
        )}

        {/* 도구 탭 */}
        {activeTab === 'tools' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                사용 가능한 도구
              </h2>
              {connectedServers.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    서버 선택:
                  </label>
                  <select
                    value={selectedServerId || ''}
                    onChange={(e) => setSelectedServerId(e.target.value || null)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">서버를 선택하세요</option>
                    {connectedServers.map((server) => (
                      <option key={server.id} value={server.id}>
                        {server.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {connectedServers.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <Wrench className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  연결된 서버가 없습니다.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  먼저 서버를 연결해주세요.
                </p>
              </div>
            ) : !selectedServerId ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <Wrench className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  서버를 선택해주세요.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  위의 드롭다운에서 서버를 선택하면 사용 가능한 도구가 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const tools = toolsCache.get(selectedServerId) || [];
                  const server = connectedServers.find(s => s.id === selectedServerId);
                  return tools.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <Wrench className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        이 서버에는 도구가 없습니다.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {tools.map((tool) => (
                        <ToolExecutor
                          key={tool.name}
                          tool={tool}
                          serverId={selectedServerId}
                          serverName={server?.name || ''}
                        />
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* 프롬프트 탭 */}
        {activeTab === 'prompts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                사용 가능한 프롬프트
              </h2>
              {connectedServers.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    서버 선택:
                  </label>
                  <select
                    value={selectedServerId || ''}
                    onChange={(e) => setSelectedServerId(e.target.value || null)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">서버를 선택하세요</option>
                    {connectedServers.map((server) => (
                      <option key={server.id} value={server.id}>
                        {server.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {connectedServers.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  연결된 서버가 없습니다.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  먼저 서버를 연결해주세요.
                </p>
              </div>
            ) : !selectedServerId ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  서버를 선택해주세요.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  위의 드롭다운에서 서버를 선택하면 사용 가능한 프롬프트가 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const prompts = promptsCache.get(selectedServerId) || [];
                  const server = connectedServers.find(s => s.id === selectedServerId);
                  return prompts.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <MessageSquare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        이 서버에는 프롬프트가 없습니다.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {prompts.map((prompt) => (
                        <PromptViewer
                          key={prompt.name}
                          prompt={prompt}
                          serverId={selectedServerId}
                          serverName={server?.name || ''}
                        />
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* 리소스 탭 */}
        {activeTab === 'resources' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                사용 가능한 리소스
              </h2>
              {connectedServers.length > 0 && (
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    서버 선택:
                  </label>
                  <select
                    value={selectedServerId || ''}
                    onChange={(e) => setSelectedServerId(e.target.value || null)}
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">서버를 선택하세요</option>
                    {connectedServers.map((server) => (
                      <option key={server.id} value={server.id}>
                        {server.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            {connectedServers.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <FolderOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  연결된 서버가 없습니다.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  먼저 서버를 연결해주세요.
                </p>
              </div>
            ) : !selectedServerId ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <FolderOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  서버를 선택해주세요.
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
                  위의 드롭다운에서 서버를 선택하면 사용 가능한 리소스가 표시됩니다.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {(() => {
                  const resources = resourcesCache.get(selectedServerId) || [];
                  const server = connectedServers.find(s => s.id === selectedServerId);
                  return resources.length === 0 ? (
                    <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <FolderOpen className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600 dark:text-gray-400">
                        이 서버에는 리소스가 없습니다.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {resources.map((resource) => (
                        <ResourceViewer
                          key={resource.uri}
                          resource={resource}
                          serverId={selectedServerId}
                          serverName={server?.name || ''}
                        />
                      ))}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

