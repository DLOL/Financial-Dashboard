# Financial Dashboard - Real-Time Buffered Reporting Engine

A high-performance, full-stack transaction monitoring system that ingests live financial stream data via **gRPC-Web (Protobuf)** from a C# .NET Core backend into a React (TypeScript) frontend powered by **Redux Toolkit** state management and **react-window** list virtualization.

---

## 1. Technical Stack Overview

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| **Backend** | .NET 8 / 9 Core (C#) | gRPC Server streaming service (`ReportingService`) |
| **Contract** | Protocol Buffers (`Transaction.proto`) | Strongly-typed binary RPC interface (`StreamTransactions`) |
| **Frontend** | React.js (TypeScript) + Redux Toolkit | High-frequency streaming UI and centralized state store |
| **Virtualization**| `react-window` (`FixedSizeList`) | Windowed list rendering for 10,000+ transaction rows |
| **Caching** | Redis (`IDistributedCache`) | Server-side hot data cache layer with memory fallback |
| **Communication**| gRPC-Web Middleware | Binary RPC streaming over standard HTTP/1.1 or HTTP/2 |

---

## 2. Architecture & Performance Optimizations

### gRPC-Web Server Streaming
- **Server-Streaming RPC:** Client calls `StreamTransactions(ReportRequest)` and receives a continuous stream of `TransactionResponse` binary frames (~100 items/sec).
- **Concurrency Throttling:** The backend limits active concurrent streams using atomic `Interlocked` checks (`MaxConcurrentStreams = 50`) to shield backend server resources.

### The 500ms Buffer Challenge
- **Client-Side Batching:** Incoming gRPC packet payloads are appended to an in-memory ref buffer in `useTransactionStream.ts`.
- **Flushing to Redux:** A `setInterval` flushes the accumulated buffer to the Redux store once every **500ms**.
- **Why?** Prevents "React render storms". Updating state for every single gRPC packet (100 renders/sec) would freeze browser main thread. Batching reduces rendering frequency to **2 updates/sec** while maintaining sub-second updates.

### Virtualized List (`react-window`)
- **Zero DOM Lag for 10,000+ Items:** `Dashboard.tsx` utilizes `FixedSizeList` from `react-window`.
- **Efficiency:** Instead of mounting 10,000+ DOM nodes, only ~10 visible rows are rendered into the DOM at any given moment.

---

## 3. Expected Deliverables

1. **`Transaction.proto`**: Located in [`backend/ReportingBackend/Protos/Transaction.proto`](file:///y:/UGlobal/light-bootstrap-dashboard-react/backend/ReportingBackend/Protos/Transaction.proto). Defines `ReportingService` and protobuf message contracts.
2. **`ReportingService.cs`**: Located in [`backend/ReportingBackend/Services/ReportingService.cs`](file:///y:/UGlobal/light-bootstrap-dashboard-react/backend/ReportingBackend/Services/ReportingService.cs). Implements server streaming, Redis caching, request throttling, and mock transaction generator.
3. **`useTransactionStream.ts`**: Located in [`src/hooks/useTransactionStream.ts`](file:///y:/UGlobal/light-bootstrap-dashboard-react/src/hooks/useTransactionStream.ts). Custom React hook managing gRPC-Web stream lifecycle, 500ms buffering, and exponential backoff reconnection.
4. **`transactionStore.ts`**: Located in [`src/store/transactionStore.ts`](file:///y:/UGlobal/light-bootstrap-dashboard-react/src/store/transactionStore.ts). Redux slice maintaining transaction state capped at 10,000 entries (FIFO eviction).

---

## 4. Architect Constraints & Critical Evaluation (Part C)

### A. Memory Leak Prevention
- **Explicit Stream Cancellation:** When the React component unmounts or the subscription teardown triggers, `useTransactionStream.ts` calls `stream.cancel()` on the active `ClientReadableStream` instance.
- **Resource Cleanup:** This sends a cancellation signal to Kestrel, terminating the backend C# `Task` and releasing both frontend event listeners and server gRPC channels.

### B. Cache Invalidation Strategy
When a transaction is updated on the backend while a stream is actively streaming:
1. **Invalidate Hot Cache:** Update or delete the corresponding Redis key (`reporting:hot_transactions`) or write through the updated record.
2. **Broadcast Event / Delta Channel:** Publish an update event over Redis Pub/Sub to all API instances.
3. **Stream Mutation Packet:** The active `StreamTransactions` handler emits a targeted mutation response or transaction payload update to subscribed clients.
4. **Client Re-ordering/Update:** Redux reducer matches `transactionId` and updates the existing entry in-place rather than appending duplicate rows.

### C. Binary Protobuf Timestamp Precision
- Protobuf timestamp fields are defined as `google.protobuf.Timestamp` (`seconds` and `nanos`).
- High-precision conversion function in `useTransactionStream.ts`:
  ```typescript
  function protoTimestampToDate(seconds: number, nanos: number): Date {
    const ms = seconds * 1000 + Math.floor(nanos / 1_000_000);
    return new Date(ms);
  }
  ```
- Converts nanoseconds to milliseconds accurately and wraps into standard JS `Date` instances.

---

## 5. Getting Started & Running

### Prerequisites
- Node.js 18+
- .NET 8 or 9 SDK

### Startup Commands

**Run Both Frontend & Backend concurrently:**
```bash
npm run start:all
```

**Run Backend Only:**
```bash
dotnet run --project ./backend/ReportingBackend/ReportingBackend.csproj
```

**Run Frontend Only:**
```bash
npm start
```
Frontend runs on `http://localhost:3000`, backend gRPC-Web runs on `http://localhost:5178`.
