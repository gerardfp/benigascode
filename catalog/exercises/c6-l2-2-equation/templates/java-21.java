import java.io.*;
import java.util.*;
import java.text.*;
import java.math.*;
import java.util.regex.*;

class Equation {
    float a, b;
    float x;

}

public class Main {

    public static void main(String[] args) {
	    Scanner scanner = new Scanner(System.in);

        Equation equation = new Equation();

        while((equation.a = scanner.nextFloat()) != 0) {
            equation.b = scanner.nextFloat();

            equation.calculateSolution();
            System.out.format("%.2f * %.2f + %.2f = 0%n", equation.a, equation.x, equation.b);
        }
    }
}