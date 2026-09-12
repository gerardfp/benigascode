import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;

class Equation2D {

    float a, b, c;

}

public class Main {

    public static void main(String[] args) {
        Scanner scanner = new Scanner(System.in);

        Equation2D equation2D = new Equation2D();

        equation2D.a = scanner.nextFloat();
        equation2D.b = scanner.nextFloat();
        equation2D.c = scanner.nextFloat();

        float[] x = equation2D.solve();

        System.out.format("%1$.2f * %4$.2f * %4$.2f  + %2$.2f * %4$.2f + %3$.2f = 0%n",
                equation2D.a, equation2D.b, equation2D.c, x[0]);
        System.out.format("%1$.2f * %4$.2f * %4$.2f  + %2$.2f * %4$.2f + %3$.2f = 0%n",
                equation2D.a, equation2D.b, equation2D.c, x[1]);
    }
}