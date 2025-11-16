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
// This prevents the "too much recursion" client-side error and generates a valid schema.
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

// Define the schema with a maximum depth. This is sufficient for most mind maps.
const mindMapNodeSchema = createNestedSchema(6);

export const generateMindMapStructure = async (documentText: string): Promise<MindMapNodeData> => {
    try {
        const model = ai.getGenerativeModel({ model: "gemini-2.5-flash" });
        const response = await model.generateContent({
            contents: [
                {
                    role: "user",
                    parts: [
                        {
                            text: `Analyze the following text and generate a hierarchical mind map structure. The root object should represent the main subject. Keep topics concise. The ID should be a short, unique string. The structure can be nested as deep as necessary to represent the information hierarchy.\n\nText: """${documentText}"""`
                        }
                    ]
                }
            ],
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: mindMapNodeSchema as any,
            },
        });

        const jsonText = response.response.text();
        const parsedData = JSON.parse(jsonText);
        
        // Normalize the data to ensure every node has a `children` array
        normalizeMindMapData(parsedData);

        return parsedData as MindMapNodeData;
    } catch (error) {
        console.error("Error generating mind map structure:", error);
        throw new Error("Failed to generate mind map. Please check the console for details.");
    }
};
