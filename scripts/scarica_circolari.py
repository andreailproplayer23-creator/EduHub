import requests
from bs4 import BeautifulSoup
import hashlib
from datetime import datetime, timezone
import time

# INSERISCI QUI LO STESSO projectId CHE HAI IN js/firebase-config.js
PROJECT_ID = "eduhub-b2889"
FIRESTORE_URL = f"https://firestore.googleapis.com/v1/projects/{PROJECT_ID}/databases/(default)/documents/circolari_scuola"
URL_BASE = "https://www.iisgiorgiwoolf.edu.it"
URL_START = f"{URL_BASE}/gw/circolare/"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def ottieni_dettagli_circolare(url_circolare):
    try:
        res = requests.get(url_circolare, headers=HEADERS, timeout=12)
        soup = BeautifulSoup(res.text, "html.parser")
        
        titolo_tag = soup.find('h1')
        titolo = titolo_tag.get_text(strip=True) if titolo_tag else "Titolo non trovato"
        
        if "le circolari" in titolo.lower() or titolo == "Titolo non trovato":
            return None

        descrizione = ""
        p_tags = soup.find_all('p')
        for p in p_tags:
            testo_p = p.get_text(strip=True)
            if len(testo_p) > 20 and "allegat" not in testo_p.lower() and "stampa" not in testo_p.lower():
                descrizione = testo_p
                break

        link_pdf = url_circolare
        for a in soup.find_all('a', href=True):
            href = a['href']
            if href.lower().endswith('.pdf') or 'scarica' in a.get_text(strip=True).lower():
                link_pdf = URL_BASE + href if href.startswith('/') else href
                if link_pdf.lower().endswith('.pdf'):
                    break 
                    
        return {
            "titolo": titolo,
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
    link_circolari = []
    
    try:
        print("Ricerca categorie A.S. 2026/2027 in corso...")
        res_start = requests.get(URL_START, headers=HEADERS, timeout=12)
        soup_start = BeautifulSoup(res_start.text, "html.parser")
        
        link_categorie = set()
        for a in soup_start.find_all('a', href=True):
            href = a['href']
            # Filtra rigorosamente SOLO l'anno scolastico 2026/2027
            if '/gw/tipologia-circolare/' in href and '2026-2027' in href:
                url_cat = URL_BASE + href if href.startswith('/') else href
                link_categorie.add(url_cat.rstrip('/') + '/')
                
        for url_cat in sorted(link_categorie):
            pagina = 1
            while True:
                url_pagina = url_cat if pagina == 1 else f"{url_cat}page/{pagina}/"
                print(f"Analizzo: {url_pagina}")
                res_cat = requests.get(url_pagina, headers=HEADERS, timeout=12)
                
                # Se la pagina non esiste (404), passiamo alla categoria successiva
                if res_cat.status_code != 200:
                    break
                    
                soup_cat = BeautifulSoup(res_cat.text, "html.parser")
                nuove_trovate = 0
                
                for a in soup_cat.find_all('a', href=True):
                    href = a['href']
                    if '/gw/circolare/' in href and '/tipologia-circolare/' not in href and href.rstrip('/') != '/gw/circolare':
                        url_completo = URL_BASE + href if href.startswith('/') else href
                        if url_completo not in links_visitati:
                            links_visitati.add(url_completo)
                            link_circolari.append(url_completo)
                            nuove_trovate += 1
                
                # Se in questa pagina non c'erano nuove circolari, abbiamo finito le pagine
                if nuove_trovate == 0:
                    break
                    
                pagina += 1
                time.sleep(0.2)
        
        print(f"\nTrovate in totale {len(link_circolari)} circolari A.S. 2026/2027. Inizio download...")
        
        for url_circ in link_circolari: 
            dati = ottieni_dettagli_circolare(url_circ)
            if dati:
                circolari.append(dati)
            time.sleep(0.25)
            
    except Exception as e:
        print(f"Errore generale: {e}")
        
    return circolari

def pulisci_vecchie_circolari(id_validi):
    try:
        res = requests.get(f"{FIRESTORE_URL}?pageSize=300", timeout=12)
        if res.status_code == 200:
            docs = res.json().get("documents", [])
            for d in docs:
                doc_name = d["name"]  # es. projects/.../documents/circolari_scuola/<id>
                doc_id = doc_name.split("/")[-1]
                if doc_id not in id_validi:
                    requests.delete(f"https://firestore.googleapis.com/v1/{doc_name}")
                    print(f"[RIMOSSA VECCHIA] {doc_id}")
    except Exception as e:
        print(f"Avviso pulizia Firestore: {e}")

def salva_su_firebase(circolari):
    id_validi = set()
    for idx, circ in enumerate(circolari):
        doc_id = hashlib.md5(circ["titolo"].encode('utf-8')).hexdigest()
        id_validi.add(doc_id)
        doc_url = f"{FIRESTORE_URL}/{doc_id}"
        
        payload = {
            "fields": {
                "titolo": {"stringValue": circ.get("titolo", "")},
                "descrizione": {"stringValue": circ.get("descrizione", "")},
                "url": {"stringValue": circ.get("url", "")},
                "ordine": {"integerValue": str(idx)},
                "aggiornatoIl": {"timestampValue": circ["timestamp"]}
            }
        }
        
        requests.patch(doc_url, json=payload)
        print(f"[{idx + 1}/{len(circolari)}] Salvata: {circ['titolo'][:50]}...")
        
    pulisci_vecchie_circolari(id_validi)

if __name__ == "__main__":
    lista = estrai_circolari()
    salva_su_firebase(lista)
    print("\nSincronizzazione A.S. 2026/2027 completata!")