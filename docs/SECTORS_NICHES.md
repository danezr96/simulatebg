```md
# SECTORS_NICHES.md  
**SimulateBG – Sector & Niche Definitions (Authoritative v1.0)**

Dit document definieert **alle sectoren en niches** in SimulateBG.  
Het vormt de **economische ruggengraat** van de simulatie.

> **Belangrijk**
> - Sectoren bepalen **economisch gedrag**
> - Niches zijn **statisch, maar hebben onderling in de zelfde sector kleine verschillen**
> - Engine gebruikt uitsluitend deze parameters
> - UI toont ze, engine **interpreteert** ze

---

## 1. Structuur & uitgangspunten

### 1.1 Aantal
- **15 sectoren**
- **6 niches per sector**
- Totaal: **90 niches**

### 1.2 Wat een niche bepaalt
Elke niche heeft een `NicheConfig` met o.a.:

- Capex-intensiteit
- Marges
- Vraagvolatiliteit
- Prijselasticiteit
- Arbeids- & skill-intensiteit
- Regulatie-risico
- Afschrijvingstermijn
- Schaalbaarheid
- Ticket size
- Seizoenspatroon
- Concurrentievorm

➡️ **De sector is belangrijker dan de niche** voor simulatiegedrag.

---

## 2. Sector 1 – Horeca

### Niches
1. Café / Bar  
2. Casual Restaurant  
3. Fine Dining  
4. Hotel  
5. Dark Kitchen / Delivery  
6. Food Truck  

**Kenmerken**
- Hoge arbeidsintensiteit
- Seizoensgevoelig
- Lage tot middelhoge marges
- Sterke prijselasticiteit

---

## 3. Sector 2 – Retail (Physical)

### Niches
1. Supermarkt  
2. Kledingwinkel  
3. Elektronicazaak  
4. Speciaalzaak  
5. Convenience Store  
6. Outlet  

**Kenmerken**
- Lage marges
- Hoog volume
- Hoge concurrentiedruk
- Lage switching costs

---

## 4. Sector 3 – E-commerce

### Niches
1. General Webshop  
2. Niche Webshop  
3. Subscription Commerce  
4. Marketplace Seller  
5. Dropshipping  
6. D2C Brand  

**Kenmerken**
- Lage capex
- Hoge marketingdruk
- Schaalbaar
- Volatiele vraag

---

## 5. Sector 4 – Tech / IT / SaaS

### Niches
1. SaaS B2B  
2. SaaS B2C  
3. IT Consultancy  
4. Managed Services  
5. App Development  
6. Cloud Infrastructure  

**Kenmerken**
- Hoge skill-intensiteit
- Hoge marges
- Lage marginale kosten
- Lange onboarding-tijd personeel

---

## 6. Sector 5 – Bouw & Aannemerij

### Niches
1. Woningbouw  
2. Utiliteitsbouw  
3. Renovatie  
4. Installatietechniek  
5. Infra & Wegenbouw  
6. Projectontwikkeling  

**Kenmerken**
- Project-based omzet
- Hoge ticket size
- Cyclisch
- Hoge capex

---

## 7. Sector 6 – Logistiek & Transport

### Niches
1. Wegtransport  
2. Warehousing  
3. Last-mile delivery  
4. Koeriersdiensten  
5. Cold Chain Logistics  
6. Freight Forwarding  

**Kenmerken**
- Lage marges
- Brandstofgevoelig
- Hoge asset-afschrijving
- Volume-afhankelijk

---

## 8. Sector 7 – Vastgoed Exploitatie

### Niches
1. Kantoorverhuur  
2. Winkelvastgoed  
3. Logistiek vastgoed  
4. Woonverhuur  
5. Hotelvastgoed  
6. Mixed-use vastgoed  

**Kenmerken**
- Kapitaalintensief
- Lage volatiliteit
- Sterk rentegevoelig
- Lange afschrijving

---

## 9. Sector 8 – Productie / Manufacturing

### Niches
1. Metaalbewerking  
2. Consumentengoederen  
3. Machinebouw  
4. Chemische productie  
5. Voedselproductie  
6. High-tech manufacturing  

**Kenmerken**
- Hoge capex
- Middelhoge marges
- Capaciteitsbeperkingen
- Schaalvoordelen

---

## 10. Sector 9 – Landbouw & Food

### Niches
1. Akkerbouw  
2. Veeteelt  
3. Glastuinbouw  
4. Biologische landbouw  
5. Food Processing  
6. Agri-Tech  

**Kenmerken**
- Seizoensgebonden
- Weersafhankelijk (events)
- Lage marges
- Hoge volatiliteit

---

## 11. Sector 10 – Energie & Utilities

### Niches
1. Energieproductie  
2. Hernieuwbare energie  
3. Netbeheer  
4. Water utilities  
5. Afvalverbranding  
6. Warmtenetten  

**Kenmerken**
- Sterk gereguleerd
- Lage volatiliteit
- Kapitaalintensief
- Lage prijselasticiteit

---

## 12. Sector 11 – Zorg & Welzijn

### Niches
1. Ziekenhuizen  
2. Klinieken  
3. Ouderenzorg  
4. Thuiszorg  
5. GGZ  
6. Medische laboratoria  

**Kenmerken**
- Hoge regulatie
- Lage prijselasticiteit
- Hoge arbeidskosten
- Stabiele vraag

---

## 13. Sector 12 – Media & Entertainment

### Niches
1. Streaming platforms  
2. Game studios  
3. Filmproductie  
4. Events & festivals  
5. Publishing  
6. Influencer agencies  

**Kenmerken**
- Onvoorspelbare hits
- Hoge marketingimpact
- Volatiele omzet
- Lage vaste activa

---

## 14. Sector 13 – Finance & Services

### Niches
1. Accountancy  
2. Consultancy  
3. Legal services  
4. Asset management  
5. FinTech  
6. Insurance brokers  

**Kenmerken**
- Hoge marges
- Lage capex
- Reputatie-gedreven
- Skill-intensief

---

## 15. Sector 14 – Automotive & Mobiliteit

### Niches
1. Autodealers  
2. Leasebedrijven  
3. Fleet management  
4. EV charging  
5. Mobility-as-a-Service  
6. Automotive repair  

**Kenmerken**
- Asset-heavy
- Cyclisch
- Rentegevoelig
- Middelmatige marges

---

## 16. Sector 15 – Afval & Recycling

### Niches
1. Inzameling  
2. Recycling  
3. Hazardous waste  
4. E-waste  
5. Composting  
6. Waste-to-energy  

**Kenmerken**
- Contract-based
- Lage prijselasticiteit
- Sterk gereguleerd
- Stabiele cashflows

---

## 17. Samenvatting – economische diversiteit

| Eigenschap | Laag | Middel | Hoog |
|---------|------|--------|------|
| Capex | SaaS | Horeca | Energie |
| Volatiliteit | Utilities | Retail | Media |
| Marges | Logistiek | Bouw | Finance |
| Regulatie | E-commerce | Zorg | Energie |

---

## 18. Ontwerpregels (heilig)

1. sectoren bepalen gedrag, niet niches  
2. Geen niche zonder duidelijke zwakte  
3. Hoge marge = andere risico’s  
4. Stabiliteit = lagere groei  
5. Elke niche moet *faalbaar* zijn  

---

**Status:** v1.0 – FINAL  
**Wijzigingen hierna = breaking**

Volgende document:
➡️ `docs/SEASON_PRESETS.md`
```
