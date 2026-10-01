import path from "node:path";
import type { NextConfig } from "next";

// The demo imports buildDigest from ../src and the exports from ../data, which sit
// outside this folder. Point Turbopack and file tracing at the repo root so they resolve.
const repoRoot = path.join(__dirname, "..");

const nextConfig: NextConfig = {
  turbopack: { root: repoRoot },
  outputFileTracingRoot: repoRoot,
};

export default nextConfig;
