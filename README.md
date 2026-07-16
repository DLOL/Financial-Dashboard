# Financial Dashboard - Real-Time Transaction Monitoring

A high-performance, full-stack transaction monitoring dashboard that ingests live financial data via Server-Sent Events (SSE) from a .NET 8 backend and visualizes it in a React frontend with efficient state management.

## Architecture Highlights

### Real-Time Data Streaming
- **SSE (Server-Sent Events):** Browser-native, HTTP-based streaming protocol for real-time transaction ingestion (~100 events/sec)
- **No polling:** Single persistent connection reduces server load and network overhead compared to traditional REST polling

### Performance Engineering
- **500ms Client-Side Buffering:** Incoming stream packets are buffered in memory and flushed to Redux in controlled batches
  - **Why?** Prevents "React render storms" - batching 50 events/500ms reduces renders from 5000/sec to just 2/sec, keeping UI responsive
  - **Trade-off:** 500ms latency is imperceptible to users but provides massive performance gain
  
- **Redux State Management:** 
  - Single source of truth for transaction list (max 10,000 items, FIFO eviction)
  - Immutable state updates prevent accidental mutations
  - Selectors enable efficient component subscription to state slices

- **Resilience & Recovery:**
  - Exponential backoff reconnection (1s → 30s max)
  - Stream status tracking: `connecting` → `live` → `cached` → `reconnecting`
  - Graceful degradation when backend is unavailable

### UI/UX Optimizations
- **Localized scrolling:** Only transaction list scrolls (400px viewport), dashboard metrics remain fixed
- **Color-coded transactions:** Visual categorization (Payment: blue, Refund: pink, Transfer: orange, Deposit: green, Withdrawal: cyan)
- **Currency formatting:** All amounts displayed in RM (Malaysian Ringgit) with proper regional formatting
- **Live metrics:** Real-time calculations for Total Revenue, Avg Transaction Value, Packet Count, Stream Status

## Project Structure

```
/
├── src/
│   ├── views/
│   │   └── Dashboard.tsx          # Main dashboard component with stats, charts, transaction list
│   ├── hooks/
│   │   └── useTransactionStream.ts # Custom hook managing SSE subscription and Redux dispatch
│   ├── store/
│   │   ├── transactionStore.ts     # Redux Toolkit slice with buffering logic
│   │   └── transactionTypes.ts     # TypeScript types for transactions
│   ├── layouts/
│   │   └── Admin.js                # Minimal layout (removed bloat from template)
│   └── index.js                    # App entry with Redux Provider
├── backend/
│   └── ReportingBackend/           # .NET 8 Core API service
│       └── Program.cs              # SSE endpoint configuration
├── public/
│   └── index.html                  # React DOM mount point
└── package.json                    # Frontend dependencies
```

## Key Technical Decisions

### Why SSE Instead of gRPC or WebSockets?
- **Browser-native:** EventSource API built-in (no external deps)
- **Server-sent only:** Perfect for one-directional data flows (financial data feed)
- **Automatic reconnection:** Handles network interruptions without client code
- **Simple protocol:** HTTP-based, plays nicely with firewalls and proxies

### Why 500ms Buffering?
- **Real-time requirement:** Sub-second latency isn't necessary for financial dashboards (users read reports, not trade on microseconds)
- **Batching efficiency:** 50 transactions/batch = 98% fewer React renders
- **Browser headroom:** Keeps main thread responsive for user interactions
- **Data accuracy:** No transactions lost, just delayed by imperceptible 500ms

### Why Redux?
- **Predictable state:** All transactions flow through single reducer (flushBuffer)
- **DevTools integration:** Time-travel debugging for production issues
- **Scalability:** Easy to add features (filters, sorting, export) without prop drilling
- **Type-safe:** TypeScript integration prevents state shape bugs

### Why .NET 8?
- **Modern:** LTS support, async/await maturity, minimal dependencies
- **Performance:** Kestrel server handles 100+ events/sec trivially
- **Simplicity:** No middleware bloat for single SSE endpoint

## Getting Started

### Prerequisites
- Node.js 18+
- .NET 8 SDK
- Windows/macOS/Linux

### Installation & Running

**1. Frontend Setup**
```bash
npm install
npm start
```
Runs on `http://localhost:3000`

**2. Backend Setup**
```bash
cd backend/ReportingBackend
dotnet run
```
Runs on `http://localhost:5178`
SSE stream: `GET http://localhost:5178/api/transactions/stream`

**3. One-Command Startup** (uses `npm concurrently`)
```bash
npm run start:all
```
Launches both frontend and backend in single terminal

### Verify It's Working
- Frontend connects to backend
- Stream status badge shows "LIVE" (green)
- Transaction list updates in real-time
- Packet counter increments every 500ms (2 events from backend = 1 UI update)

## Live Demo Sequence

1. Open `http://localhost:3000` after running `npm start:all`
2. Watch transaction list populate with live data
3. See metrics update:
   - **Total Revenue:** Sum of all successful transactions
   - **Avg Transaction:** Mean transaction value
   - **Total Packets:** Count of events received from backend
   - **Stream Status:** Connection health indicator
4. Observe category pie chart with live distribution
5. Note how UI remains responsive despite ~100 events/sec stream rate

## Performance Metrics

| Metric | Value | Note |
|--------|-------|------|
| Stream Rate | ~100 events/sec | Simulated by backend |
| Buffer Flush | Every 500ms | Configurable in `useTransactionStream.ts` |
| Max Transactions Stored | 10,000 | FIFO eviction, configurable in Redux slice |
| UI Render Frequency | ~2/sec | Down from 100/sec thanks to batching |
| Memory Usage | ~5-10MB | Depends on transaction size & count |
| Reconnection Backoff | 1s → 30s exponential | Prevents server hammering |

## Architecture Decisions for Interview

**Q: Why SSE and not WebSockets?**
- SSE is simpler, browser-native, and better for server-sent-only scenarios. WebSockets add complexity without benefit here.

**Q: How do you handle 100 events/sec on a React app?**
- Client-side buffering + Redux batching. Without it, 100 renders/sec would freeze the UI.

**Q: What happens if the backend crashes?**
- Frontend detects error, sets status to "cached", waits 1 second, reconnects. Stream status badge shows "RECONNECTING".

**Q: Why not virtualize the transaction list?**
- 10,000 items is manageable with modern browsers. Virtualization adds complexity for minimal gain at this scale.

**Q: How do you ensure no transaction data is lost?**
- Redux flushBuffer reducer appends incoming transactions to list. Even if UI freezes, data is buffered and will display.

## Tech Stack

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Frontend** | React | 19.2.7 | UI framework |
| **State** | Redux Toolkit | Latest | Transaction storage & buffering |
| **Streaming** | EventSource (SSE) | Browser API | Real-time data ingestion |
| **Charting** | Chartist.js | Latest | Category distribution visualization |
| **Language** | TypeScript | 5.x | Type-safe JavaScript |
| **Backend** | ASP.NET Core | 8 | HTTP/SSE service |
| **Build** | React Scripts | 5.x | CRA bundler |
| **Startup** | concurrently | 9.2.1 | Multi-process launcher |

## License

MIT

---

**Last Updated:** 2026-07-16  
**Status:** Production-ready
