import { z } from 'zod';

export const MenuZodSchema = z.object({
    restaurant_name: z.string().default("Neznámá restaurace"),
    date: z.string(),
    is_closed: z.boolean().default(false),
    closure_reason: z.string().nullable().optional(),
    day_of_week: z.string().optional().default(""),

    menu_items: z.array(z.object({
        category: z.string().default("Hlavní jídlo"),
        name: z.string(),
        price: z.union([z.number(), z.string()])
            .transform((val) => {
                if (typeof val === 'number') return val;
                const parsed = parseInt(val.replace(/\D/g, ''));
                return isNaN(parsed) ? 0 : parsed;
            }),
        allergens: z.array(z.string()).default([])
    })).default([]),

    daily_menu: z.boolean().default(true),
    source_url: z.string().optional()
});

export type ValidatedMenu = z.infer<typeof MenuZodSchema>;

export interface MenuRequest {
    url: string;
    date: string;
}

export interface CacheRow {
    key: string;
    data: string;
    created_at: number;
    expires_at: number;
}