# Orden en la cola

![image](1584006124-8ae74ce392-cola.png)

Para entrar en un sitio hay que coger un ticket con un número y esperar en la cola.
Hay gente que se cansa de esperar y abandona la cola. Y hay otros que tratan de colarse…

Cuando a uno le toca entrar y tiene un número mayor del que tocaría, **la única forma de saber si realmente se ha colado es ver si de los que van por detrás de él en la cola hay alguien que tiene un número más bajo**.

Se desea hacer un programa que diga, por cada persona que hay en la cola, por delante de cuántas personas se han colado.

## Input

El primer numero  indica la cantidad de gente que hay en la cola.

A continuación vienen los  números de ticket de cada persona.

## Output

Se imprimirá (en orden de aparición en la cola) el número de ticket de las personas que se hayan colado, y por delante de cuántas personas se ha colado. Con el siguiente formato:

```text
La persona con el ticket T se ha colado por delante de X personas.
```

Si no se ha colado nadie se escribirá .
