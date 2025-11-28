import { MenuZodSchema } from '../src/schema/validation';
import { fetchPageContent } from '../src/services/scraper';

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('Unit Tests', () => {

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Validation Logic (Zod Schema)', () => {

        test('Should normalize price string "145,-" to integer 145', () => {
            const rawData = {
                restaurant_name: "Test",
                date: "2025-10-22",
                menu_items: [{ name: "Svíčková", price: "145,- Kč" }]
            };

            const result = MenuZodSchema.parse(rawData);
            expect(result.menu_items[0].price).toBe(145);
            expect(typeof result.menu_items[0].price).toBe('number');
        });

        test('Should handle missing optional fields (defaults)', () => {
            const rawData = {
                restaurant_name: "Test",
                date: "2025-10-22",
            };

            const result = MenuZodSchema.parse(rawData);

            expect(result.is_closed).toBe(false);
            expect(result.menu_items).toEqual([]);
        });

        test('Should normalize mixed price formats', () => {
            const rawData = {
                restaurant_name: "Test", date: "2025-10-22",
                menu_items: [
                    { name: "A", price: 150 },
                    { name: "B", price: "120" },
                    { name: "C", price: "cca 100,-"}
                ]
            };

            const result = MenuZodSchema.parse(rawData);
            expect(result.menu_items[0].price).toBe(150);
            expect(result.menu_items[1].price).toBe(120);
            expect(result.menu_items[2].price).toBe(100);
        });
    });

    describe('Scraper Logic (fetchPageContent)', () => {

        test('Should throw specific object on 404 error', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 404,
                statusText: "Not Found"
            });

            await expect(fetchPageContent('https://bad-url.com'))
                .rejects
                .toMatchObject({ status: 404 });
        });

        test('Should throw specific object on 500 error', async () => {
            mockFetch.mockResolvedValue({
                ok: false,
                status: 500,
                statusText: "Server Error"
            });

            await expect(fetchPageContent('https://error.com'))
                .rejects
                .toMatchObject({ status: 500 });
        });

        test('Should handle Network Timeout correctly', async () => {
            mockFetch.mockRejectedValue({
                name: 'TimeoutError'
            });

            await expect(fetchPageContent('https://slow.com'))
                .rejects
                .toMatchObject({ status: 504, message: "Timeout" });
        });

        test('Should return cleaned HTML on success', async () => {
            mockFetch.mockResolvedValue({
                ok: true,
                text: async () => '<html><script>bad</script><body>   Menu   </body></html>'
            });

            const result = await fetchPageContent('https://good.com');

            expect(result).not.toContain('<script>');
            expect(result).toContain('Menu');
        });
    });
});