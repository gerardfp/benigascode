# Inventari en ordre

El software d'inventari que tenim a la xarxa obté diversa informació sobre l'estat dels equips de la xarxa. Hem configurat aquest software per a que reculli la següent informació de cada màquina:

- Adreça IP

- Memòria RAM instal·lada (Gb)

- Velocitat del processador (MHz)

- Espai de disc (Gb)

![image](1559040147-2ccf4973dc-inventari1.png)

Amb la informació recopilada podem generar l'inventari de màquines de la xarxa.

Ara el que ens interessa és poder ordenar l'inventari segons els diversos camps, establint l'ordre en que s'han de comparar aquests camps.

## Input

La primera línia indica l'ordre dels camps pels quals volem ordenar l'inventari. Per exemple:

```text
RAM DISC CPU IP
```

A continuació ve l'inventari en diverses línies. A cada línia hi trobem la informació d'un host (IP, RAM, CPU, DISC). Per exemple:

```text
192.168.1.1 16 4000 500
```

La entrada acaba amb la línia "**END**"

No hi ha

## Output

S'imprimirà l'inventari ordenat segons els camps indicats.
