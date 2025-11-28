import request from 'supertest';
import Database from 'better-sqlite3';

const mockFetch = jest.fn();
global.fetch = mockFetch;
const mockCreate = jest.fn();

// @ts-ignore
global.mockOpenAICreate = mockCreate;

jest.mock('openai', () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => {
            return {
                chat: {
                    completions: {
                        // @ts-ignore
                        create: global.mockOpenAICreate
                    }
                }
            };
        })
    };
});

import app from '../server';

describe('Tests', () => {

    beforeEach(() => {
        const db = new Database('menu.db');
        try { db.exec("DELETE FROM cache"); } catch (e) {}
        jest.clearAllMocks();
    });

    test('Should return 400 if URL is missing', async () => {
        const res = await request(app)
            .post('/summarize')
            .send({ date: '2025-10-22' });

        expect(res.statusCode).toBe(400);
    });

    test('Should download menu and return JSON', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => '<html><body>Menu</body></html>'
        });

        mockCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: JSON.stringify({
                        restaurant_name: "Test Rest",
                        date: "2025-10-22",
                        menu_items: [{ category: "Hlavní", name: "Jídlo", price: 100, allergens: [] }],
                        daily_menu: true,
                        is_closed: false
                    })
                }
            }]
        });

        const res = await request(app)
            .post('/summarize')
            .send({ url: 'https://test.com', date: '2025-10-22' });

        expect(res.statusCode).toBe(200);
        expect(res.body.restaurant_name).toBe("Test Rest");
        expect(res.body.source).toBe('network');
    });

    test('Should use CACHE for second request', async () => {
        mockFetch.mockResolvedValue({ ok: true, text: async () => '<html>Menu</html>' });

        mockCreate.mockResolvedValue({
            choices: [{ message: { content: JSON.stringify({
                        restaurant_name: "Cache Rest",
                        date: "2025-11-29",
                        menu_items: [],
                        daily_menu: true
                    })}}]
        });

        await request(app).post('/summarize').send({ url: 'https://cache.com', date: '2025-10-22' });
        const res2 = await request(app).post('/summarize').send({ url: 'https://cache.com', date: '2025-10-22' });

        expect(res2.body.source).toBe('cache');
        expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    test('Should handle closed restaurant correctly', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            text: async () => '<html>Zavřeno</html>'
        });

        mockCreate.mockResolvedValue({
            choices: [{
                message: {
                    content: JSON.stringify({
                        restaurant_name: "Closed Rest",
                        date: "2025-10-22",
                        is_closed: true,
                        closure_reason: "Svátek",
                        menu_items: [],
                        daily_menu: false
                    })
                }
            }]
        });

        const res = await request(app)
            .post('/summarize')
            .send({ url: 'https://closed.com', date: '2025-10-22' });

        expect(res.statusCode).toBe(200);
        expect(res.body.is_closed).toBe(true);
        expect(res.body.closure_reason).toBe("Svátek");
    });
});