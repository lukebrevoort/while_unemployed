# while unemployed

## Overview

This project reimagines technical interviews by simulating a real-world experience. Unlike platforms like LeetCode, our application offers a database of coding problems and integrates authentic interview dynamics with AI-powered feedback.

## Key Features

- **Realistic Interview Simulation:** Turn on your mic and camera to interact with an AI interviewer
- **Interactive Problem Solving:** Explain your solutions and respond to follow-up questions in real-time
- **Code Analysis:** Your code is analyzed by the AI agent for specific feedback and hints
- **Text-to-Speech:** AI responses are spoken aloud for a more natural interview experience
- **Performance Recording:** Track your interview sessions with comprehensive feedback
- **Comprehensive Feedback:** Receive insights on your solution, communication, and problem-solving approach

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Monaco Editor** - VS Code-powered code editor
- **Socket.IO Client** - Real-time WebSocket communication
- **Supabase** - Authentication and database

### Backend
- **FastAPI** - High-performance Python API framework
- **Socket.IO** - WebSocket server for real-time communication
- **LangChain** - AI agent framework
- **OpenAI GPT-4** - Interview agent intelligence
- **OpenAI Whisper** - Speech-to-text transcription
- **OpenAI TTS** - Text-to-speech audio generation

## Getting Started

### Prerequisites
- Node.js 18+ and npm
- Python 3.11+
- OpenAI API key
- Supabase account

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/lukebrevoort/while_unemployed.git
   cd while_unemployed
   ```

2. **Set up Backend**
   ```bash
   cd backend
   
   # Create virtual environment
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   
   # Install dependencies
   pip install -r requirements.txt
   
   # Copy environment variables
   cp .env.example .env
   # Edit .env and add your OPENAI_API_KEY
   
   # Start backend server
   python main.py
   ```

3. **Set up Frontend**
   ```bash
   cd frontend/tech-interview-prep
   
   # Install dependencies
   npm install
   
   # Copy environment variables
   cp .env.example .env.local
   # Edit .env.local and add your Supabase credentials
   
   # Start development server
   npm run dev
   ```

4. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - Backend Health: http://localhost:8000/health

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying to production.

**Quick Summary:**
- **Frontend**: Deploy to Vercel (automatic with GitHub integration)
- **Backend**: Deploy to Koyeb using Docker
- **Environment Variables**: Configure in respective platform dashboards

## Recent Updates

### Code Analysis Feature
- AI agent now receives and analyzes user code in real-time
- Provides specific feedback based on actual code implementation
- Detects code patterns, edge cases, and optimization opportunities

### Text-to-Speech Integration
- AI responses are automatically converted to speech
- Natural-sounding voice using OpenAI TTS
- Seamless audio playback in the browser

### Production-Ready Improvements
- Dockerized backend for easy deployment
- Environment-based configuration for CORS and ports
- Build optimizations for Next.js frontend
- Health checks and monitoring endpoints

## Roadmap

- Add more coding problems and interview scenarios
- Enhance feedback with AI-driven analysis
- Integrate Redis for multi-instance WebSocket scaling
- Add database for session persistence
- Improve UI/UX for a seamless interview experience
- Add video recording and playback features

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements.

## License

This project is part of MGT-103 coursework.

---

_Built with ❤️ for better interview preparation_
