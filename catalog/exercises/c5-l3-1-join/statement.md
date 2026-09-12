# JOIN

Donades les tuples de les següents relacions:

![image](1556869986-ef1ae97bb9-db2.png)

Realitza la següent consulta:

```text
SELECT name, merchants.name AS merchant, price
FROM products
    JOIN merchants ON product.merchant_id = merchants.id
```

## Input

La entrada consisteix en les tuples per a les taules 'products', 'merchants'.
En primer lloc va el nombre de tuples i després les tuples, cadascuna en una línia.

Per a la taula **products** el format de cada tupla és:

```text
id id_merchant nom price
```

Per a la taula **merchants** el format és:

```text
id nom
```

No hi ha cap restricció significativa

## Output

La sortida serà el resultat de la consulta en format taula:

```text
name            |merchant        |price
----------------+----------------+----------
```

L'amplada de les columnes 'name' i 'merchant' és 16, i la 'price' és 10. El preu s'haurà de posar amb dos decimals.

Tot el text s'ha d'aliniar a l'esquerra.

Per últim caldrà indicar el número de tuples retornades per la consulta: "(X rows)"
