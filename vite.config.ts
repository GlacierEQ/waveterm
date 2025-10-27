// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => {
    const [
        { default: tailwindcss },
        { default: react },
        { ViteImageOptimizer },
        { viteStaticCopy },
        { default: svgr },
        { default: tsconfigPaths },
    ] = await Promise.all([
        import("@tailwindcss/vite"),
        import("@vitejs/plugin-react-swc"),
        import("vite-plugin-image-optimizer"),
        import("vite-plugin-static-copy"),
        import("vite-plugin-svgr"),
        import("vite-tsconfig-paths"),
    ]);

    return {
        root: ".",
        plugins: [
            tsconfigPaths(),
            { ...ViteImageOptimizer(), apply: "build" },
            svgr({
                svgrOptions: { exportType: "default", ref: true, svgo: false, titleProp: true },
                include: "**/*.svg",
            }),
            react({}),
            tailwindcss(),
            viteStaticCopy({
                targets: [{ src: "node_modules/monaco-editor/min/vs/*", dest: "monaco" }],
            }),
        ],
        resolve: {
            alias: {
                "@": path.resolve(projectRoot, "frontend"),
            },
        },
        optimizeDeps: {
            include: ["monaco-yaml/yaml.worker.js"],
        },
        server: {
            open: false,
            watch: {
                ignored: ["dist/**", "**/*.go", "**/go.mod", "**/go.sum", "**/*.md", "**/*.json", "emain/**"],
            },
        },
        css: {
            preprocessorOptions: {
                scss: {
                    silenceDeprecations: ["mixed-decls"],
                },
            },
        },
        build: {
            target: "chrome140",
            sourcemap: true,
            outDir: "dist/frontend",
            rollupOptions: {
                input: {
                    index: "index.html",
                },
                output: {
                    manualChunks(id) {
                        const normalized = id.replace(/\\/g, "/");
                        if (
                            normalized.includes("node_modules/monaco") ||
                            normalized.includes("node_modules/@monaco")
                        ) {
                            return "monaco";
                        }
                        if (
                            normalized.includes("node_modules/mermaid") ||
                            normalized.includes("node_modules/@mermaid")
                        ) {
                            return "mermaid";
                        }
                        if (
                            normalized.includes("node_modules/katex") ||
                            normalized.includes("node_modules/@katex")
                        ) {
                            return "katex";
                        }
                        if (
                            normalized.includes("node_modules/shiki") ||
                            normalized.includes("node_modules/@shiki")
                        ) {
                            return "shiki";
                        }
                        if (
                            normalized.includes("node_modules/cytoscape") ||
                            normalized.includes("node_modules/@cytoscape")
                        ) {
                            return "cytoscape";
                        }
                        return undefined;
                    },
                },
            },
        },
    };
});
