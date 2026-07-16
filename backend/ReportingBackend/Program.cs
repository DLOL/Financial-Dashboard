using ReportingBackend.Services;
using System.Text.Json;
using Microsoft.AspNetCore.Server.Kestrel.Core;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
	options.ListenLocalhost(5178, listenOptions =>
	{
		listenOptions.Protocols = HttpProtocols.Http1AndHttp2;
	});
});

builder.Services.AddGrpc();
builder.Services.AddGrpcReflection();

var useRedis = builder.Configuration.GetValue<bool>("Redis:Enabled");
if (useRedis)
{
	builder.Services.AddStackExchangeRedisCache(options =>
	{
		options.Configuration = builder.Configuration.GetValue<string>("Redis:ConnectionString") ?? "localhost:6379";
		options.InstanceName = "reporting:";
	});
}
else
{
	builder.Services.AddDistributedMemoryCache();
}

builder.Services.AddCors(options =>
{
	options.AddPolicy("AllowFrontend", policy =>
	{
		policy
			.WithOrigins("http://localhost:3000", "https://localhost:3000")
			.AllowAnyHeader()
			.AllowAnyMethod();
	});
});

var app = builder.Build();

app.UseRouting();
app.UseGrpcWeb();
app.UseCors("AllowFrontend");

app.MapGrpcService<ReportingServiceImpl>()
   .EnableGrpcWeb()
   .RequireCors("AllowFrontend");

if (app.Environment.IsDevelopment())
{
	app.MapGrpcReflectionService();
}

app.MapGet("/", () => "Reporting gRPC backend is running.");

app.MapGet("/api/transactions/stream", async (HttpContext context) =>
{
	context.Response.Headers.CacheControl = "no-cache";
	context.Response.Headers.Connection = "keep-alive";
	context.Response.Headers.Append("X-Accel-Buffering", "no");
	context.Response.ContentType = "text/event-stream";

	var categories = new[] { "Payment", "Refund", "Transfer", "Deposit", "Withdrawal" };

	while (!context.RequestAborted.IsCancellationRequested)
	{
		var now = DateTimeOffset.UtcNow;
		var nanos = (int)((now.ToUnixTimeMilliseconds() % 1000) * 1_000_000);

		var payload = new
		{
			transactionId = $"txn-{Guid.NewGuid():N}",
			category = categories[Random.Shared.Next(categories.Length)],
			amount = Math.Round(Random.Shared.NextDouble() * 9900 + 100, 2),
			status = Random.Shared.NextDouble() > 0.1 ? "success" : "failed",
			occurredAt = new
			{
				seconds = now.ToUnixTimeSeconds(),
				nanos
			}
		};

		await context.Response.WriteAsync($"data: {JsonSerializer.Serialize(payload)}\n\n");
		await context.Response.Body.FlushAsync(context.RequestAborted);
		await Task.Delay(10, context.RequestAborted); // 100 events/sec
	}
}).RequireCors("AllowFrontend");

app.Run();
