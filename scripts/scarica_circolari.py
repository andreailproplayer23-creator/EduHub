import re
import time
import hashlib
from datetime import datetime, timezone
import requests
from bs4 import BeautifulSoup

PROJECT_ID = "eduhub-b2889"
FIRESTORE_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/circolari_scuola"
URL_BASE = "https://www.iisgiorgiwoolf.edu.it"
URL_START = f"{URL_BASE}/gw/circolare/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
}

session = requests.Session()
session.headers.update(HEADERS)


def estrai_numero_circolare(testo):
    match = re.search(r"circ\.?\s*n\.?\s*(\d+)", testo, re.IGNORECASE)
    return int(match.group(1)) if match else 0


def ottieni_dettagli_circolare(url_circolare, numero_hint=0):
    try:
        res = session.get(url_circolare, timeout=12)
        if res.status_code != 200:
            return None
        soup = BeautifulSoup(res.text, "html.parser")

        titolo_tag = soup.find("h1")
        titolo = titolo_tag.get_text(strip=True) if titolo_tag else "Titolo non trovato"

        if "le circolari" in titolo.lower() or titolo == "Titolo non trovato":
            return None

        testo_pagina = soup.get_text(" ", strip=True)
        numero = numero_hint or estrai_numero_circolare(testo_pagina)

        descrizione = ""
        for p in soup.find_all("p"):
            testo_p = p.get_text(strip=True)
            if len(testo_p) > 20 and "allegat" not in testo_p.lower() and "stampa" not in testo_p.lower():
                descrizione = testo_p
                break

        link_pdf = url_circolare
        for a in soup.find_all("a", href=True):
            href = a["href"]
            if href.lower().endswith(".pdf") or "scarica" in a.get_text(strip=True).lower():
                link_pdf = URL_BASE + href if href.startswith("/") else href
                if link_pdf.lower().endswith(".pdf"):
                    break

        titolo_completo = f"Circ. n.{numero} - {titolo}" if numero and f"n.{numero}" not in titolo.lower() else titolo

        return {
            "numero": numero,
            "titolo": titolo_completo,
            "descrizione": descrizione[:180] + "..." if len(descrizione) > 180 else descrizione,
            "url": link_pdf,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
    except Exception as e:
        print(f"Errore su {url_circolare}: {e}")
        return None


def estrai_circolari():
    circolari = []
    links_visitati = set()
    candidati = []  # lista di tuple (url_completo, numero_hint)

    try:
        print("Ricerca categorie A.S. 2026/2027 in corso...")
        res_start = session.get(URL_START, timeout=12)
        soup_start = BeautifulSoup(res_start.text, "html.parser")

        link_categorie = set()
        for a in soup_start.find_all("a", href=True):
            href = a["href"]
            if "/gw/tipologia-circolare/" in href and "2026-2027" in href:
                url_cat = URL_BASE + href if href.startswith("/") else href
                link_categorie.add(url_cat.rstrip("/") + "/")

        for url_cat in sorted(link_categorie):
            pagina = 1
            while True:
                url_pagina = url_cat if pagina == 1 else f"{url_cat}page/{pagina}/"
                print(f"Analizzo: {url_pagina}")
                res_cat = session.get(url_pagina, timeout=12)
                if res_cat.status_code != 200:
                    break

                soup_cat = BeautifulSoup(res_cat.text, "html.parser")
                nuove_trovate = 0

                for a in soup_cat.find_all("a", href=True):
                    href = a["href"]
                    if "/gw/circolare/" in href and "/tipologia-circolare/" not in href and href.rstrip("/") != "/gw/circolare":
                        url_completo = URL_BASE + href if href.startswith("/") else href
                        if url_completo not in links_visitati:
                            links_visitati.add(url_completo)
                            blocco_testo = a.parent.get_text(" ", strip=True) if a.parent else ""
                            num_hint = estrai_numero_circolare(blocco_testo)
                            candidati.append((url_completo, num_hint))
                            nuove_trovate += 1

                if nuove_trovate == 0:
                    break

                pagina += 1
                time.sleep(0.1)

        # Ordina subito dal numero di circolare più alto (es. 205, 204, 203...)
        candidati.sort(key=lambda x: x[1], reverse=True)
        print(f"\nTrovate in totale {len(candidati)} circolari A.S. 2026/2027. Inizio download...")

        for url_circ, num_hint in candidati:
            dati = ottieni_dettagli_circolare(url_circ, num_hint)
            if dati:
                circolari.append(dati)
            time.sleep(0.1)

        # Riordina definitivamente per numero decrescente
        circolari.sort(key=lambda c: c.get("numero", 0), reverse=True)

    except Exception as e:
        print(f"Errore generale: {e}")

    return circolari


def pulisci_vecchie_circolari(id_validi):
    try:
        res = session.get(f"{FIRESTORE_URL}?pageSize=300", timeout=12)
        if res.status_code == 200:
            docs = res.json().get("documents", [])
            for d in docs:
                doc_name = d["name"]
                doc_id = doc_name.split("/")[-1]
                if doc_id not in id_validi:
                    session.delete(f"https://firestore.googleapis.com/v1/{doc_name}")
                    print(f"[RIMOSSA VECCHIA] {doc_id}")
    except Exception as e:
        print(f"Avviso pulizia Firestore: {e}")


def salva_su_firebase(circolari):
    id_validi = set()
    for idx, circ in enumerate(circolari):
        doc_id = hashlib.md5(circ["url"].encode("utf-8")).hexdigest()
        id_validi.add(doc_id)
        doc_url = f"{FIRESTORE_URL}/{doc_id}"

        # Più alto è il numero della circolare, più basso è 'ordine' (così sta in cima!)
        numero = circ.get("numero", 0)
        ordine_val = (100000 - numero) if numero > 0 else (50000 + idx)

        payload = {
            "fields": {
                "titolo": {"stringValue": circ.get("titolo", "")},
                "descrizione": {"stringValue": circ.get("descrizione", "")},
                "url": {"stringValue": circ.get("url", "")},
                "numero": {"integerValue": str(numero)},
                "ordine": {"integerValue": str(ordine_val)},
                "aggiornatoIl": {"timestampValue": circ["timestamp"]}
            }
        }

        res = session.patch(doc_url, json=payload, timeout=12)
        if res.status_code not in (200, 201):
            print(f"[ERRORE FIRESTORE {res.status_code}] {res.text[:140]}")
            break
        print(f"[{idx + 1}/{len(circolari)}] Salvata: {circ['titolo'][:55]}...")

    if id_validi:
        pulisci_vecchie_circolari(id_validi)


if __name__ == "__main__":
    lista = estrai_circolari()
    if lista:
        salva_su_firebase(lista)
        print("\nSincronizzazione A.S. 2026/2027 completata!")
    else:
        print("\nNessuna circolare estratta.")