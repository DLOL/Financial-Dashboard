using System.Collections.Concurrent;
using System.Text.Json;
using Google.Protobuf.WellKnownTypes;
using Grpc.Core;
using Microsoft.Extensions.Caching.Distributed;
using ReportingBackend;

namespace ReportingBackend.Services;

public class ReportingServiceImpl : ReportingService.ReportingServiceBase
{
    private const string HotCacheKey = "reporting:hot_transactions";
    private const int MaxConcurrentStreams = 50;
    private static int _activeStreams;

    private readonly ILogger<ReportingServiceImpl> _logger;
    private readonly IDistributedCache _cache;

    private static readonly string[] Categories =
    {
        "Payment", "Refund", "Transfer", "Deposit", "Withdrawal"
    };

    public ReportingServiceImpl(ILogger<ReportingServiceImpl> logger, IDistributedCache cache)
    {
        _logger = logger;
        _cache = cache;
    }

    public override async Task StreamTransactions(
        ReportRequest request,
        IServerStreamWriter<TransactionResponse> responseStream,
        ServerCallContext context)
    {
        if (Interlocked.Increment(ref _activeStreams) > MaxConcurrentStreams)
        {
            Interlocked.Decrement(ref _activeStreams);
            throw new RpcException(new Status(StatusCode.ResourceExhausted, "Too many active streams"));
        }

        try
        {
            var maxItems = request.MaxItems > 0 ? Math.Min(request.MaxItems, 10000) : 10000;

            var hotData = await LoadHotDataAsync(context.CancellationToken);
            if (hotData.Count == 0)
            {
                hotData = SeedHotData(250);
                await SaveHotDataAsync(hotData, context.CancellationToken);
            }

            var index = 0;
            while (!context.CancellationToken.IsCancellationRequested && index < maxItems)
            {
                // 100 transactions/sec by sending 10 items every 100ms
                for (var i = 0; i < 10 && index < maxItems; i++)
                {
                    var tx = GenerateTransaction();
                    await responseStream.WriteAsync(tx);

                    hotData.Add(tx);
                    if (hotData.Count > 2000)
                    {
                        hotData.RemoveRange(0, hotData.Count - 2000);
                    }

                    index++;
                }

                await SaveHotDataAsync(hotData, context.CancellationToken);
                await Task.Delay(100, context.CancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogInformation("Stream cancelled by client.");
        }
        finally
        {
            Interlocked.Decrement(ref _activeStreams);
        }
    }

    private async Task<List<TransactionResponse>> LoadHotDataAsync(CancellationToken ct)
    {
        string? cached;
        try
        {
            cached = await _cache.GetStringAsync(HotCacheKey, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis read failed; continuing with generated transactions.");
            return new List<TransactionResponse>();
        }

        if (string.IsNullOrWhiteSpace(cached))
        {
            return new List<TransactionResponse>();
        }

        try
        {
            var items = JsonSerializer.Deserialize<List<HotTransaction>>(cached);
            return items?.Select(ToProto).ToList() ?? new List<TransactionResponse>();
        }
        catch
        {
            return new List<TransactionResponse>();
        }
    }

    private async Task SaveHotDataAsync(List<TransactionResponse> data, CancellationToken ct)
    {
        var payload = data.Select(FromProto).ToList();
        var json = JsonSerializer.Serialize(payload);
        try
        {
            await _cache.SetStringAsync(
                HotCacheKey,
                json,
                new DistributedCacheEntryOptions
                {
                    AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(10)
                },
                ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Redis write failed; continuing stream without cache persistence.");
        }
    }

    private static List<TransactionResponse> SeedHotData(int count)
    {
        var list = new List<TransactionResponse>(count);
        for (var i = 0; i < count; i++)
        {
            list.Add(GenerateTransaction());
        }
        return list;
    }

    private static TransactionResponse GenerateTransaction()
    {
        var now = DateTime.UtcNow;
        return new TransactionResponse
        {
            TransactionId = $"txn-{Guid.NewGuid():N}",
            Category = Categories[Random.Shared.Next(Categories.Length)],
            Amount = Math.Round(Random.Shared.NextDouble() * 9900 + 100, 2),
            Status = Random.Shared.NextDouble() > 0.1 ? "success" : "failed",
            OccurredAt = Timestamp.FromDateTime(now)
        };
    }

    private static HotTransaction FromProto(TransactionResponse tx)
    {
        return new HotTransaction
        {
            TransactionId = tx.TransactionId,
            Category = tx.Category,
            Amount = tx.Amount,
            Status = tx.Status,
            Seconds = tx.OccurredAt.Seconds,
            Nanos = tx.OccurredAt.Nanos
        };
    }

    private static TransactionResponse ToProto(HotTransaction tx)
    {
        return new TransactionResponse
        {
            TransactionId = tx.TransactionId,
            Category = tx.Category,
            Amount = tx.Amount,
            Status = tx.Status,
            OccurredAt = new Timestamp { Seconds = tx.Seconds, Nanos = tx.Nanos }
        };
    }

    private sealed class HotTransaction
    {
        public string TransactionId { get; set; } = string.Empty;
        public string Category { get; set; } = string.Empty;
        public double Amount { get; set; }
        public string Status { get; set; } = string.Empty;
        public long Seconds { get; set; }
        public int Nanos { get; set; }
    }
}
