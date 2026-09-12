# URL parser

Una URL consisteix en 8 components:

- scheme

- user

- password

- host

- port

- path

- query

- fragment

Excepte scheme i path, la resta són opcionals.

Un exemple d'una URL completa amb els 8 components, podria ser aquest:

![image](1556921749-f057ec7687-url1.png)

Es desitja crear una macro que prengui una URL i la descomposi en els seus components, generant codi Java amb les variables i els seus valors corresponents.

## Input

La entrada consta d'una URL amb els 8 components.

El format de la URL és vàlid.

## Output

S'imprimirà el codi Java generat, que contingui una variable per a cada component de la URL, amb el seu valor assignat.

Les variables , , ,  i  són de tipus String.

La variable  es de tipus int.

Les variables  i  són de tipus String[], inicialitzats amb els seus segments.
