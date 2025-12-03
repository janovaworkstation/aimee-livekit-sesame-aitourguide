# AImee File & Folder Architecture (Docker + Runpod Edition)

```
aimee-poc/
│
├── mobile/
│   ├── app/
│   │   ├── screens/
│   │   │   ├── MapScreen.tsx
│   │   │   ├── TourScreen.tsx
│   │   │   ├── VoiceScreen.tsx
│   │   ├── hooks/
│   │   │   ├── useGPS.ts
│   │   │   ├── useLiveKitAudio.ts
│   │   │   ├── useBrainSelector.ts
│   │   │   ├── useOfflineLLM.ts
│   │   ├── lib/
│   │   │   ├── livekit.ts
│   │   │   ├── storage.ts
│   │   │   ├── agentEvents.ts
│   │   └── navigation/
│   ├── assets/
│   └── package.json
│
├── docker/
│   ├── docker-compose.yml
│   │
│   ├── backend/
│   │   ├── Dockerfile
│   │   ├── jest.config.js
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── __tests__/
│   │   │   │   └── setup.ts
│   │   │   ├── brain/
│   │   │   │   ├── intentRouter.ts
│   │   │   │   └── __tests__/
│   │   │   ├── agents/
│   │   │   │   ├── baseAgent.ts
│   │   │   │   ├── agentRouter.ts
│   │   │   │   ├── navigatorAgent.ts
│   │   │   │   ├── historianAgent.ts
│   │   │   │   ├── experienceAgent.ts
│   │   │   │   ├── memoryAgent.ts
│   │   │   │   └── __tests__/
│   │   │   ├── memory/
│   │   │   │   ├── jsonMemoryStore.ts
│   │   │   │   ├── transcriptStore.ts
│   │   │   │   └── __tests__/
│   │   │   ├── testing/
│   │   │   │   ├── llmJudge.ts
│   │   │   │   └── __tests__/
│   │   │   │       └── criticalPaths.test.ts
│   │   │   └── rag/
│   │   └── package.json
│   │
│   ├── agent/
│   │   ├── Dockerfile
│   │   ├── aimee_agent.py
│   │   └── backend_client.py
│   │
│   ├── sesame/
│   │   ├── Dockerfile
│   │   ├── docker-compose.runpod.yml
│   │   └── server/
│   │       └── main.py
│   │
│   └── rag-db/
│       ├── Dockerfile
│       ├── markers.db
│       ├── memory.json
│       └── transcripts.json
│
└── docs/
    ├── architecture.md
    ├── file_structure.md
    ├── roadmap.md
    └── tech_stack.md
```

### Notes
- All backend code is containerized.
- docker-compose controls backend, agent, sesame, db.
- Runpod hosts the sesame container.
- Mobile app remains outside Docker (RN runs on device).
- User memory and transcripts stored in JSON files in rag-db volume.
- Testing framework uses Jest with LLM-as-Judge for quality evaluation.
