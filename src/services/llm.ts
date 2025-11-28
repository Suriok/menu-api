import OpenAI from 'openai';
import dotenv from 'dotenv';
import {MENU_SCHEMA} from "../schema/menu_schema";
import { MenuZodSchema, ValidatedMenu } from '../schema/validation';

dotenv.config();

const client = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: 'https://api.perplexity.ai'
});

export const analyzeMenuWithAI = async (pageText: string, date: string): Promise<ValidatedMenu> => {

    const response = await client.chat.completions.create({
        model: 'sonar',
        messages: [
            {
                role: 'system',
                content: `You are a smart restaurant menu parser. 
                RULES:
                1. Set "is_closed": true if "Zavřeno" found.
                2. Price must be INTEGER.
                3. Extract data exactly according to the provided schema.`
            },
            {
                role: 'user',
                content: `RAW TEXT: """${pageText}"""\n\nTASK: Extract menu for ${date}.`
            }
        ],
        response_format: {
            type: "json_schema",
            json_schema: MENU_SCHEMA
        }
    });

    const content = response.choices[0].message.content || "{}";
    let rawJson;
    try {
        rawJson = JSON.parse(content);
    } catch (e) {
        console.error("CRITICAL: AI returned invalid JSON string:", content);
        throw new Error("AI response could not be parsed as JSON");
    }

    const validationResult = MenuZodSchema.safeParse(rawJson);
    if (!validationResult.success) {
        console.error("Validation Failed:", validationResult.error.flatten());
        throw new Error("AI returned data structure mismatch");
    }
    return validationResult.data;

};