// ThreeBody C# telemetry service.
// Listens on http://127.0.0.1:8082/stats and computes aggregate diagnostics
// (total kinetic energy, center of mass, max pairwise distance) from a
// posted frame. Garbage-collected, no native handles to leak.

var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls("http://127.0.0.1:8082");
var app = builder.Build();

app.MapPost("/stats", (Frame frame) =>
{
    double ke = 0, px = 0, py = 0, pz = 0, mTot = 0;
    for (int i = 0; i < frame.Pos.Length; i++)
    {
        double m = frame.Masses[i];
        mTot += m;
        px += frame.Pos[i][0] * m;
        py += frame.Pos[i][1] * m;
        pz += frame.Pos[i][2] * m;
        double vx = frame.Vel[i][0], vy = frame.Vel[i][1], vz = frame.Vel[i][2];
        ke += 0.5 * m * (vx * vx + vy * vy + vz * vz);
    }
    double maxDist = 0;
    for (int i = 0; i < frame.Pos.Length; i++)
        for (int j = i + 1; j < frame.Pos.Length; j++)
        {
            double dx = frame.Pos[i][0] - frame.Pos[j][0];
            double dy = frame.Pos[i][1] - frame.Pos[j][1];
            double dz = frame.Pos[i][2] - frame.Pos[j][2];
            double d = Math.Sqrt(dx * dx + dy * dy + dz * dz);
            if (d > maxDist) maxDist = d;
        }
    return Results.Ok(new
    {
        kineticEnergy = ke,
        centerOfMass = new[] { px / mTot, py / mTot, pz / mTot },
        maxPairwiseDistance = maxDist,
        bodies = frame.Pos.Length
    });
});

app.MapGet("/health", () => Results.Ok(new { ok = true, lang = "csharp" }));

Console.WriteLine("ThreeBody C# telemetry service on http://127.0.0.1:8082/");
app.Run();

record Frame(double[][] Pos, double[][] Vel, double[] Masses);
