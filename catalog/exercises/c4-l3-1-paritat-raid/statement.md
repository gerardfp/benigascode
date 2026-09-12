# Paritat RAID

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

## Input

La entrada constisteix primer en la configuració del RAID-4: El nombre de discs D (comptant el de paritat), i el tamany del bloc (B).
A continuació venen les dades que s'han d'escriure. Primer el nombre de bits (N) a escriure i a continuació la seqüència de N bits.

3 <= D <= 9

2 <= B <= 32

D*B <= N <= 1024

N és multiple de (D-1)*B

## Output

S'imprimiràn les dades que s'escriuran en cada disc, amb el següent format:

```text
Disk 1: 10101010
Disk 2: 11100101
Disk 3: 11111010
Parity: 10110101
```
