# AI Chat Assistant

Google Gemini API를 활용한 실시간 AI 채팅 애플리케이션입니다.

## 주요 기능

- 🤖 Google Gemini 2.0 Flash 모델 연동
- 💬 실시간 스트리밍 응답
- 📝 마크다운 렌더링 (코드 하이라이팅 포함)
- 📋 코드 블록 복사 버튼
- 🗂️ **멀티 채팅방 지원** (사이드바에서 전환 가능)
- 💾 LocalStorage를 통한 모든 채팅방 내역 저장
- 🔄 각 채팅방의 독립적인 대화 맥락 유지
- 🎨 다크모드 지원
- 📱 반응형 디자인 (모바일 사이드바 오버레이)

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

### 메시지 전송
- **Enter**: 메시지 전송
- **Shift + Enter**: 줄바꿈
- 각 채팅방은 독립적인 대화 맥락을 유지합니다

### 자동 기능
- 첫 메시지를 기반으로 채팅방 제목이 자동 생성됩니다
- 모든 채팅 내역은 LocalStorage에 자동 저장됩니다
- 마지막으로 사용한 채팅방이 자동으로 선택됩니다

## 기술 스택

- **프레임워크**: Next.js 15.5.6
- **UI**: React 19, Tailwind CSS
- **AI SDK**: @google/generative-ai
- **마크다운**: react-markdown, remark-gfm
- **코드 하이라이팅**: react-syntax-highlighter
- **아이콘**: lucide-react
- **언어**: TypeScript

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
