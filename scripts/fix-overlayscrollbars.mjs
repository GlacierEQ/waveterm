// SPDX-License-Identifier: Apache-2.0
// Ensures overlayscrollbars exposes an ESM entry for Vite builds.

import { copyFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const moduleDir = path.resolve(projectRoot, "..", "node_modules", "overlayscrollbars");
const source = path.join(moduleDir, "overlayscrollbars.esm.js");
const target = path.join(moduleDir, "overlayscrollbars.mjs");

async function ensureFile() {
    try {
        await stat(target);
        return; // Already patched.
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
    }

    try {
        await stat(source);
    } catch (err) {
        if (err.code === "ENOENT") return;
        throw err;
    }

    await copyFile(source, target);
}

await ensureFile();
