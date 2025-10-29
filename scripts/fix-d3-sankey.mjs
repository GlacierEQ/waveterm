// SPDX-License-Identifier: Apache-2.0
// Copies missing symbol shapes into d3-sankey's vendored d3-shape.

import { copyFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));
const topLevelShape = path.resolve(projectRoot, "..", "node_modules", "d3-shape", "src", "symbol");
const sankeyShape = path.resolve(
    projectRoot,
    "..",
    "node_modules",
    "d3-sankey",
    "node_modules",
    "d3-shape",
    "src",
    "symbol"
);

const files = ["star.js", "triangle.js", "wye.js"];

for (const file of files) {
    const target = path.join(sankeyShape, file);
    try {
        await stat(target);
        continue;
    } catch (err) {
        if (err.code !== "ENOENT") throw err;
    }

    const source = path.join(topLevelShape, file);
    try {
        await copyFile(source, target);
    } catch (err) {
        if (err.code === "ENOENT") {
            // If source missing we skip silently.
            continue;
        }
        throw err;
    }
}
