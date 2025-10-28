'use client';

import { useState, useRef } from 'react';
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

  const handleAddServer = () => {
    if (!formData.name) {
      alert('서버 이름을 입력해주세요.');
      return;
    }

    if (formData.transport === 'stdio' && !formData.command) {
      alert('STDIO Transport는 command가 필요합니다.');
      return;
    }

    if (
      (formData.transport === 'sse' || formData.transport === 'streamable-http') &&
      !formData.url
    ) {
      alert('SSE/HTTP Transport는 URL이 필요합니다.');
      return;
    }

    addServer({
      name: formData.name,
      description: formData.description,
      transport: formData.transport,
      command: formData.command || undefined,
      args: formData.args ? formData.args.split(' ') : undefined,
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

  const tabs = [
    { id: 'servers', label: '서버 관리', icon: Server, count: servers.length },
    {
      id: 'tools',
      label: '도구',
      icon: Wrench,
      count: Array.from(toolsCache.values()).reduce((sum, tools) => sum + tools.length, 0),
    },
    {
      id: 'prompts',
      label: '프롬프트',
      icon: MessageSquare,
      count: Array.from(promptsCache.values()).reduce(
        (sum, prompts) => sum + prompts.length,
        0
      ),
    },
    {
      id: 'resources',
      label: '리소스',
      icon: FolderOpen,
      count: Array.from(resourcesCache.values()).reduce(
        (sum, resources) => sum + resources.length,
        0
      ),
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
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                서버 추가
              </button>
            </div>

            {/* 서버 추가 폼 */}
            {showAddForm && (
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  새 MCP 서버 추가
                </h3>
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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Command *
                        </label>
                        <input
                          type="text"
                          value={formData.command}
                          onChange={(e) =>
                            setFormData({ ...formData, command: e.target.value })
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="node"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Arguments
                        </label>
                        <input
                          type="text"
                          value={formData.args}
                          onChange={(e) => setFormData({ ...formData, args: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          placeholder="server.js --port 3000"
                        />
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
                    "서버 추가" 버튼을 클릭하여 시작하세요.
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
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              사용 가능한 도구
            </h2>
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
            ) : (
              <div className="space-y-3">
                {connectedServers.map((server) => {
                  const tools = toolsCache.get(server.id) || [];
                  return (
                    <div key={server.id}>
                      {tools.length > 0 && (
                        <div className="space-y-2">
                          {tools.map((tool) => (
                            <ToolExecutor
                              key={tool.name}
                              tool={tool}
                              serverId={server.id}
                              serverName={server.name}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 프롬프트 탭 */}
        {activeTab === 'prompts' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              사용 가능한 프롬프트
            </h2>
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
            ) : (
              <div className="space-y-3">
                {connectedServers.map((server) => {
                  const prompts = promptsCache.get(server.id) || [];
                  return (
                    <div key={server.id}>
                      {prompts.length > 0 && (
                        <div className="space-y-2">
                          {prompts.map((prompt) => (
                            <PromptViewer
                              key={prompt.name}
                              prompt={prompt}
                              serverId={server.id}
                              serverName={server.name}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 리소스 탭 */}
        {activeTab === 'resources' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              사용 가능한 리소스
            </h2>
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
            ) : (
              <div className="space-y-3">
                {connectedServers.map((server) => {
                  const resources = resourcesCache.get(server.id) || [];
                  return (
                    <div key={server.id}>
                      {resources.length > 0 && (
                        <div className="space-y-2">
                          {resources.map((resource) => (
                            <ResourceViewer
                              key={resource.uri}
                              resource={resource}
                              serverId={server.id}
                              serverName={server.name}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

