# AI Chat Assistant with MCP

Google Gemini API와 Model Context Protocol(MCP)을 활용한 확장 가능한 AI 채팅 애플리케이션입니다.

## 주요 기능

### 🤖 AI 채팅
- Google Gemini 2.0 Flash 모델 연동
- 실시간 응답
- 마크다운 렌더링 (코드 하이라이팅 포함)
- 코드 블록 복사 버튼
- 멀티 채팅방 지원 (사이드바에서 전환 가능)
- LocalStorage를 통한 모든 채팅방 내역 저장
- 각 채팅방의 독립적인 대화 맥락 유지

### 🔌 MCP (Model Context Protocol) 통합
- **MCP 서버 관리**: 다중 MCP 서버 등록 및 관리
- **Transport 지원**: STDIO, SSE, Streamable HTTP
- **도구 실행**: MCP 서버의 도구를 테스트하고 실행
- **프롬프트 관리**: MCP 프롬프트 조회 및 사용
- **리소스 접근**: MCP 리소스 읽기 및 활용
- **AI Function Calling**: Gemini가 자동으로 MCP 도구를 호출하여 작업 수행
- **설정 관리**: MCP 서버 설정 Import/Export

### 🎨 UI/UX
- 다크모드 지원
- 반응형 디자인 (모바일 사이드바 오버레이)
- 직관적인 탭 기반 MCP 관리 UI

## 시작하기

### 1. API 키 설정

먼저 Google AI Studio에서 API 키를 발급받으세요:
- [https://aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)

`.env.example` 파일을 복사하여 `.env.local` 파일을 생성하고, API 키를 입력하세요:

```bash
cp .env.example .env.local
```

`.env.local` 파일을 열어 다음과 같이 수정:

```env
NEXT_PUBLIC_GEMINI_API_KEY=your_actual_api_key_here
```

### 2. 개발 서버 실행

```bash
pnpm dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 사용 방법

### 채팅방 관리
- **새 채팅 생성**: 좌측 사이드바의 "새 채팅" 버튼 클릭
- **채팅방 전환**: 사이드바에서 원하는 채팅방 선택
- **채팅방 삭제**: 채팅방에 마우스를 올리고 삭제 버튼 클릭
- **모바일**: 좌측 상단 햄버거 메뉴로 사이드바 토글

### MCP 서버 관리
1. **서버 등록**:
   - 사이드바에서 "MCP 서버" 버튼 클릭
   - "서버 추가" 버튼으로 새 MCP 서버 추가
   - Transport 타입 선택 (SSE, HTTP, STDIO)
   - URL 또는 Command 입력

2. **서버 연결**:
   - 등록된 서버 카드에서 연결 버튼 클릭
   - 연결 성공 시 도구/프롬프트/리소스 자동 로드

3. **도구 사용**:
   - "도구" 탭에서 연결된 서버의 도구 확인
   - 파라미터 입력 후 "Execute" 버튼으로 테스트
   - AI 채팅에서 자동으로 도구 호출 가능

4. **설정 백업**:
   - "내보내기" 버튼으로 서버 설정 JSON 다운로드
   - "가져오기" 버튼으로 설정 복원

### AI Function Calling
- MCP 서버가 연결되면 AI가 자동으로 사용 가능한 도구를 인식
- 대화 중 필요시 AI가 자동으로 MCP 도구를 호출
- 도구 실행 결과가 응답에 포함됨

### 메시지 전송
- **Enter**: 메시지 전송
- **Shift + Enter**: 줄바꿈
- 각 채팅방은 독립적인 대화 맥락을 유지합니다

### 자동 기능
- 첫 메시지를 기반으로 채팅방 제목이 자동 생성됩니다
- 모든 채팅 내역은 LocalStorage에 자동 저장됩니다
- 마지막으로 사용한 채팅방이 자동으로 선택됩니다
- MCP 서버 설정도 LocalStorage에 저장됩니다

## 기술 스택

- **프레임워크**: Next.js 15.5.6 (App Router)
- **UI**: React 19, Tailwind CSS
- **AI SDK**: @google/generative-ai
- **MCP SDK**: @modelcontextprotocol/sdk
- **마크다운**: react-markdown, remark-gfm
- **코드 하이라이팅**: react-syntax-highlighter
- **아이콘**: lucide-react
- **언어**: TypeScript
- **상태 관리**: React Context API

## 아키텍처

### MCP 통합 구조
```
┌─────────────────┐
│   Chat UI       │
│  (app/page.tsx) │
└────────┬────────┘
         │
         ├─> MCPContext (전역 상태)
         │
         ├─> API Routes (/api/mcp/*)
         │   ├─ connect
         │   ├─ disconnect
         │   ├─ tools (list & execute)
         │   ├─ prompts (list & get)
         │   └─ resources (list & read)
         │
         └─> MCP Client Manager (싱글톤)
             ├─ STDIO Transport
             ├─ SSE Transport
             └─ HTTP Transport
```

### 주요 컴포넌트
- **MCPContext**: 서버 설정, 연결 상태, 캐시 관리
- **MCP Client Manager**: 서버별 Client 인스턴스 관리
- **API Routes**: 클라이언트-서버 통신 레이어
- **MCP UI Components**: ServerCard, ToolExecutor, PromptViewer, ResourceViewer

## MCP 서버 예제

### SSE Transport
```json
{
  "name": "My MCP Server",
  "transport": "sse",
  "url": "http://localhost:3001/mcp/sse"
}
```

### STDIO Transport (서버 환경만)
```json
{
  "name": "Local MCP Server",
  "transport": "stdio",
  "command": "node",
  "args": ["server.js"]
}
```

## 주의사항

- **STDIO Transport**: Next.js API Routes는 서버리스 환경에서 실행되므로, STDIO transport는 장시간 연결 유지가 어려울 수 있습니다. 프로덕션 환경에서는 SSE 또는 HTTP transport 권장.
- **CORS**: SSE/HTTP transport 사용 시 MCP 서버에서 CORS 설정 필요.
- **보안**: API Routes에서 MCP 도구 실행 시 입력값 검증 필수.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
