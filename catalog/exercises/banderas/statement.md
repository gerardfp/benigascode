# Banderes

Donat un tipus de bandera i un tamany, dibuixar una bandera d'aquest tamany.

Tipus de banderes:

```text
Bandera 1
Per sota de la diagonal ~, la resta *

******
~*****
~~****
~~~***
~~~~**
~~~~~*

Bandera 2
La meitat superior *, la meitat inferior -

******
******
******
~~~~~~
~~~~~~
~~~~~~

Bandera 3
La meitat dreta *, la meitat esquerra -

***~~~
***~~~
***~~~
***~~~
***~~~
***~~~

Bandera 4
La diagonal *, la resta ~

*~~~~~
~*~~~~
~~*~~~
~~~*~~
~~~~*~
~~~~~*

Bandera 5
Primera línia *, la següent ~, successivament

******
~~~~~~
******
~~~~~~
******
~~~~~~

Bandera 6
Primer terç horitzontal *, segon terç ~, tercer *

******
******
~~~~~~
~~~~~~
******
******

Bandera 7
Primer terç vertical ~, segon terç *, tercer ~

~~**~~
~~**~~
~~**~~
~~**~~
~~**~~
~~**~~

Bandera 8
Primera columna *, la següent ~, successivament

*~*~*~
*~*~*~
*~*~*~
*~*~*~
*~*~*~
*~*~*~
```

## Input

Un enter  indicant el tipus de bandera, i un enter  indicant el tamany.

1 <= N <= 100

N%2 == 0

N%3 == 0

1<= T <= 8

## Output

La bandera corresponent, del tamany indicat.
