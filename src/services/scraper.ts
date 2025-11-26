export const fetchPageContent = async (url: string): Promise<string> => {
    try {
        const pageResponse = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            signal: AbortSignal.timeout(10000) // 10s
        });

        if (!pageResponse.ok) {
            throw { status: pageResponse.status, message: `HTTP Error ${pageResponse.status}` };
        }

        const html = await pageResponse.text();

        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 15000);

    } catch (err: any) {
        if (err.name === 'TimeoutError' || err.name === 'AbortError') {
            throw { status: 504, message: "Timeout" };
        }
        throw err;
    }
};