export const MENU_SCHEMA = {
    name: "restaurant_menu_parser",
    strict: true,
    schema: {
        type: "object",
        properties: {
            restaurant_name: { type: "string" },
            date: { type: "string", description: "Format YYYY-MM-DD" },
            is_closed: { type: "boolean" },
            closure_reason: { type: ["string", "null"] },
            day_of_week: { type: "string" },
            menu_items: {
                type: "array",
                items: {
                    type: "object",
                    properties: {
                        category: { type: "string" },
                        name: { type: "string" },
                        price: { type: "integer" },
                        allergens: {
                            type: "array",
                            items: { type: "string" }
                        }
                    },
                    required: ["name", "price"],
                    additionalProperties: false
                }
            },
            daily_menu: { type: "boolean" }
        },
        required: ["restaurant_name", "date", "menu_items", "daily_menu", "is_closed"],
        additionalProperties: false
    }
};