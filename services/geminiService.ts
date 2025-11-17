import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import { MindMapNodeData } from '../types';

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY as string);

/**
 * Recursively ensures that every node in the mind map data structure has a 'children' array.
 * The Gemini API, based on the corrected schema, may omit the 'children' property for leaf nodes.
 * This function normalizes the data to match the application's `MindMapNodeData` type.
 * @param node The mind map node to process.
 */
const normalizeMindMapData = (node: Partial<MindMapNodeData>): void => {
    if (!node.children) {
        node.children = [];
    }
    for (const child of node.children) {
        normalizeMindMapData(child);
    }
};

// Helper function to create a schema with a limited recursive depth.
// Retained for reference, but not used when using the flat schema below.
const createNestedSchema = (depth: number): object => {
    // Base case for recursion: A leaf node does not have a 'children' property in the schema.
    // This makes the schema valid and finite.
    if (depth <= 0) {
        return {
            type: SchemaType.OBJECT,
            properties: {
                id: { type: SchemaType.STRING },
                topic: { type: SchemaType.STRING },
                content: { type: SchemaType.STRING },
            },
            required: ['id', 'topic', 'content']
        };
    }
    // Recursive step: A node has children, and the items in that children array
    // conform to the schema of one level less depth.
    return {
        type: SchemaType.OBJECT,
        properties: {
            id: { type: SchemaType.STRING, description: 'A unique identifier for the node.' },
            topic: { type: SchemaType.STRING, description: 'A concise topic title for this node.' },
            content: { type: SchemaType.STRING, description: 'A brief summary or key point for this topic.' },
            children: {
                type: SchemaType.ARRAY,
                description: 'An array of child nodes, representing subtopics.',
                items: createNestedSchema(depth - 1)
            }
        },
        required: ['id', 'topic', 'content', 'children']
    };
};

// Flat array schema to avoid recursion depth limits. One item per node.
const flatMindMapSchema = {
    type: SchemaType.ARRAY,
    items: {
        type: SchemaType.OBJECT,
        properties: {
            id: { type: SchemaType.STRING },
            parentId: { type: SchemaType.STRING, description: 'Parent node id. Use empty string for the root node.' },
            topic: { type: SchemaType.STRING },
            content: { type: SchemaType.STRING },
        },
        required: ['id', 'parentId', 'topic', 'content']
    }
} as const;

type FlatMindMapNode = { id: string; parentId: string; topic: string; content: string };

const buildTreeFromFlat = (items: FlatMindMapNode[]): MindMapNodeData => {
    const map = new Map<string, MindMapNodeData>();
    for (const it of items) {
        map.set(it.id, { id: it.id, topic: it.topic, content: it.content, children: [] });
    }
    const roots: MindMapNodeData[] = [];
    for (const it of items) {
        const node = map.get(it.id)!;
        const parentId = it.parentId || '';
        if (parentId && map.has(parentId)) {
            map.get(parentId)!.children.push(node);
        } else {
            roots.push(node);
        }
    }
    if (roots.length === 1) return roots[0];
    // Fallback: synthesize a single root if multiple or none were provided
    return {
        id: 'root',
        topic: 'Mind Map',
        content: 'Auto-constructed root',
        children: roots,
    };
};

// Simple helpers for retrying transient network failures
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const isTransientNetworkError = (err: unknown) => {
    const msg = String((err as any)?.message || err || '').toLowerCase();
    return (
        msg.includes('unavailable') ||
        msg.includes('network') ||
        msg.includes('timeout') ||
        msg.includes('aborted') ||
        msg.includes('socket') ||
        msg.includes('wsarecv') ||
        msg.includes('econnreset')
    );
};
const withRetry = async <T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 800): Promise<T> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        } catch (err) {
            lastErr = err;
            if (attempt < retries && isTransientNetworkError(err)) {
                await sleep(baseDelayMs * Math.pow(2, attempt));
                continue;
            }
            break;
        }
    }
    throw lastErr as any;
};

/**
 * Calls Gemini to transform free-form text into a hierarchical `MindMapNodeData` tree.
 * Uses a JSON schema (with bounded recursion) to coerce a well-typed response,
 * then normalizes to ensure child arrays exist on every node.
 */
export const generateMindMapStructure = async (documentText: string): Promise<MindMapNodeData> => {
    try {
        const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
        const response = await withRetry(() => model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: `Analyze the following text and produce a FLAT ARRAY of nodes representing a mind map.\n\nRequirements:\n- Each node must include: id (short unique), parentId (empty string for the single root), topic (concise), content (brief).\n- Use parentId to reference the node's parent by id.\n- There must be exactly ONE root node with parentId = "" (empty string).\n- Include as many levels (children, grandchildren, etc.) as needed to represent the hierarchy.\n- Keep topics and contents concise.\n\nText: """${documentText}"""`
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: flatMindMapSchema as any,
            },
        }));

        const jsonText = response.response.text();
        const parsed = JSON.parse(jsonText);
        const nodes = Array.isArray(parsed) ? parsed as FlatMindMapNode[] : [];
        const tree = buildTreeFromFlat(nodes);
        normalizeMindMapData(tree);
        return tree;
    } catch (error) {
        console.error("Error generating mind map structure:", error);
        if (isTransientNetworkError(error)) {
            throw new Error("The model service is currently unreachable. Please check your internet/VPN/firewall and try again.");
        }
        throw new Error("Failed to generate mind map. Please check the console for details.");
    }
};

