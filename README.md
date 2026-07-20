# Real-Time Financial Dashboard

A high-performance monitoring system designed to ingest 100 transactions/sec via gRPC-Web and visualize them in a lag-free React dashboard.

## 1. Core Architecture
- **Backend (.NET 8/9):** Uses gRPC Server Streaming for efficient, binary-encoded data transmission.
- **Frontend (React/TypeScript):** Uses Redux Toolkit to centralize data and `react-window` for list virtualization.
- **Optimization:** Implements a 500ms buffering strategy to batch data updates, preventing UI performance degradation.

## 2. Key Architectural Solutions
- **The "Render Storm" Solution:** Instead of rendering every transaction as it arrives, incoming packets are accumulated in a local memory buffer and flushed to the state exactly every 500ms. This reduces UI update frequency from 100/sec to 2/sec.
- **Virtualized Rendering:** To handle 10,000+ records, the dashboard uses `react-window`, which only renders the rows currently visible on the user's screen.
- **Resilience:** The system includes exponential backoff and jitter to automatically recover from connection drops, with a clear "Cached View" status for users.
- **Precision:** Protobuf Timestamp fields (seconds/nanos) are converted using a custom helper to ensure full time precision for financial auditing.

## 3. Tech Stack
- **Communication:** gRPC-Web (Binary RPC)
- **Caching:** `IDistributedCache` (Redis) for high-performance data retrieval
- **Concurrency:** Atomic `Interlocked` throttling to prevent server overload

## 4. How to Run
- **Full Startup:** `npm run start:all`
- **Backend Only:** `dotnet run --project ./backend/ReportingBackend/ReportingBackend.csproj`
- **Frontend Only:** `npm start` (on `http://localhost:3000`)