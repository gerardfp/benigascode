# [cfc78] Show line numbers #for

![image](1571930659-32b28bd209-Espaidetreball1_002.png)

Necessitem incorporar la funció "Show line numbers" al nostre editor de codi...

## Input Format

L'entrada és un codi font en vàries línies.

El codi font acaba amb la paraula

## Constraints

-

## Output Format

S'imprimirà el mateix codi font, però amb el número de línia a l'inici de cada línia; amb aquest format:

El número de línia ocuparà dos caràcters, després hi haurà un espai en blanc, després una barra vertical i després un altre espai.

## Sample Input 0

```text
if(b[0] >= a[1] || b[1]

## Sample Output 0

```text
1 | if(b[0] >= a[1] || b[1]

## Sample Input 1

```text
private static int recursiu(int fi, int[][] jobs) {
    int max = 0;
    for (int i = 0; i = fi)
            max = Math.max(max, recursiu(jobs[i][1], jobs) + jobs[i][2]);
    return max;
}
END
```

## Sample Output 1

```text
1 | private static int recursiu(int fi, int[][] jobs) {
 2 |     int max = 0;
 3 |     for (int i = 0; i = fi)
 5 |             max = Math.max(max, recursiu(jobs[i][1], jobs) + jobs[i][2]);
 6 |     return max;
 7 | }
```

## Sample Input 2

```text
static double floydWarshall(double graph[][]) {
    double dist[][] = new double[graph.length][graph.length];
    int i, j, k;

    for (i = 0; i  dist[i][j])
                        dist[i][j] = dist[i][k] * dist[k][j];

    return dist[0][graph.length-1];
}
END
```

## Sample Output 2

```text
1 | static double floydWarshall(double graph[][]) {
 2 |     double dist[][] = new double[graph.length][graph.length];
 3 |     int i, j, k;
 4 |
 5 |     for (i = 0; i  dist[i][j])
14 |                         dist[i][j] = dist[i][k] * dist[k][j];
15 |
16 |     return dist[0][graph.length-1];
17 | }
```

## Sample Input 3

```text
public class CakeCutting {

    static char[][] tarta;

    public static void main(String[] args) throws FileNotFoundException {
        Scanner sc = new Scanner(System.in);

        while (sc.hasNextInt()) {
            int rows = sc.nextInt();
            int cols = sc.nextInt();
            sc.nextLine();

            tarta = new char[rows][cols];
            for (int i = 0; i

## Sample Output 3

```text
1 | public class CakeCutting {
 2 |
 3 |     static char[][] tarta;
 4 |
 5 |     public static void main(String[] args) throws FileNotFoundException {
 6 |         Scanner sc = new Scanner(System.in);
 7 |
 8 |         while (sc.hasNextInt()) {
 9 |             int rows = sc.nextInt();
10 |             int cols = sc.nextInt();
11 |             sc.nextLine();
12 |
13 |             tarta = new char[rows][cols];
14 |             for (int i = 0; i
