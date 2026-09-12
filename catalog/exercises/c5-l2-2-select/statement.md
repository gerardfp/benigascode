# SELECT

Donades les tuples de la següent relació:

![image](1556888264-0b788b0491-db3.png)

Realitza les següents consultes:

```text
SELECT *
    FROM patients
```

```text
SELECT *
    FROM patients
    WHERE LOWER(name) LIKE %pa% OR LOWER(lastname) LIKE %er%
```

```text
SELECT name, lastname, birthdate
    FROM patients
    WHERE birthdate BETWEEN '1707-04-15' AND '1937-12-26'
```

```text
SELECT name, lastname, weight/height^2 AS ims
    FROM patients
    WHERE weight/height^2  25 AND (diabetes IS TRUE || hepatitis IS TRUE)
```

## Input

El primer nombre indica el la quantitat de tuples que venen a continuació.

El format de cada tupla és:

```text
id lastname, name, birthdate, height, weight, diabetes, hepatitis
```

Els valors de l'atribut birthdate estan en format 'YYYY-MM-DD'

Els booleans s'expresen amb {0|1}

En les dades d'entrada poden haver diversos espais en blanc entre els diferents atributs.

## Output

El format de sortida serà en format taula:

```text
col1   |col2   |col3
-------+-------+-------
val    |val    |val
val    |val    |val
```

Els noms de les columnes s'aliniaran a l'esquerra.

El format dels valors ha de ser:

- Integer: amplada 4, aliniat a l'esquerra

- String: amplada 16, aliniat a l'esquerra

- Data: amplada 12, aliniat a la dreta

- Float: amplada 10, aliniat a la dreta, amb dues xifres decimals

- Boolean: amplada 10, aliniat a la dreta, {true|false}

S'ha de deixar una separació de 2 salts de línia entre cada resultat.
