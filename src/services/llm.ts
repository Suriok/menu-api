import OpenAI from 'openai';
import { MenuResponse } from '../types/types';
import dotenv from 'dotenv';
dotenv.config();// Импортируем наши типы

const client = new OpenAI({
    apiKey: process.env.PERPLEXITY_API_KEY,
    baseURL: 'https://api.perplexity.ai'
});

export const analyzeMenuWithAI = async (pageText: string, date: string): Promise<MenuResponse> => {

    const response = await client.chat.completions.create({
        model: 'sonar',
        messages: [
            {
                role: 'system',
                content: `
                You are a smart restaurant menu parser.
                
                OUTPUT JSON SCHEMA (Strict Types):
                {
                    "restaurant_name": "string",
                    "date": "YYYY-MM-DD",
                    "is_closed": boolean,       
                    "closure_reason": "string", 
                    "day_of_week": "string (czech)",
                    "menu_items": [
                        { 
                            "category": "soup/main", 
                            "name": "string", 
                            "price": integer, 
                            "allergens": ["1", "3"] 
                        }
                    ],
                    "daily_menu": boolean
                }
                
                RULES:
                1. Set "is_closed": true if "Zavřeno" found.
                2. Price must be INTEGER.
                3. Return ONLY valid JSON.
                `
            },
            {
                role: 'user',
                content: `RAW TEXT: """${pageText}"""\n\nTASK: Extract menu for ${date}.`
            }
        ]
    });

    const content = response.choices[0].message.content || "";
    let rawText = content.replace(/```json/g, '').replace(/```/g, '').trim();

    try {
        return JSON.parse(rawText) as MenuResponse;
    } catch (e) {
        throw new Error("AI returned invalid JSON: " + rawText);
    }
};