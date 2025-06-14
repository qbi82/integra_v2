## Projekt zaliczeniowy z laboratorium "Programowanie aplikacji internetowych"

## Tematyka projektu: Zestawienie danych na temat wysokości stóp procentowych i cen mieszkań w okresie ostatnich 10 lat, z uwzględnieniem regionów i typów mieszkań.

### Krótki opis projektu
Aplikacja umożliwia przeglądanie i analizę danych dotyczących średnich cen mieszkań oraz stóp referencyjnych NBP w Polsce w podziale na regiony i typy mieszkań. Użytkownik może filtrować dane, generować wykresy, eksportować dane do plików XML/JSON oraz korzystać z panelu uwierzytelniania. Dane są pobierane z zewnętrznych API (NBP, BDL), zapisywane w bazie MySQL i prezentowane w nowoczesnym interfejsie webowym.

## Autorzy: Maciej Targoński, Jakub Tadewicz

## Funkcjonalności:
- uwierzytelnianie użytkowników (JWT)
- przeglądanie wykresów cen mieszkań i stóp procentowych
- filtrowanie danych wg regionu i typu mieszkania
- eksport danych w formacie XML lub JSON
- pobieranie i zapis danych z zewnętrznych API (NBP, BDL)
- zapis i odczyt danych z bazy danych przez ORM (Sequelize)
- obsługa transakcji przy zapisie danych

## Narzędzia i technologie:
- strona serwera: Node.js (Express), ORM: Sequelize
- baza danych: MySQL
- strona klienta: React, Chart.js, React Chart.js 2
- autoryzacja: JWT
- eksport: json2xml, archiver
- docker-compose (baza danych, phpmyadmin)

## Wymagania

Wersje programów wykorzystane do tworzenia aplikacji:
- Node.js 21.5.0
- MySQL 8.x (uruchamiany przez Docker)
- Docker/Docker Compose
- React 19.x
- npm 10.x

## Uruchomienie

1. Uruchom bazę danych i phpmyadmin:
    docker-compose up -d
 
2. Zainstaluj zależności backendu:
    cd server
    npm install

4. Zainstaluj zależności frontendowe:
    cd client
    npm install

5. Uruchom backend:
    cd server
    npm start

6. Uruchom frontend:
    cd client
    npm start

7. Otwórz aplikację w przeglądarce pod adresem: (http://localhost:3000)

## Uwagi

- Domyślne dane logowania należy utworzyć przez rejestrację w aplikacji.
- Panel phpMyAdmin dostępny jest pod adresem: (http://localhost:8080) (login: root, hasło: root)
- Backend nasłuchuje na porcie 4000, frontend na 3000.

## Konta testowe
- Można stworzyć własne konto przez formularz rejestracji