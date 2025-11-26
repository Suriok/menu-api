
# Použité technologie

* **Jazyk:** TypeScript / Node.js
* **Server:** Express.js
* **AI Integrace:** OpenAI SDK (připojeno na Perplexity API, model `sonar`)
* **HTTP Klient:** Native Fetch
* **Databáze / Cache:** SQLite
* **Testy:** Jest + Supertest

---

## Implementace požadavků a architektura

### Web Content Retrieval (Varianta A + B Hybrid)
Pro získání obsahu stránky jsem zvolila **hybridní přístup**:
* Používám **HTTP request** (fetch) pro stažení surového HTML textu stránky.
* **Důvod:** Původně zamýšlená Varianta B (čistý LLM browsing) selhávala u některých českých webů (zejména těch s `iframe` menu, např. *Menicka.cz*). Přímé stažení textu a jeho následné předání do LLM se ukázalo jako nejspolehlivější metoda (RAG pattern).

### LLM Integrace a Tool Calling
Jako LLM model je použit **Perplexity Sonar**.

* **Structured Output & Tool Calling:**
  * Model `sonar` v současné době plně nepodporuje nativní parametr `tools` (při použití vrací chybu `400 Bad Request`).
  * Místo toho jsem implementovala **Simulated Tool Calling** pomocí **Structured System Prompting**.
  * **Důvod:** Toto alternativní řešení plně nahrazuje funkcionalitu tool callingu:
    1. **Struktura:** Definice JSON schématu je vložena přímo do systémové instrukce (`System Message`).
    2. **Validace:** Prompt explicitně vynucuje datové typy (např. *"Price must be integer"*), čímž splňuje požadavek na normalizaci dat a strukturovaný výstup.

### Caching (SQLite)
Pro ukládání dat využívám persistentní databázi **SQLite** (soubor `menu.db`).
* **Klíč:** Kombinace `URL` + `Datum`.
* **Smart TTL Strategie (Invalidace):**
  * **Standardní:** Úspěšně stáhnutá data jsou uložena na **24 hodin**.
  * **Short-lived:** Pokud je menu prázdné nebo je restaurace zavřená, cache expiruje už za **30 minut** (pro případ, že restaurace nahraje menu se zpožděním).
  * **Invalidace:** Staré záznamy jsou automaticky mazány při každém novém requestu.

### Řešení chybových stavů (Edge Cases)
Aplikace ošetřuje nestandardní situace:
* **HTTP Chyby:** Rozlišuje mezi nedostupnou stránkou (404), timeoutem serveru a interní chybou.
* **Zavřeno / Svátky:** LLM detekuje fráze jako *"Dnes zavřeno"* nebo *"Státní svátek"* a vrací příznak `is_closed: true` s důvodem uzavření.

---

# Instalace a spuštění

###  Instalace závislostí
Před prvním spuštěním je nutné nainstalovat potřebné balíčky:
```
npm install
```

### Nastavení API klíče
Aby aplikace fungovala, musíte nastavit přístup k AI.

1. Vytvorte soubor `.env` v kořenovém adresáři projektu.
2. Vložte svůj API klíč:
```
PERPLEXITY_API_KEY=pplx-vas-klic-zde...
PORT=3000
```

### Spuštění serveru
Otevřete terminál a spusťte:
```
npm start
```
Počkejte, dokud se neobjeví zpráva: Server running on http://localhost:3000.

### Spouštění testů
Pro spuštění všech testů zadejte do terminálu:

```npm test
```

---

## Řešení chybových stavů a Edge Cases

Aplikace je navržena tak, aby byla odolná vůči nestandardním situacím:

1.  **Nedostupnost stránky (404/Timeout):**
  * API rozlišuje mezi chybou klienta (špatná URL) a výpadkem serveru restaurace. Vrací přesné HTTP status kódy.

2.  **Nekonzistentní data:**
  * **Ceny:** LLM normalizuje různé formáty ("145,-", "145 Kč") na čistý `integer`.
  * **Alergeny:** Pokud v textu chybí, vrací prázdné pole (prevence halucinací).

3.  **Chybějící menu pro dnešní den:**
  * Pokud restaurace menu ještě nenahrála, aplikace nastaví **krátkou expiraci cache (30 min)**, aby se data brzy zkusila stáhnout znovu.

4.  **Zavřeno / Svátky:**
  * Model detekuje klíčová slova jako *"Zavřeno"* nebo *"Státní svátek"* a vrací příznak `is_closed: true`.

5.  **Cache Invalidation:**
  * **Smart TTL:** 24 hodin pro validní menu, 30 minut pro prázdné/chybné menu.
  * **Manual Refresh:** Parametr `?refresh=true` vynutí okamžité smazání cache a nové stažení dat.

6.  **Menu pouze jako obrázek:**
  * *Limitace:* Aplikace zpracovává pouze textové HTML. Podpora pro obrázková menu (OCR / Vision LLM) je plánována jako budoucí rozšíření.