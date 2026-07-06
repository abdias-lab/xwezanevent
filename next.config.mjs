/** @type {import('next').NextConfig} */
const nextConfig = {
  // Environnement mémoire contraint : on limite le parallélisme des workers
  // de build pour éviter les crashes OOM lors de la génération des pages.
  experimental: {
    workerThreads: false,
    cpus: 1,
  },
};

export default nextConfig;
