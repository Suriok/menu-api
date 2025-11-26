export interface MenuItem {
    category: string;
    name: string;
    price: number;
    allergens: string[];
}

export interface MenuResponse {
    restaurant_name: string;
    date: string;
    is_closed?: boolean;
    closure_reason?: string | null;
    day_of_week: string;
    menu_items: MenuItem[];
    daily_menu: boolean;
    source_url?: string;
    source?: 'cache' | 'network';
}

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