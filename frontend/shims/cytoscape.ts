import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const cytoscape = require("cytoscape");

export default cytoscape;
export const Cytoscape = cytoscape;
