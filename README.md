# Anestesiahelppi Local AI

Erillinen kokeilu: voisiko Anestesiahelpin avustaja tiivistää annettua tekstiä käyttäjän omalla puhelimella ilman maksullista tekoälyrajapintaa? Nykyistä Anestesiahelppiä ei muuteta tässä projektissa.

## Nykyinen kokeilu (0.4.0)

- WebLLM ja WebGPU selaimessa; laskenta Web Workerissa.
- Aluksi käytössä on Qwen3-1.7B (q4f16_1). Pitkä päättely on pois käytöstä jokaisessa kyselyssä.
- Käyttäjä liittää lyhyen lähdeotteen; jokainen kysymys käsitellään erikseen.
- Latauksen eteneminen, vastauksen suoratoisto, keskeytys, kopiointi ja ajoitus.
- Ei API-avainta, pilvivarajärjestelmää, analytiikkaa eikä potilastietoja.

## Käynnistys

Node.js 22.12+ tai 24:

```sh
npm install
npm test
npm run dev
```

Julkaisupaketti: `npm run build`. Hakemisto `dist` voidaan julkaista staattisena HTTPS-sivustona. iPhonella avaa HTTPS-osoite Safarissa; tietokoneen localhost toimii kehityksessä, puhelimen HTTP-LAN-osoite ei riitä WebGPU:lle. Sivua ei voi käynnistää avaamalla index.html tiedostona.

## iPhone-testi

1. Avaa sivu päivitetyssä Safarissa ja pidä sivu etualalla.
2. Käynnistä Qwen3-1.7B Wi-Fissä. WebLLM arvioi mallin muistitarpeeksi noin 2,0 Gt. Latauksen koko on eri asia kuin käytönaikainen muisti.
3. Täytä tekninen testiesimerkki ja kysy listan sijainnista.
4. Kysy sitten harjoituksen kestoa. Oikea toiminta: mallin pitäisi kertoa, ettei tietoa ole lähteessä.
5. Kokeile lähteeseen lisättyä ristiriitaista käskyä. Pelkkä järjestelmäohje ei takaa lähteissä pysymistä.
6. Testaa kymmenen kysymystä peräkkäin ja kirjaa mahdollinen sivun uudelleenlataus.
7. Kirjaa laite/iOS, malli, ensimmäisen tekstin aika, kokonaisaika, suomen laatu, lähteen ulkopuoliset väitteet ja lämpeneminen.

Safari 26 toi WebGPU-tuen, mutta se ei takaa tämän mallin toimivuutta jokaisella laitteella. Aidon iPhonen suorituskyky ja vastausten laatu ovat vielä testaamatta.

## Tietovirta ja rajat

Sivun lataus ottaa yhteyden sivuston palvelimeen. WebLLM lataa mallin ja ajotiedostot ulkoisilta palvelimilta (mm. Hugging Face ja MLC:n GitHub). Palvelimet näkevät tavalliset latauspyynnöt. Oma sovelluskoodi ei lähetä lähdetekstiä tai kysymystä palvelimelle. Mallitiedostoja voidaan välimuistittaa; selain voi myös poistaa ne. Tekstejä ei tallenneta pysyvästi. Offline-käynnistystä ei tässä versiossa taata eikä service workeria ole.

Haku toimii paikallisesti mukana tulevasta tai itse liitetystä aineistosta. Ei kliiniseen käyttöön. Generoitu vastaus voi olla virheellinen. Testit tarkistavat syötteen käsittelyä, eivät mallin luotettavuutta.

## Lähteet ja lisenssit

- https://webllm.mlc.ai/docs/user/basic_usage.html
- https://github.com/mlc-ai/web-llm (Apache-2.0)
- https://huggingface.co/Qwen/Qwen3-1.7B (Apache-2.0)
- https://webkit.org/blog/17333/webkit-features-in-safari-26-0/

Mallien omat lisenssit ja ehdot koskevat ladattuja mallipainoja. Mallipainoja ei sisällytetä tähän repoon.

## Tarkistus 15.11.2026

- Syötteenkäsittelyn testit: 3/3 läpi.
- Vite-tuotantokäännös onnistui; WebLLM aiheuttaa suuren JavaScript-paketin varoituksen.
- Selain: sivu avautui, testiesimerkki täyttyi, lähetys pysyi estettynä ilman mallia.
- Testiselaimesta ei saatu WebGPU-laitetta. Selkeä virheviesti näkyi ja uudelleenyritys jäi mahdolliseksi.
- Mallin latausta, generointia, keskeytystä, vastausten laatua tai iPhone-asettelua ei vielä vahvistettu toimivaksi.

## Lähdehaun mobiilikoe (0.2.0)

Valitse yksi ikäryhmä tai liitä korkeintaan 100 000 merkin oma aineisto. Erottele asiakohdat tyhjällä rivillä ja pidä asiayhteys (esimerkiksi ikäryhmä) otteessa. Mukana on 46 tekstiotetta Anestesiahelpin tiedoston `src/resuscitation/guides.json` aloitus- ja osioteksteistä. Ne ovat aineistonäyte, eivät kokonaisia ohjeita.

Kokeile ensin pelkkää lähdehakua: tämä ei lataa mallia. Sanahaku järjestää enintään kaksi korkeintaan 600 merkin otetta. Se ei ymmärrä kaikkia synonyymeja eikä varmista, että kysymykseen voi vastata. Suoran lainauksen tilassa malli palauttaa otteen tunnuksen ja sovellus näyttää vain alkuperäisen tekstin. Virheellinen tunnus ei tuota vastausta. Vapaassa vertailutilassa malli kirjoittaa vastauksen itse ja voi keksiä lukuja. Koko tekstin vertailu on rajattu 600 merkkiin.

**Toistettava puhelinkoe:** käytä ensin Lapset-aineistoa. Kysy “paco tavoite mmhg”, “Mikä on systolisen verenpaineen tarkka tavoite mmHg?” ja “Kuinka kauan harjoitus kestää?”. Tarkista erikseen (1) löytyykö oikea ote, (2) vastaako valittu ote kysymykseen ja (3) lisääkö vapaa vastaus lähteettömiä lukuja. Verenpaineotteessa ei ole numeerista tavoitetta. Viimeiseen kysymykseen aineistossa ei ole vastausta. Vaihda vertailutapaa muuttamatta kysymystä tai aineistoa. Kirjaa myös malli, puhelin, selain, viive ja mahdollinen sivun uudelleenlataus. Toista sitten omalla pidemmällä aineistolla sekä lyhenteillä ja kysymyksillä, joihin lähteessä ei ole vastausta. Otteiden hakutestit eivät mittaa mallin vastauslaatua.

Mobiilikokeen konteksti on 1024 ja vastauksen raja 150 tokenia. Kesken generoinnin uudelleen avautunut välilehti valitsee saman istunnon seuraaviin ajoihin Qwen3-0.6B:n. Malli ladataan käsin. Generointimerkintä ei todista muistin loppumista. pagehide kirjataan vain jos selain toimittaa tapahtuman.
