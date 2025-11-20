// Copyright 2025, Command Line Inc.
// SPDX-License-Identifier: Apache-2.0

import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(projectRoot, "frontend");
const frontendAppRoot = path.resolve(frontendRoot, "app");

export default defineConfig(async () => {
    const fallbackPlugins = {
        tailwindcss: () => ({ name: "tailwindcss-fallback" }),
        react: () => ({ name: "react-swc-fallback" }),
        ViteImageOptimizer: () => ({ name: "vite-image-optimizer-fallback", apply: "build" }),
        viteStaticCopy: () => ({ name: "static-copy-fallback" }),
        svgr: () => ({ name: "svgr-fallback" }),
        tsconfigPaths: () => ({ name: "tsconfig-paths-fallback" }),
    };

    const loadPlugins = async () => {
        try {
            const modules = await Promise.all([
                import("@tailwindcss/vite"),
                import("@vitejs/plugin-react-swc"),
                import("vite-plugin-image-optimizer"),
                import("vite-plugin-static-copy"),
                import("vite-plugin-svgr"),
                import("vite-tsconfig-paths"),
            ]);

            return {
                tailwindcss: modules[0].default ?? fallbackPlugins.tailwindcss,
                react: modules[1].default ?? fallbackPlugins.react,
                ViteImageOptimizer: modules[2].ViteImageOptimizer ?? fallbackPlugins.ViteImageOptimizer,
                viteStaticCopy: modules[3].viteStaticCopy ?? fallbackPlugins.viteStaticCopy,
                svgr: modules[4].default ?? fallbackPlugins.svgr,
                tsconfigPaths: modules[5].default ?? fallbackPlugins.tsconfigPaths,
            };
        } catch (error) {
            console.warn("Unable to load optional Vite plugins, falling back to no-op implementations.", error);
            return fallbackPlugins;
        }
    };

    const { tailwindcss, react, ViteImageOptimizer, viteStaticCopy, svgr, tsconfigPaths } = await loadPlugins();

    return {
        root: ".",
        plugins: [
            tsconfigPaths({ ignoreConfigErrors: true }),
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
            alias: [
                { find: /^cytoscape$/, replacement: path.resolve(projectRoot, "frontend/shims/cytoscape.ts") },
                { find: /^@\/app\//, replacement: `${frontendAppRoot}/` },
                {
                    find: /^@\/(block|element|modals|notification|onboarding|shadcn|store|suggestion|tab|view|workspace|aipanel)/,
                    replacement: `${frontendAppRoot}/$1`,
                },
                {
                    find: /^@\/(layout|types|util)/,
                    replacement: `${frontendRoot}/$1`,
                },
                { find: /^@\//, replacement: `${frontendRoot}/` },
                { find: "@", replacement: frontendRoot },
            ],
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
