# [C2-L3-3] Triler #if

L'objectiu del joc de triler és que la víctima endevini sota quin dels 3 gobelets es troba la boleta. Els gobelets son manejats per l'estafador, canviant-los de posició i movent la boleta d'un a l'atre.

![image](1570732092-eeaae46518-path4680.png)

Els moviments del triler tracten de despistar la víctima, però al cap i a la fi cada moviment es resumeix en: "**Moure la bola a l'esquerra o a la dreta**".

Representarem l'estat del joc amb un "*" per al gobelet que té la bola, i amb "_" els gobelets que no tenen bola.

**El joc comença amb la bola al primer gobelet** (* _ _ *). Aleshores, si el triler fa dos moviments cap a la dreta, per exemple, la bola acabará en el tercer gobelet (* _ _ *).

Els moviments són "circulars", és a dir, si la bola està per exemple al primer gobelet (* _ _ *) i es fa un moviment a l'esquerra, la bola passa al tercer gobelet (* _ _ *).

## Input Format

L'entrada consta de quatre lletres "L" o "R" (separades per espais en blanc) que indiquen els moviments que fa l'estafador.

## Constraints

Sempre es realitzen 4 moviments

## Output Format

S'imprimirà l'estat final dels gobelets, amb un asterisc per al gobelet on queda la bola, i un guió baix per als gobelets que no la tenen.

## Sample Input 0

```text
L L L L
```

## Sample Output 0

```text
_ _ *
```

## Explanation 0

`
Inici: * _ _
`

`
Mov L: _ _ *
`

`
Mov L: _ * _
`

`
Mov L: * _ _
`

`
Mov L: _ _ *
`

## Sample Input 1

```text
L L L R
```

## Sample Output 1

```text
_ * _
```

## Explanation 1

`
Inici: * _ _
`

`
Mov L: _ _ *
`

`
Mov L: _ * _
`

`
Mov L: * _ _
`

`
Mov R: _ * _
`

## Sample Input 2

```text
L L R L
```

## Sample Output 2

```text
_ * _
```

## Explanation 2

`
Inici: * _ _
`

`
Mov L: _ _ *
`

`
Mov L: _ * _
`

`
Mov R: _ _ *
`

`
Mov L: _ * _
`

## Sample Input 3

```text
L L R R
```

## Sample Output 3

```text
* _ _
```

## Explanation 3

`
Inici: * _ _
`

`
Mov L: _ _ *
`

`
Mov L: _ * _
`

`
Mov R: _ _ *
`

`
Mov R: * _ _
`

## Sample Input 4

```text
L R L L
```

## Sample Output 4

```text
_ * _
```

## Explanation 4

`
Inici: * _ _
`

`
Mov L: _ _ *
`

`
Mov R: * _ _
`

`
Mov L: _ _ *
`

`
Mov L: _ * _
`

## Sample Input 5

```text
L R L R
```

## Sample Output 5

```text
* _ _
```

## Sample Input 6

```text
L R R L
```

## Sample Output 6

```text
* _ _
```

## Sample Input 7

```text
L R R R
```

## Sample Output 7

```text
_ _ *
```

## Sample Input 8

```text
R L L L
```

## Sample Output 8

```text
_ * _
```

## Sample Input 9

```text
R L L R
```

## Sample Output 9

```text
* _ _
```

## Sample Input 10

```text
R L R L
```

## Sample Output 10

```text
* _ _
```

## Sample Input 11

```text
R L R R
```

## Sample Output 11

```text
_ _ *
```

## Sample Input 12

```text
R R L L
```

## Sample Output 12

```text
* _ _
```

## Sample Input 13

```text
R R L R
```

## Sample Output 13

```text
_ _ *
```

## Sample Input 14

```text
R R R L
```

## Sample Output 14

```text
_ _ *
```

## Sample Input 15

```text
R R R R
```

## Sample Output 15

```text
_ * _
```
