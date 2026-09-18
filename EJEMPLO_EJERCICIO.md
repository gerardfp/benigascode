---
slug: suma-dos-numeros
tags: [basico, matematicas, i/o]
---
# Suma de dos números

Escribe un programa que lea dos números enteros de la entrada estándar y muestre su suma por pantalla.

## Entrada
La entrada contiene dos números enteros $A$ y $B$ (donde $-10^6 \le A, B \le 10^6$) separados por un espacio o por un salto de línea.

## Salida
Imprime un único número entero que sea el resultado de $A + B$, seguido de un salto de línea.

## Plantillas

```java
import java.util.Scanner;

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        // Escribe aquí tu solución
    }
}
```

```python
import sys

def main():
    # Escribe aquí tu solución
    pass

if __name__ == '__main__':
    main()
```

## Tests

### Test
```input
3 5
```
```output
8
```
```explanation
La suma de 3 y 5 es 8.
```

### Test
```input
0 0
```
```output
0
```

### Test private 2
```input
-15 4
```
```output
-11
```
```explanation
Prueba con un número negativo y otro positivo.
```

### Test private  2
```input
-20 -30
```
```output
-50
```

### Test private 3
```input
1000000 2000000
```
```output
3000000
```

