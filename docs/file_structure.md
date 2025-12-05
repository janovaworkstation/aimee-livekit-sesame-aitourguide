# AImee File & Folder Architecture

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
│   │   │   │       ├── criticalPaths.test.ts
│   │   │   │       ├── aimeeCoreFeature.test.ts
│   │   │   │       ├── aimeePersonality.test.ts
│   │   │   │       └── aimeeMemory.test.ts
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
    ├── tech_stack.md
    ├── phase6-setup.md
    └── ios_dev_setup.md
```

## Notes

- All backend code is containerized
- docker compose controls backend, agent, and database volumes
- Mobile app remains outside Docker (React Native runs on device)
- User memory and transcripts stored in JSON files in rag-db volume
- Testing framework uses Jest with LLM-as-Judge for behavioral evaluation (33 scenarios across core, personality, and memory features)
- Sesame AI runs on Runpod GPU instances for standard intelligence tier
