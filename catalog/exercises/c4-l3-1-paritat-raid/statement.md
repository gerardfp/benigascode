# [C4-L4-1] Paritat RAID

RAID és un sistema d'emmagatzemament de dades, que utilitza múltiples unitats físiques (discs durs o SSD) que pel sistema operatiu actuen com una sola unitat lògica. S’utilitza per emmagatzemar una gran quantitat de dades, tenir tolerància a fallides i millorar el rendiment.

Una configuració RAID-4 és capaç de recuperar les dades en cas de falla d'una unitat física. La manera en que ho fa és distribuïnt blocs de dades entre els discs i utilitzant un disc per a la paritat.

Anem a veure un exemple:
Tenim un RAID-4 amb 4 discs. En els 3 primers discs s'emmagatzemen els blocs de dades i en el quart la paritat. El tamany del bloc de dades suposem que és 4 bits.

Aleshores, quan s'escriuen per exemple les següents dades:

```text
1 0 1 1 0 1 0 0 1 0 0 1
```

El primer bloc de 4 bits s'escriu al primer disc, el segon bloc al segon disc, i el tercer al tercer. En el quart disc, s'escriu la paritat.

```text
101101001001
             +
             |
   +------+--+---+--------+
   |      |      |        |
   |      |      |        |
+--+-+ +--+-+ +--+-+   +--+-+
|1011| |0100| |1001|   |1110|
|    | |    | |    |   |    |
|    | |    | |    |   |    |
|    | |    | |    |   |    |
+----+ +----+ +----+   +----+
DISC1  DISC2  DISC3    PARITAT
```

Cada bit de paritat es calcula fent una operació XOR entre els bits dels discs que estan en aquella posició.

```text
DISC1        1011
DISC2        0100
DISC3        1001
         XOR
         --------
PARITAT      0110
```

Aquesta configuració permet que en cas de fallida d'un disc es puguin recuperar les seves dades a partir dels altres discs, usant el disc de paritat en lloc del disc que ha fallat.

```text
FALLIDA DISC1:            FALLIDA DISC2:            FALLIDA DISC3:

PARITAT      0110         DISC1        1011         DISC1        1011
DISC2        0100         PARITAT      0110         DISC2        0100
DISC3        1001         DISC3        1001         PARITAT      0110
         XOR                       XOR                       XOR
         --------                  --------                  --------
DISC1        1011         DISC2        0100         DISC3        1001
```

Es demana implementar un programa per a determinar com s'han de distribuir les dades entre els discs en un sistema RAID-4.

## Input Format

La entrada constisteix primer en la configuració del RAID-4: El nombre de discs D (comptant el de paritat), i el tamany del bloc (B).
A continuació venen les dades que s'han d'escriure. Primer el nombre de bits (N) a escriure i a continuació la seqüència de N bits.

## Constraints

3 <= D <= 9

2 <= B <= 32

D*B <= N <= 1024

N és multiple de (D-1)*B

## Output Format

S'imprimiràn les dades que s'escriuran en cada disc, amb el següent format:

```text
Disk 1: 10101010
Disk 2: 11100101
Disk 3: 11111010
Parity: 10110101
```

## Sample Input 0

```text
3 4
8
1 1 1 1     1 0 1 0
```

## Sample Output 0

```text
Disk 1: 1111
Disk 2: 1010
Parity: 0101
```

## Explanation 0

Hi ha 3 discs: 2 de dades i un de paritat
El tamany de bloc es de 4 bits, per tant es van escrivint 4 bits en cada disc

## Sample Input 1

```text
3 4
16
1 1 1 1    0 0 0 0    1 0 1 0     1 1 0 0
```

## Sample Output 1

```text
Disk 1: 11111010
Disk 2: 00001100
Parity: 11110110
```

## Explanation 1

```text
1 1 1 1    0 0 0 0    1 0 1 0     1 1 0 0

Disk 1: 1111 1010
Disk 2: 0000 1100
```

## Sample Input 2

```text
3 2
8
1 1    0 0    1 0    0 1
```

## Sample Output 2

```text
Disk 1: 1110
Disk 2: 0001
Parity: 1111
```

## Explanation 2

```text
1 1    00    1 0    0 1

Disk 1: 11 10
Disk 2: 00 01
```

## Sample Input 3

```text
3 8
16
1 1 1 1 1 1 1 1   0 0 0 0 0 0 0 0
```

## Sample Output 3

```text
Disk 1: 11111111
Disk 2: 00000000
Parity: 11111111
```

## Sample Input 4

```text
4 4
12
1 1 1 1   0 0 0 0  1 0 1 0
```

## Sample Output 4

```text
Disk 1: 1111
Disk 2: 0000
Disk 3: 1010
Parity: 0101
```

## Sample Input 5

```text
4 4 24
1 0 1 0   1 1 1 1   0 0 0 0   1 1 0 0   0 0 1 1   1 0 0 1
```

## Sample Output 5

```text
Disk 1: 10101100
Disk 2: 11110011
Disk 3: 00001001
Parity: 01010110
```

## Explanation 5

```text
1 0 1 0   1 1 1 1   0 0 0 0   1 1 0 0   0 0 1 1   1 0 0 1
Disk 1: 1010  1100
Disk 2: 1111  0011
Disk 3: 0000  1001
```

## Sample Input 6

```text
4 4
36
0 0 0 0  0 0 0 1  0 0 1 0  0 0 1 1  0 1 0 0  0 1 0 1  0 1 1 0  0 1 1 1  1 0 0 0
```

## Sample Output 6

```text
Disk 1: 000000110110
Disk 2: 000101000111
Disk 3: 001001011000
Parity: 001100101001
```

## Explanation 6

```text
0 0 0 0  0 0 0 1  0 0 1 0  0 0 1 1  0 1 0 0  0 1 0 1  0 1 1 0  0 1 1 1  1 0 0 0
Disk 1: 0000 0011 0110
Disk 2: 0001 0100 0111
Disk 3: 0010 0101 1000
```

## Sample Input 7

```text
5 8
64
0 0 0 0  0 0 0 1  0 0 1 0  0 0 1 1  0 1 0 0  0 1 0 1  0 1 1 0  0 1 1 1
1 0 0 0  1 0 0 1  1 0 1 0  1 0 1 1  1 1 0 0  1 1 0 1  1 1 1 0  1 1 1 1
```

## Sample Output 7

```text
Disk 1: 0000000110001001
Disk 2: 0010001110101011
Disk 3: 0100010111001101
Disk 4: 0110011111101111
Parity: 0000000000000000
```

## Sample Input 8

```text
5 8
128
0 1 0 1 1 0 0 1 0 0 1 0 0 1 1 1 0 1 1 0 1 1 0 1 0 1 1 0 0 1 0 1
1 1 0 1 1 1 0 0 0 1 1 0 1 1 0 0 1 0 0 0 1 0 0 1 1 0 1 0 1 0 1 1
1 1 0 0 1 1 0 1 1 1 1 0 1 1 1 1 1 0 0 1 1 0 0 0 1 1 1 1 0 1 0 1
1 1 1 0 0 0 0 0 1 1 0 1 0 1 1 0 0 0 1 1 0 1 1 0 1 1 0 1 1 0 1 0
```

## Sample Output 8

```text
Disk 1: 01011001110111001100110111100000
Disk 2: 00100111011011001110111111010110
Disk 3: 01101101100010011001100000110110
Disk 4: 01100101101010111111010111011010
Parity: 01110110100100100100111111011010
```
